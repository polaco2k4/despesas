-- Migration: Add despesa_anexos table for multiple attachments
-- Created: 2026-04-15

-- Create despesa_anexos table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[despesa_anexos]') AND type in (N'U'))
BEGIN
    CREATE TABLE despesa_anexos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        despesa_id UNIQUEIDENTIFIER NOT NULL,
        file_url NVARCHAR(MAX) NOT NULL,
        file_name NVARCHAR(500) NOT NULL,
        file_size INT,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (despesa_id) REFERENCES despesas(id) ON DELETE CASCADE
    );
    
    CREATE INDEX idx_despesa_anexos_despesa_id ON despesa_anexos(despesa_id);
END
GO

-- Migrate existing anexo_url data to despesa_anexos table
INSERT INTO despesa_anexos (despesa_id, file_url, file_name, created_at)
SELECT 
    id as despesa_id,
    anexo_url as file_url,
    SUBSTRING(anexo_url, CHARINDEX('despesa_', anexo_url), LEN(anexo_url)) as file_name,
    created_at
FROM despesas
WHERE anexo_url IS NOT NULL AND anexo_url != '';
GO
