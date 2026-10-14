import ldap from 'ldapjs';

interface ADConfig {
  url: string;
  domain: string;
  baseDN: string;
  adminUser?: string;
  adminPassword?: string;
  timeoutMs: number;
}

export interface ADUser {
  username: string;
  displayName: string;
  email: string;
  dn?: string;
  department?: string;
  groups: string[];
}

export type ADAuthResult =
  | { status: 'ok'; user: ADUser }
  | { status: 'invalid_credentials' }
  | { status: 'unavailable'; error?: string };

/** Erro de ligação ao servidor (AD inacessível) */
class ADUnavailableError extends Error {}

export class ADAuthService {
  private config: ADConfig;

  constructor(config: ADConfig) {
    this.config = config;
  }

  /**
   * Autentica usuário no Active Directory (bind real com as credenciais do usuário)
   */
  async authenticateUser(username: string, password: string): Promise<ADAuthResult> {
    // Bind com senha vazia é um bind anónimo no AD e "passaria" - rejeitar sempre
    if (!username || !password) {
      return { status: 'invalid_credentials' };
    }

    const { sam, upn } = this.normalizeUsername(username);
    console.log(`🔐 Attempting AD authentication for user: ${upn}`);

    let client: ldap.Client | null = null;
    try {
      client = await this.connect();
      await this.bind(client, upn, password);

      // Credenciais já validadas pelo bind; falha na pesquisa (ex.: AD_BASE_DN errado) não bloqueia o login
      let entries: ADUser[] = [];
      try {
        entries = await this.search(client, this.userFilter(sam, upn, username));
      } catch (searchError: any) {
        console.warn(`⚠️ AD search failed (check AD_BASE_DN): ${searchError?.message || searchError}`);
      }
      const user = entries[0] ?? {
        username: sam,
        displayName: sam,
        email: upn,
        groups: []
      };

      console.log(`✅ AD authentication successful for user: ${upn}`);
      return { status: 'ok', user };
    } catch (error: any) {
      if (error instanceof ldap.InvalidCredentialsError || error?.code === 49) {
        console.log(`❌ AD invalid credentials for user: ${upn}`);
        return { status: 'invalid_credentials' };
      }
      console.error('❌ AD unavailable:', error?.message || error);
      return { status: 'unavailable', error: error?.message || String(error) };
    } finally {
      this.close(client);
    }
  }

  /**
   * Busca usuários por filtro LDAP (para sincronização) - usa a conta de serviço
   */
  async searchUsers(filter?: string): Promise<ADUser[]> {
    let client: ldap.Client | null = null;
    try {
      if (!this.config.adminUser || !this.config.adminPassword) {
        console.error('AD search requires AD_ADMIN_USER and AD_ADMIN_PASSWORD');
        return [];
      }
      client = await this.connect();
      await this.bind(client, this.config.adminUser, this.config.adminPassword);
      return await this.search(
        client,
        filter || '(&(objectCategory=person)(objectClass=user))'
      );
    } catch (error) {
      console.error('AD search error:', error);
      return [];
    } finally {
      this.close(client);
    }
  }

  /**
   * Verifica se usuário pertence a um grupo específico (por CN ou DN do grupo)
   */
  async isUserInGroup(username: string, groupName: string): Promise<boolean> {
    const { sam, upn } = this.normalizeUsername(username);
    const users = await this.searchUsers(this.userFilter(sam, upn, username).toString());
    const groups = users[0]?.groups ?? [];
    const target = groupName.toLowerCase();
    return groups.some(dn =>
      dn.toLowerCase() === target || dn.toLowerCase().startsWith(`cn=${target},`)
    );
  }

  /** usuario@dominio / DOMINIO\usuario / usuario -> sAMAccountName + UPN */
  private normalizeUsername(username: string): { sam: string; upn: string } {
    let sam = username.trim();
    if (sam.includes('\\')) sam = sam.split('\\').pop()!;
    if (sam.includes('@')) sam = sam.split('@')[0];
    return { sam, upn: `${sam}@${this.config.domain}` };
  }

