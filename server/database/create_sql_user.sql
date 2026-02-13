-- Criar login SQL Server
USE master;
GO

-- Verificar se o login já existe e removê-lo se necessário
IF EXISTS (SELECT * FROM sys.server_principals WHERE name = 'despesas_user')
BEGIN
    DROP LOGIN despesas_user;
END
GO

-- Criar novo login
CREATE LOGIN despesas_user WITH PASSWORD = 'Despesas@2024';
GO

-- Usar a base de dados DESPESAS
USE DESPESAS;
GO

-- Criar usuário na base de dados
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'despesas_user')
BEGIN
    DROP USER despesas_user;
END
GO

CREATE USER despesas_user FOR LOGIN despesas_user;
GO

-- Conceder permissões completas ao usuário
ALTER ROLE db_owner ADD MEMBER despesas_user;
GO

PRINT 'Usuário despesas_user criado com sucesso!';
GO
