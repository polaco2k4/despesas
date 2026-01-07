-- Script para adicionar coluna nivel_aprovacao na tabela aprovacoes
USE DESPESAS;
GO

-- Verificar se a coluna já existe
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('aprovacoes') 
    AND name = 'nivel_aprovacao'
)
BEGIN
    -- Adicionar a coluna nivel_aprovacao
    ALTER TABLE aprovacoes 
    ADD nivel_aprovacao INT DEFAULT 1;
    
    PRINT '✅ Coluna nivel_aprovacao adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Coluna nivel_aprovacao já existe na tabela aprovacoes.';
END
GO

-- Verificar se foi adicionada corretamente
SELECT 
    name,
    type_name,
    is_nullable,
    default_object_id
FROM sys.columns
WHERE object_id = OBJECT_ID('aprovacoes') 
AND name = 'nivel_aprovacao';
GO
