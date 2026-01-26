-- Migration: Create notificacoes table
-- Purpose: Store user notifications for expense management system

USE DESPESAS;
GO

-- Create notificacoes table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notificacoes]') AND type in (N'U'))
BEGIN
    CREATE TABLE notificacoes (
        id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        mensagem TEXT NOT NULL,
        tipo VARCHAR(50) NOT NULL, -- 'info', 'success', 'warning', 'error'
        categoria VARCHAR(50) NOT NULL, -- 'despesa', 'aprovacao', 'sistema'
        acao_id UNIQUEIDENTIFIER NULL, -- Reference to related record (despesa_id, etc.)
        lida BIT DEFAULT 0,
        data_criacao DATETIME2 DEFAULT GETDATE(),
        data_leitura DATETIME2 NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    
    PRINT 'Tabela notificacoes criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Tabela notificacoes já existe.';
END
GO

-- Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_notificacoes_usuario' AND object_id = OBJECT_ID('notificacoes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_notificacoes_usuario ON notificacoes(usuario_id);
    PRINT 'Índice IX_notificacoes_usuario criado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_notificacoes_lida' AND object_id = OBJECT_ID('notificacoes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_notificacoes_lida ON notificacoes(lida);
    PRINT 'Índice IX_notificacoes_lida criado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_notificacoes_data_criacao' AND object_id = OBJECT_ID('notificacoes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_notificacoes_data_criacao ON notificacoes(data_criacao DESC);
    PRINT 'Índice IX_notificacoes_data_criacao criado.';
END
GO
