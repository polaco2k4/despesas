# Configuração SQL Server Express - Autenticação SQL

## Problema Identificado

O Windows Authentication não funciona porque o usuário não está em um domínio confiável.

## Solução: Usar SQL Server Authentication

### 1. Habilitar Autenticação Mista no SQL Server

1. Abrir **SQL Server Management Studio (SSMS)** ou **SQL Server Configuration Manager**
2. Conectar em: `localhost\SQLEXPRESS` (usando Windows Authentication pela primeira vez)
3. Clicar com botão direito no servidor → **Properties**
4. Ir em **Security**
5. Selecionar **"SQL Server and Windows Authentication mode"**
6. Clicar **OK**
7. **Reiniciar o serviço SQL Server**

### 2. Criar Usuário SQL

No SSMS, executar:

```sql
-- Criar login
CREATE LOGIN despesas_user WITH PASSWORD = 'Despesas@2026!';
GO

-- Conceder permissões de sysadmin (para criar database)
ALTER SERVER ROLE sysadmin ADD MEMBER despesas_user;
GO
```

### 3. Atualizar arquivo .env

Editar `server/.env`:

```env
# SQL Server Configuration
SQL_SERVER=localhost\\SQLEXPRESS
SQL_DATABASE=DESPESAS
SQL_TRUSTED_CONNECTION=false
SQL_USER=despesas_user
SQL_PASSWORD=Despesas@2026!
SQL_ENCRYPT=true
SQL_TRUST_SERVER_CERTIFICATE=true

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### 4. Reiniciar Serviço SQL Server

```powershell
Restart-Service -Name "MSSQL`$SQLEXPRESS"
```

### 5. Testar Conexão

```powershell
sqlcmd -S localhost\SQLEXPRESS -U despesas_user -P "Despesas@2026!" -Q "SELECT @@VERSION"
```

### 6. Inicializar Banco de Dados

```powershell
cd server
npm run db:init
```

---

## Alternativa Rápida: Usar SA (Administrador)

Se você já tem a senha do usuário `sa`:

```env
SQL_TRUSTED_CONNECTION=false
SQL_USER=sa
SQL_PASSWORD=SuaSenhaSA
```

---

## Verificar Status do SQL Server

```powershell
Get-Service -Name "MSSQL`$SQLEXPRESS"
```

Se parado, iniciar:

```powershell
Start-Service -Name "MSSQL`$SQLEXPRESS"
```