  /** Filtro com valores escapados automaticamente pelo ldapjs */
  private userFilter(sam: string, upn: string, original: string): ldap.Filter {
    const filters: ldap.Filter[] = [
      new ldap.EqualityFilter({ attribute: 'sAMAccountName', value: sam }),
      new ldap.EqualityFilter({ attribute: 'userPrincipalName', value: upn })
    ];
    if (original.includes('@')) {
      filters.push(new ldap.EqualityFilter({ attribute: 'mail', value: original.trim() }));
    }
    return new ldap.AndFilter({
      filters: [
        new ldap.EqualityFilter({ attribute: 'objectClass', value: 'user' }),
        new ldap.OrFilter({ filters })
      ]
    });
  }

  private connect(): Promise<ldap.Client> {
    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: this.config.url,
        connectTimeout: this.config.timeoutMs,
        timeout: this.config.timeoutMs,
        reconnect: false,
        tlsOptions: { rejectUnauthorized: process.env.AD_TLS_REJECT_UNAUTHORIZED !== 'false' }
      });
      // Sem este handler um erro de rede derrubaria o processo
      client.on('error', (err) => reject(new ADUnavailableError(err.message)));
      client.on('connectError', (err) => reject(new ADUnavailableError(err.message)));
      client.on('connectTimeout', () => reject(new ADUnavailableError('Connection timeout')));
      client.on('connect', () => resolve(client));
    });
  }

  private bind(client: ldap.Client, user: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      client.bind(user, password, (err) => (err ? reject(err) : resolve()));
    });
  }

  private search(client: ldap.Client, filter: string | ldap.Filter): Promise<ADUser[]> {
    return new Promise((resolve, reject) => {
      const opts: ldap.SearchOptions = {
        scope: 'sub',
        filter,
        attributes: ['sAMAccountName', 'userPrincipalName', 'displayName', 'mail', 'department', 'memberOf'],
        sizeLimit: 1000,
        paged: true
      };
      client.search(this.config.baseDN, opts, (err, res) => {
        if (err) return reject(err);
        const users: ADUser[] = [];
        res.on('searchEntry', (entry) => users.push(this.toADUser(entry)));
        res.on('error', reject);
        res.on('end', () => resolve(users));
      });
    });
  }

  private toADUser(entry: ldap.SearchEntry): ADUser {
    const attrs = new Map<string, string[]>();
    for (const attr of entry.pojo.attributes) {
      attrs.set(attr.type.toLowerCase(), attr.values);
    }
    const first = (name: string) => attrs.get(name.toLowerCase())?.[0];
    const sam = first('sAMAccountName') || '';
    return {
      username: sam,
      displayName: first('displayName') || sam,
      email: first('mail') || first('userPrincipalName') || `${sam}@${this.config.domain}`,
      dn: entry.pojo.objectName ?? undefined,
      department: first('department'),
      groups: attrs.get('memberof') ?? []
    };
  }

  private close(client: ldap.Client | null) {
    if (!client) return;
    try {
      client.unbind(() => client.destroy());
    } catch {
      client.destroy();
    }
  }
}

// Factory function para criar instância do serviço
export function createADAuthService(): ADAuthService {
  const server = process.env.AD_SERVER || 'localhost';
  const port = process.env.AD_PORT || '389';
  const domain = process.env.AD_DOMAIN || 'example.com';

  const config: ADConfig = {
    url: process.env.AD_URL || `${port === '636' ? 'ldaps' : 'ldap'}://${server}:${port}`,
    domain,
    baseDN: process.env.AD_BASE_DN || domain.split('.').map(p => `DC=${p}`).join(','),
    adminUser: process.env.AD_ADMIN_USER,
    adminPassword: process.env.AD_ADMIN_PASSWORD,
    timeoutMs: parseInt(process.env.AD_TIMEOUT_MS || '5000')
  };

  return new ADAuthService(config);
}
