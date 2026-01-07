-- Script de migração para adicionar o role 'adm_area' - Versão 2
-- Executar este script para atualizar bancos de dados existentes

USE DESPESAS;
GO

-- 1. Verificar e remover qualquer CHECK constraint existente na coluna role
DECLARE @constraint_name NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);

-- Encontrar o nome do CHECK constraint para a coluna role
SELECT @constraint_name = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('usuarios') 
AND definition LIKE '%role%';

-- Se encontrou um constraint, removê-lo
IF @constraint_name IS NOT NULL
BEGIN
    SET @sql = 'ALTER TABLE usuarios DROP CONSTRAINT ' + QUOTENAME(@constraint_name);
    PRINT 'Removendo constraint: ' + @constraint_name;
    EXEC sp_executesql @sql;
END
ELSE
BEGIN
    PRINT 'Nenhum CHECK constraint encontrado para a coluna role.';
END
GO

-- 2. Adicionar o novo CHECK constraint com 'adm_area'
ALTER TABLE usuarios 
ADD CONSTRAINT CK_usuarios_role 
CHECK (role IN ('admin', 'gestor', 'colaborador', 'adm_area'));
GO

PRINT 'Migração concluída: Role adm_area adicionado com sucesso!';
GO

-- 3. Verificar se o constraint foi adicionado corretamente
SELECT 
    name,
    definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('usuarios')
AND name = 'CK_usuarios_role';
GO
