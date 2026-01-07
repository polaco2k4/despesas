-- Script para verificar o nome exato do CHECK constraint na tabela usuarios
USE DESPESAS;
GO

-- Verificar todos os CHECK constraints na tabela usuarios
SELECT 
    name,
    definition,
    parent_object_id
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('usuarios');

-- Verificar também via INFORMATION_SCHEMA
SELECT 
    CONSTRAINT_NAME,
    CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'dbo'
AND CONSTRAINT_NAME LIKE '%usuarios%';

GO
