-- Add status and categoria columns to fornecedores table
USE DESPESAS;
GO

-- Add status column
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[fornecedores]') 
    AND name = 'status'
)
BEGIN
    ALTER TABLE fornecedores
    ADD status NVARCHAR(50) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo'));
    
    PRINT 'Column status added to fornecedores table successfully!';
END
ELSE
BEGIN
    PRINT 'Column status already exists in fornecedores table.';
END
GO

-- Add categoria column
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[fornecedores]') 
    AND name = 'categoria'
)
BEGIN
    ALTER TABLE fornecedores
    ADD categoria NVARCHAR(100);
    
    PRINT 'Column categoria added to fornecedores table successfully!';
END
ELSE
BEGIN
    PRINT 'Column categoria already exists in fornecedores table.';
END
GO

-- Update existing records
UPDATE fornecedores
SET status = 'ativo'
WHERE status IS NULL;

UPDATE fornecedores
SET categoria = 'Geral'
WHERE categoria IS NULL;
GO

PRINT 'Migration completed successfully!';
