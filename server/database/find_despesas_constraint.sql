-- Encontrar o nome real do CHECK constraint na tabela despesas
USE DESPESAS;
GO

-- Verificar todos os constraints da tabela despesas
SELECT 
    name,
    type_desc,
    definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('despesas');
GO

-- Também verificar via INFORMATION_SCHEMA
SELECT 
    CONSTRAINT_NAME,
    CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'dbo'
AND CONSTRAINT_NAME LIKE '%despesa%';
GO
