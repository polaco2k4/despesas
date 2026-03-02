# Resumo da Autenticação do Sistema

## Comportamento Atual (Atualizado)

### ✅ Usuários do Active Directory (AD)

**Autenticação**: Credenciais validadas pelo Active Directory
**Criação**: **MANUAL** - devem ser pré-cadastrados na tabela `usuarios`
**Senha no banco**: Não necessária (campo `password_hash` vazio)
**Role**: Definida manualmente no cadastro
**Departamento**: Definido manualmente no cadastro

**Fluxo:**
1. Usuário faz login com credenciais do AD
2. Sistema valida no Active Directory
3. Se autenticação AD bem-sucedida:
   - Busca usuário na tabela `usuarios` por email
   - Se **não existir**: Login negado - "Usuário não autorizado no sistema"
   - Se **existir**: Login concedido
4. **Importante**: Usuários do AD só podem fazer login se já estiverem cadastrados

### ✅ Usuários Locais (SQL Server)

**Autenticação**: Email e senha validados no banco de dados
**Criação**: **MANUAL** - devem ser criados via SQL
**Senha no banco**: **Obrigatória** (campo `password_hash`)
**Role**: Definida manualmente
**Departamento**: Definido manualmente

**Fluxo:**
1. Se autenticação AD falhar, tenta autenticação local
2. Busca usuário na tabela `usuarios` por email
3. Se **não existir**: Login negado
4. Se **existir**: Valida senha
   - Senha correta → Login concedido
   - Senha incorreta → Login negado

## Ordem de Autenticação

```
Login Request
    ↓
1. Tenta AD primeiro
    ├─ ✅ Sucesso no AD → Verifica se existe no banco
    │   ├─ ✅ Existe → Login OK
    │   └─ ❌ Não existe → Login NEGADO (não autorizado)
    └─ ❌ Falha no AD → Continua
         ↓
2. Tenta Local
    ├─ ✅ Existe + Tem senha + Senha OK → Login OK
    └─ ❌ Não existe OU sem senha OU senha errada → Login NEGADO
```

## Exemplos de Uso

### Criar Usuário Local (Admin)

```sql
INSERT INTO usuarios (nome, email, role, password_hash, created_at, updated_at)
VALUES ('Admin Sistema', 'admin@local', 'admin', 'Admin@2024', GETDATE(), GETDATE());
```

### Usuário AD (Criado Automaticamente)

Não precisa criar manualmente. Ao fazer login com credenciais do AD:
- Email: `joao.silva@empresa.com`
- Senha: (senha do Active Directory)

O sistema cria automaticamente:
- Nome: Extraído do AD
- Email: `joao.silva@empresa.com`
- Role: `colaborador`
- Password_hash: `` (vazio)

### Promover Usuário AD para Gestor

```sql
-- Após o usuário fazer login pela primeira vez (criação automática)
UPDATE usuarios 
SET role = 'gestor' 
WHERE email = 'joao.silva@empresa.com';
```

## Segurança

- **AD Users**: Senha gerenciada pelo Active Directory (mais seguro)
- **Local Users**: Senha em texto claro no banco (⚠️ usar hash bcrypt em produção)
- **Fallback**: Se AD não estiver disponível, usuários locais ainda podem fazer login

## Arquivos Relacionados

- `server/src/controllers/authController.ts` - Lógica de autenticação
- `server/src/services/adAuthService.ts` - Serviço de autenticação AD
- `server/database/registrar_usuarios_ad.sql` - Script para criar usuários locais
