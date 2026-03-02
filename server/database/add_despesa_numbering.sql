-- Script para adicionar numeração automática às despesas
-- Formato: xxxx/desp/sigla/yyyy

USE DESPESAS;
GO

-- Adicionar coluna numero_despesa à tabela despesas se não existir
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('despesas') 
    AND name = 'numero_despesa'
)
BEGIN
    ALTER TABLE despesas
    ADD numero_despesa NVARCHAR(50) NULL;
    
    PRINT 'Coluna numero_despesa adicionada à tabela despesas';
END
ELSE
BEGIN
    PRINT 'Coluna numero_despesa já existe na tabela despesas';
END
GO

-- Criar tabela de sequência para despesas se não existir
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[despesa_sequencia]') AND type in (N'U'))
BEGIN
    CREATE TABLE despesa_sequencia (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        departamento_id UNIQUEIDENTIFIER NULL,
        ano INT NOT NULL,
        proximo_numero INT NOT NULL DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE,
        CONSTRAINT UQ_despesa_sequencia_dept_ano UNIQUE (departamento_id, ano)
    );
    
    PRINT 'Tabela despesa_sequencia criada com sucesso';
END
ELSE
BEGIN
    PRINT 'Tabela despesa_sequencia já existe';
END
GO

-- Criar índice para melhorar performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_despesa_sequencia_dept_ano' AND object_id = OBJECT_ID('despesa_sequencia'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_despesa_sequencia_dept_ano 
    ON despesa_sequencia(departamento_id, ano);
    
    PRINT 'Índice IX_despesa_sequencia_dept_ano criado';
END
GO

PRINT 'Script de numeração de despesas executado com sucesso!';
GO
