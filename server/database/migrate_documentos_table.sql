-- Script para migrar tabela de documentos existente para nova estrutura
-- SQL Server Express

USE DESPESAS;
GO

-- Renomear tabela existente para backup
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[documentos]') AND type in (N'U'))
    AND NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[documentos_old]') AND type in (N'U'))
BEGIN
    EXEC sp_rename 'documentos', 'documentos_old';
    PRINT 'Tabela documentos renomeada para documentos_old';
END
GO

-- Criar nova tabela documentos com estrutura correta
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
    PRINT 'Nova tabela documentos criada';
END
GO

-- Criar tabela permissoes_documentos se não existir
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
    PRINT 'Tabela permissoes_documentos criada';
END
GO

-- Migrar dados da tabela antiga se existir
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[documentos_old]') AND type in (N'U'))
BEGIN
    INSERT INTO documentos (
        nome, nome_original, descricao, tipo_arquivo, tamanho, caminho_arquivo,
        categoria, tags, criado_por, departamento_id, publico, ativo,
        created_at, updated_at
    )
    SELECT 
        COALESCE(titulo, nome_arquivo, 'Documento sem título') as nome,
        COALESCE(nome_arquivo, titulo, 'arquivo') as nome_original,
        descricao,
        COALESCE(formato_arquivo, 'application/octet-stream') as tipo_arquivo,
        COALESCE(tamanho_arquivo, 0) as tamanho,
        caminho_arquivo,
        tipo_documento as categoria,
        tags,
        usuario_criador_id as criado_por,
        departamento_id,
        CASE WHEN visibilidade = 'publico' THEN 1 ELSE 0 END as publico,
        CASE WHEN status = 'ativo' THEN 1 ELSE 0 END as ativo,
        data_criacao as created_at,
        COALESCE(data_ultima_modificacao, data_criacao) as updated_at
    FROM documentos_old
    WHERE usuario_criador_id IS NOT NULL;
    
    PRINT 'Dados migrados da tabela antiga';
END
GO

-- Criar índices para performance
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

PRINT 'Migração da tabela documentos concluída com sucesso!';
PRINT 'A tabela antiga foi preservada como documentos_old para backup.';
