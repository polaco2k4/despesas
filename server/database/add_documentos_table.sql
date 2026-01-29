-- Script para adicionar tabelas de gestão documental
-- SQL Server Express

USE DESPESAS;
GO

-- Tabela: documentos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[documentos]') AND type in (N'U'))
BEGIN
    CREATE TABLE documentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        nome NVARCHAR(255) NOT NULL,
        nome_original NVARCHAR(255) NOT NULL,
        descricao NVARCHAR(MAX),
        tipo_arquivo NVARCHAR(100) NOT NULL,
        tamanho BIGINT NOT NULL,
        caminho_arquivo NVARCHAR(MAX) NOT NULL,
        url_acesso NVARCHAR(MAX),
        categoria NVARCHAR(100),
        tags NVARCHAR(MAX),
        criado_por UNIQUEIDENTIFIER NOT NULL,
        departamento_id UNIQUEIDENTIFIER,
        publico BIT DEFAULT 0,
        ativo BIT DEFAULT 1,
        versao INT DEFAULT 1,
        documento_pai_id UNIQUEIDENTIFIER,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE NO ACTION,
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL,
        FOREIGN KEY (documento_pai_id) REFERENCES documentos(id) ON DELETE NO ACTION
    );
END
GO

-- Tabela: permissoes_documentos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[permissoes_documentos]') AND type in (N'U'))
BEGIN
    CREATE TABLE permissoes_documentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        documento_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER,
        departamento_id UNIQUEIDENTIFIER,
        role NVARCHAR(50),
        permissao NVARCHAR(50) NOT NULL CHECK (permissao IN ('leitura', 'escrita', 'admin')),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE
    );
END
GO

-- Índices para performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_documentos_criado_por' AND object_id = OBJECT_ID('documentos'))
    CREATE NONCLUSTERED INDEX IX_documentos_criado_por ON documentos(criado_por);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_documentos_departamento' AND object_id = OBJECT_ID('documentos'))
    CREATE NONCLUSTERED INDEX IX_documentos_departamento ON documentos(departamento_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_documentos_categoria' AND object_id = OBJECT_ID('documentos'))
    CREATE NONCLUSTERED INDEX IX_documentos_categoria ON documentos(categoria);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_documentos_ativo' AND object_id = OBJECT_ID('documentos'))
    CREATE NONCLUSTERED INDEX IX_documentos_ativo ON documentos(ativo);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_permissoes_documento' AND object_id = OBJECT_ID('permissoes_documentos'))
    CREATE NONCLUSTERED INDEX IX_permissoes_documento ON permissoes_documentos(documento_id);
GO

PRINT 'Tabelas de documentos criadas com sucesso!';
