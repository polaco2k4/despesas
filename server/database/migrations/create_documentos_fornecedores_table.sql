-- Tabela de Documentos de Fornecedores
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'documentos_fornecedores')
BEGIN
    CREATE TABLE documentos_fornecedores (
        id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        fornecedor_id UNIQUEIDENTIFIER NOT NULL,
        nome NVARCHAR(255) NOT NULL,
        nome_ficheiro NVARCHAR(500) NOT NULL,
        tipo NVARCHAR(100),
        tamanho BIGINT DEFAULT 0,
        data_upload DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_documentos_fornecedores_fornecedor FOREIGN KEY (fornecedor_id)
            REFERENCES fornecedores(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_documentos_fornecedores_fornecedor_id ON documentos_fornecedores(fornecedor_id);

    PRINT N'Tabela documentos_fornecedores criada com sucesso!';
END
ELSE
BEGIN
    PRINT N'Tabela documentos_fornecedores já existe.';
END
GO
