import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import { createADAuthService } from '../services/adAuthService.js';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Primeiro, tenta autenticação AD
    const adAuthService = createADAuthService();
    const adResult = await adAuthService.authenticateUser(email, password);

    if (adResult.status === 'ok') {
      console.log('🔐 AD Authentication successful for:', email);

      // Verifica se usuário existe no banco local (NÃO cria automaticamente)
      let localUser = await findLocalUser(email);
      if (!localUser && adResult.user.email && adResult.user.email.toLowerCase() !== String(email).toLowerCase()) {
        localUser = await findLocalUser(adResult.user.email);
      }
      // Email local pode ter outro domínio (ex.: user@sdbd.lan no AD, user@empresa.co.ao na BD)
      if (!localUser) {
        localUser = await findLocalUserByUsername(adResult.user.username || String(email).split('@')[0]);
      }

      if (localUser) {
        console.log('✅ User found in local database:', email);
        return res.json({ user: localUser });
      } else {
        console.log('❌ AD user not authorized - not found in local database:', email);
        return res.status(401).json({ error: 'Usuário não autorizado no sistema' });
      }
    }

    // Senha AD errada: só utilizadores com senha local podem continuar (validada abaixo).
    // AD inacessível: fallback para autenticação local.
    console.log(
      adResult.status === 'invalid_credentials'
        ? '🔄 AD rejected credentials, checking local account for:'
        : '🔄 AD unavailable, falling back to local authentication for:',
      email
    );
    
    const query = `
      SELECT 
        u.id, u.nome, u.email, u.role, u.departamento_id, u.password_hash,
        u.created_at, u.updated_at,
        d.id as 'departamento.id', d.nome as 'departamento.nome', 
        d.sigla as 'departamento.sigla', d.created_at as 'departamento.created_at',
        d.updated_at as 'departamento.updated_at'
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      WHERE u.email = @email
    `;
    
    const results = await executeQuery(query, { email });
    
    if (results.length === 0) {
      console.log('User not found in local database:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    
    const row = results[0];
    
    // Validação de senha local
    // Se password_hash estiver vazio, é usuário AD que não pode fazer login local
    if (!row.password_hash || row.password_hash === '') {
      console.log('User has no local password (AD user):', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    
    // Compara senha fornecida com a armazenada
    // Nota: Em produção, usar bcrypt.compare() para senhas hasheadas
    const storedPassword = typeof row.password_hash === 'string' 
      ? row.password_hash 
      : row.password_hash.toString();
    
    if (storedPassword !== password) {
      console.log('Invalid local password for:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    
    // Busca departamentos do usuário
    const userWithDepartments = await buildUserWithDepartments(row);
    
    console.log('Local authentication successful for:', email);
    return res.json({ user: userWithDepartments });
    
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

/**
 * Busca usuário local por email (sem criar automaticamente)
 */
async function findLocalUser(email: string): Promise<any> {
  try {
    const userQuery = `
      SELECT 
        u.id, u.nome, u.email, u.role, u.departamento_id,
        u.created_at, u.updated_at,
        d.id as 'departamento.id', d.nome as 'departamento.nome', 
        d.sigla as 'departamento.sigla', d.created_at as 'departamento.created_at',
        d.updated_at as 'departamento.updated_at'
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      WHERE u.email = @email
    `;
    
    const results = await executeQuery(userQuery, { email });
    
    if (results.length > 0) {
      const row = results[0];
      return await buildUserWithDepartments(row);
    }
    
    return null;
  } catch (error) {
    console.error('Error finding local user:', error);
    return null;
  }
}

/**
 * Busca usuário local pela parte antes do @ (qualquer domínio).
 * Só devolve se houver exatamente um resultado, para não confundir pessoas com o mesmo nome.
 */
async function findLocalUserByUsername(username: string): Promise<any> {
  try {
    const clean = username.split('\\').pop()!.split('@')[0].trim();
    if (!clean) return null;

    // Escapa curingas do LIKE (%, _, [) no nome de usuário
    const pattern = clean.replace(/[%_[]/g, ch => `[${ch}]`) + '@%';
    const results = await executeQuery(
      `SELECT email FROM usuarios WHERE LOWER(email) LIKE LOWER(@pattern)`,
      { pattern }
    );

    if (results.length !== 1) {
      if (results.length > 1) {
        console.log(`⚠️ Multiple local users match username "${clean}" - not resolving automatically`);
      }
      return null;
    }

    console.log(`🔗 AD user "${clean}" matched local user ${results[0].email}`);
    return await findLocalUser(results[0].email);
  } catch (error) {
    console.error('Error finding local user by username:', error);
    return null;
  }
}

/**
 * Constrói objeto do usuário com departamentos
 */
async function buildUserWithDepartments(row: any): Promise<any> {
  try {
    let departamentos: Array<{
      id: string;
      nome: string;
      sigla: string;
      created_at: Date;
      updated_at: Date;
    }> = [];
    
    if (row.role === 'adm_area') {
      const deptQuery = `
        SELECT 
          d.id, d.nome, d.sigla, d.created_at, d.updated_at
        FROM usuarios_departamentos ud
        INNER JOIN departamentos d ON ud.departamento_id = d.id
        WHERE ud.usuario_id = @usuario_id
        ORDER BY d.nome
      `;
      
      const deptResults = await executeQuery(deptQuery, { usuario_id: row.id });
      
      departamentos = deptResults.map((deptRow: any) => ({
        id: deptRow.id,
        nome: deptRow.nome,
        sigla: deptRow.sigla,
        created_at: deptRow.created_at,
        updated_at: deptRow.updated_at
      }));
    } else if (row['departamento.id']) {
      departamentos = [{
        id: row['departamento.id'],
        nome: row['departamento.nome'],
        sigla: row['departamento.sigla'],
        created_at: row['departamento.created_at'],
        updated_at: row['departamento.updated_at']
      }];
    }
    
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      role: row.role,
      departamento_id: row.departamento_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      departamentos: departamentos,
      departamento: departamentos.length > 0 ? departamentos[0] : undefined
    };
  } catch (error) {
    console.error('Error building user with departments:', error);
    return null;
  }
}

export const getCurrentUser = async (_req: Request, res: Response) => {
  try {
    // Por enquanto, retornar null - implementar sessões depois
    res.json({ user: null });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário atual' });
  }
};
