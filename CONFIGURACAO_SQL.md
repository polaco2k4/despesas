# Configuração do SQL Server - Instruções

## Problema Detectado
O arquivo `.env` está configurado com o usuário 'despesas' mas o código espera 'despesas_user'.

## Solução

### Passo 1: Executar o Script SQL
Abra o SQL Server Management Studio (SSMS) e execute o arquivo:
`server/database/create_sql_user.sql`

Isso criará:
- Login: `despesas_user`
- Senha: `Despesas@2024`

### Passo 2: Atualizar o arquivo .env
Edite o arquivo `server/.env` e configure:

```env
# SQL Server Configuration
SQL_SERVER=localhost
SQL_DATABASE=DESPESAS
SQL_INSTANCE=SQLEXPRESS
SQL_USER=despesas_user
SQL_PASSWORD=Despesas@2024
SQL_TRUSTED_CONNECTION=false
SQL_ENCRYPT=true
SQL_TRUST_SERVER_CERTIFICATE=true

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration (frontend URL)
FRONTEND_URL=http://localhost:5173
```

### Passo 3: Reiniciar o servidor backend
Após atualizar o `.env`, o servidor será reiniciado automaticamente.

## Verificação
Se o SQL Server Express não aceitar autenticação SQL, você precisa:
1. Abrir SQL Server Configuration Manager
2. Habilitar "SQL Server and Windows Authentication mode"
3. Reiniciar o serviço MSSQL$SQLEXPRESS
