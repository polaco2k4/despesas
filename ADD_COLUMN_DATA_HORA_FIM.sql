-- Execute este script no SQL Server Management Studio ou Azure Data Studio
-- para adicionar a coluna data_hora_fim à tabela reunioes

USE DESPESAS_DB;
GO

-- Adicionar coluna data_hora_fim se não existir
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[reunioes]') 
    AND name = 'data_hora_fim'
)
BEGIN
    ALTER TABLE [dbo].[reunioes]
    ADD data_hora_fim DATETIME2;
    
    PRINT 'Coluna data_hora_fim adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna data_hora_fim já existe.';
END
GO
