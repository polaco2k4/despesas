-- Script para corrigir CHECK constraint da tabela despesas
-- Adicionar os novos status de aprovação sequencial

USE DESPESAS;
GO

-- 1. Remover CHECK constraint antigo da tabela despesas
DECLARE @constraint_name NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);

-- Encontrar o nome do CHECK constraint para a coluna status
SELECT @constraint_name = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('despesas') 
AND definition LIKE '%status%';

-- Se encontrou um constraint, removê-lo
IF @constraint_name IS NOT NULL
BEGIN
    SET @sql = 'ALTER TABLE despesas DROP CONSTRAINT ' + QUOTENAME(@constraint_name);
    PRINT 'Removendo constraint da tabela despesas: ' + @constraint_name;
    EXEC sp_executesql @sql;
END
ELSE
BEGIN
    PRINT 'Nenhum CHECK constraint encontrado para a coluna status em despesas.';
END
GO

-- 2. Adicionar o novo CHECK constraint com todos os status sequenciais
ALTER TABLE despesas 
ADD CONSTRAINT CK_despesas_status 
CHECK (status IN ('pendente_gestor', 'pendente_admin', 'pendente_adm_area', 'aprovada', 'rejeitada', 'paga', 'negada'));
GO

PRINT 'CHECK constraint da tabela despesas atualizado com sucesso!';
GO

-- 3. Verificar se o constraint foi adicionado corretamente
SELECT 
    name,
    definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('despesas')
AND name = 'CK_despesas_status';
GO
