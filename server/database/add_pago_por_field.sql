-- Add pago_por field to despesas table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[despesas]') AND name = 'pago_por')
BEGIN
    ALTER TABLE despesas 
    ADD pago_por UNIQUEIDENTIFIER NULL;
    
    -- Add foreign key constraint
    ALTER TABLE despesas 
    ADD CONSTRAINT FK_despesas_pago_por 
    FOREIGN KEY (pago_por) REFERENCES usuarios(id) ON DELETE SET NULL;
    
    -- Create index for better performance
    CREATE NONCLUSTERED INDEX IX_despesas_pago_por ON despesas(pago_por);
END
GO
