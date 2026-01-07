-- Script para corrigir CHECK constraint da tabela despesas - Versão 2
-- Encontra e remove o constraint automaticamente pelo nome

USE DESPESAS;
GO

-- 1. Encontrar o nome do CHECK constraint para a coluna status
DECLARE @constraint_name NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);

SELECT @constraint_name = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('despesas') 
AND definition LIKE '%status%';

-- 2. Se encontrou um constraint, removê-lo
IF @constraint_name IS NOT NULL
BEGIN
    SET @sql = 'ALTER TABLE despesas DROP CONSTRAINT ' + QUOTENAME(@constraint_name);
    PRINT 'Removendo constraint: ' + @constraint_name;
    EXEC sp_executesql @sql;
END
ELSE
BEGIN
    PRINT 'Nenhum CHECK constraint encontrado para a coluna status em despesas.';
    PRINT 'Verificando todos os constraints da tabela despesas:';
    
    -- Mostrar todos os constraints para debug
    SELECT 
        name,
        type_desc,
        definition
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('despesas');
END
GO

-- 3. Adicionar o novo CHECK constraint com todos os status
ALTER TABLE despesas 
ADD CONSTRAINT CK_despesas_status 
CHECK (status IN ('pendente_gestor', 'pendente_admin', 'pendente_adm_area', 'aprovada', 'rejeitada', 'paga', 'negada'));
GO

PRINT '✅ CHECK constraint da tabela despesas atualizado com sucesso!';
GO

-- 4. Verificar se foi adicionado corretamente
SELECT 
    name,
    definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('despesas')
AND name = 'CK_despesas_status';
GO
