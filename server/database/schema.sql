-- Script de criação do schema do banco de dados DESPESAS
-- SQL Server Express

USE master;
GO

-- Criar database se não existir
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'DESPESAS')
BEGIN
    CREATE DATABASE DESPESAS;
END
GO

USE DESPESAS;
GO

-- Tabela: departamentos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[departamentos]') AND type in (N'U'))
BEGIN
    CREATE TABLE departamentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        nome NVARCHAR(255) NOT NULL,
        sigla NVARCHAR(10),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Tabela: usuarios
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[usuarios]') AND type in (N'U'))
BEGIN
    CREATE TABLE usuarios (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        nome NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash VARBINARY(64),
        role NVARCHAR(50) NOT NULL CHECK (role IN ('admin', 'gestor', 'colaborador', 'adm_area')),
        departamento_id UNIQUEIDENTIFIER,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL
    );
END
GO

-- Tabela: orcamentos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orcamentos]') AND type in (N'U'))
BEGIN
    CREATE TABLE orcamentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        departamento_id UNIQUEIDENTIFIER NOT NULL,
        ano INT NOT NULL,
        valor_total DECIMAL(18, 2) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE,
        CONSTRAINT UQ_orcamento_dept_ano UNIQUE (departamento_id, ano)
    );
END
GO

-- Tabela: rubricas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[rubricas]') AND type in (N'U'))
BEGIN
    CREATE TABLE rubricas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        nome NVARCHAR(255) NOT NULL,
        descricao NVARCHAR(MAX),
        valor DECIMAL(18, 2) NOT NULL,
        orcamento_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE
    );
END
GO

-- Tabela: fornecedores
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fornecedores]') AND type in (N'U'))
BEGIN
    CREATE TABLE fornecedores (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        nome NVARCHAR(255) NOT NULL,
        nif NVARCHAR(50),
        email NVARCHAR(255),
        telefone NVARCHAR(50),
        endereco NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Tabela: despesas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[despesas]') AND type in (N'U'))
BEGIN
    CREATE TABLE despesas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        rubrica_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        descricao NVARCHAR(MAX) NOT NULL,
        valor DECIMAL(18, 2) NOT NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'pendente_gestor' CHECK (status IN ('pendente_gestor', 'pendente_admin', 'pendente_adm_area', 'aprovada', 'rejeitada', 'paga', 'negada')),
        anexo_url NVARCHAR(MAX),
        data_pagamento DATETIME2,
        motivo_rejeicao NVARCHAR(MAX),
        fornecedor_id UNIQUEIDENTIFIER,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (rubrica_id) REFERENCES rubricas(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE NO ACTION,
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
    );
END
GO

-- Tabela: aprovacoes
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[aprovacoes]') AND type in (N'U'))
BEGIN
    CREATE TABLE aprovacoes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        despesa_id UNIQUEIDENTIFIER NOT NULL,
        aprovado_por UNIQUEIDENTIFIER NOT NULL,
        role NVARCHAR(50) NOT NULL,
        status NVARCHAR(50) NOT NULL CHECK (status IN ('aprovada', 'negada')),
        comentario NVARCHAR(MAX),
        nivel_aprovacao INT DEFAULT 1,
        aprovado_em DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (despesa_id) REFERENCES despesas(id) ON DELETE CASCADE,
        FOREIGN KEY (aprovado_por) REFERENCES usuarios(id) ON DELETE NO ACTION
    );
END
GO

-- Índices para melhorar performance
CREATE NONCLUSTERED INDEX IX_usuarios_email ON usuarios(email);
CREATE NONCLUSTERED INDEX IX_usuarios_departamento ON usuarios(departamento_id);
CREATE NONCLUSTERED INDEX IX_orcamentos_departamento ON orcamentos(departamento_id);
CREATE NONCLUSTERED INDEX IX_orcamentos_ano ON orcamentos(ano);
CREATE NONCLUSTERED INDEX IX_rubricas_orcamento ON rubricas(orcamento_id);
CREATE NONCLUSTERED INDEX IX_despesas_rubrica ON despesas(rubrica_id);
CREATE NONCLUSTERED INDEX IX_despesas_usuario ON despesas(usuario_id);
CREATE NONCLUSTERED INDEX IX_despesas_status ON despesas(status);
CREATE NONCLUSTERED INDEX IX_aprovacoes_despesa ON aprovacoes(despesa_id);
GO

PRINT 'Schema criado com sucesso!';
