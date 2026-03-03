-- Execute este script no SQL Server Management Studio ou Azure Data Studio
-- para adicionar suporte a participantes externos nas reuniões

USE DESPESAS_DB;
GO

-- Criar tabela de participantes externos se não existir
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'reunioes_participantes_externos')
BEGIN
    CREATE TABLE [dbo].[reunioes_participantes_externos] (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        reuniao_id UNIQUEIDENTIFIER NOT NULL,
        nome NVARCHAR(255) NOT NULL,
        email NVARCHAR(255),
        empresa NVARCHAR(255),
        cargo NVARCHAR(255),
        telefone NVARCHAR(50),
        tipo NVARCHAR(50) DEFAULT 'convidado',
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (reuniao_id) REFERENCES reunioes(id) ON DELETE CASCADE
    );
    
    PRINT 'Tabela reunioes_participantes_externos criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Tabela reunioes_participantes_externos já existe.';
END
GO

-- Criar índice para melhorar performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reunioes_participantes_externos_reuniao_id')
BEGIN
    CREATE INDEX IX_reunioes_participantes_externos_reuniao_id 
    ON reunioes_participantes_externos(reuniao_id);
    
    PRINT 'Índice criado com sucesso!';
END
GO

PRINT 'Migração concluída: Suporte a participantes externos adicionado!';
