-- Adicionar campo numero_documento à tabela documentos
USE DESPESAS;
GO

-- Verificar se a coluna já existe
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('documentos') AND name = 'numero_documento'
)
BEGIN
    -- Adicionar coluna numero_documento
    ALTER TABLE documentos
    ADD numero_documento NVARCHAR(50);
    
    -- Criar índice para performance
    CREATE NONCLUSTERED INDEX IX_documentos_numero_documento 
    ON documentos(numero_documento);
    
    PRINT 'Campo numero_documento adicionado com sucesso!';
END
ELSE
BEGIN
    PRINT 'Campo numero_documento já existe!';
END
GO

-- Criar tabela para controle de sequência por departamento/ano
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[documento_sequencia]') AND type in (N'U'))
BEGIN
    CREATE TABLE documento_sequencia (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        departamento_id UNIQUEIDENTIFIER,
        ano INT NOT NULL,
        proximo_numero INT NOT NULL DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE,
        UNIQUE (departamento_id, ano)
    );
    
    PRINT 'Tabela documento_sequencia criada com sucesso!';
END
GO

PRINT 'Migração para numeração de documentos concluída!';
