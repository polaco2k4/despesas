# Configuração de Autenticação Active Directory

## Problema Resolvido

O sistema agora suporta autenticação Active Directory (AD) com fallback para autenticação local.

## Implementação

### 1. Serviço de Autenticação AD
- **Arquivo**: `src/services/adAuthService.ts`
- **Funcionalidade**: Conecta ao servidor AD e autentica usuários
- **Fallback**: Se AD falhar, usa autenticação local

### 2. Controller Atualizado
- **Arquivo**: `src/controllers/authController.ts`
- **Fluxo**: AD primeiro → Local como fallback
- **Auto-criação**: Usuários AD são criados automaticamente no banco local

## Configuração

### 1. Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
# Active Directory Configuration
AD_SERVER=seu-domain-controller.empresa.com
AD_PORT=389
AD_DOMAIN=empresa.com
AD_BASE_DN=CN=Users,DC=empresa,DC=com
AD_ADMIN_USER=admin@empresa.com
AD_ADMIN_PASSWORD=senha_admin
```

### 2. Configuração do Domain Controller

**Informações necessárias:**
- **AD_SERVER**: IP ou hostname do Domain Controller
- **AD_PORT**: Porta LDAP (389 padrão, 636 para LDAPS)
- **AD_DOMAIN**: Domínio da empresa (ex: empresa.com)
- **AD_BASE_DN**: Base DN onde estão os usuários

**Exemplo de configuração:**
```env
AD_SERVER=192.168.1.10
AD_PORT=389
AD_DOMAIN=minhaempresa.local
AD_BASE_DN=CN=Users,DC=minhaempresa,DC=local
```

## Como Funciona

### 1. Processo de Login
1. **Tentativa AD**: Sistema tenta autenticar no Active Directory
2. **Sucesso AD**: Usuário é criado/atualizado no banco local
3. **Falha AD**: Sistema usa autenticação local como fallback

### 2. Criação Automática de Usuários
- Usuários AD são automaticamente criados no banco local
- Role padrão: `colaborador`
- Departamento padrão: primeiro departamento disponível
- Nome atualizado automaticamente do AD

### 3. Sincronização
- Nome do usuário é sincronizado a cada login
- Email permanece como identificador único
- Roles e departamentos gerenciados localmente

## Teste da Configuração

### 1. Verificar Conectividade
```bash
# Teste de conectividade com o Domain Controller
telnet seu-domain-controller.empresa.com 389
```

### 2. Logs do Sistema
O sistema registra logs detalhados:
- `🔐 AD Authentication successful` - Autenticação AD bem-sucedida
- `🔄 Falling back to local authentication` - Usando fallback local
- `🆕 Creating new user from AD` - Criando usuário do AD

### 3. Teste de Login
1. Use credenciais do Active Directory
2. Verifique logs do servidor
3. Confirme criação do usuário no banco

## Solução de Problemas

### Erro: "Cannot connect to AD server"
- Verificar conectividade de rede
- Confirmar IP/hostname do Domain Controller
- Verificar porta (389 ou 636)

### Erro: "Authentication failed"
- Verificar credenciais do usuário
- Confirmar Base DN correto
- Verificar se usuário existe no AD

### Fallback Local Funcionando
- Normal quando AD não está disponível
- Usuários locais continuam funcionando
- Verificar configuração AD se necessário

## Segurança

### 1. Credenciais Administrativas
- Use conta de serviço dedicada
- Permissões mínimas necessárias
- Rotacione senhas regularmente

### 2. Conexão Segura
- Use LDAPS (porta 636) em produção
- Configure certificados SSL
- Considere VPN para conexões externas

### 3. Logs e Auditoria
- Monitore tentativas de login
- Registre criações de usuários
- Alerte sobre falhas de conectividade

## Próximos Passos

1. **Configurar LDAPS**: Para conexões seguras
2. **Grupos AD**: Mapear grupos AD para roles locais
3. **Sincronização**: Processo automático de sincronização
4. **SSO**: Implementar Single Sign-On completo

## Suporte

Para problemas de configuração:
1. Verifique logs do servidor
2. Teste conectividade de rede
3. Confirme configurações do AD
4. Consulte administrador do domínio
