-- Criar tabela de solicitações de viatura
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'solicitacoes_viatura')
BEGIN
    CREATE TABLE solicitacoes_viatura (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        solicitante_id UNIQUEIDENTIFIER,
        destino NVARCHAR(500) NOT NULL,
        data_inicio DATETIME2 NOT NULL,
        data_fim DATETIME2 NOT NULL,
        numero_passageiros INT NOT NULL,
        tipo_viatura NVARCHAR(50),
        motivo NVARCHAR(MAX) NOT NULL,
        observacoes NVARCHAR(MAX),
        status NVARCHAR(50) NOT NULL DEFAULT 'pendente',
        veiculo_atribuido_id UNIQUEIDENTIFIER,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_solicitacoes_viatura_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuarios(id),
        CONSTRAINT FK_solicitacoes_viatura_veiculo FOREIGN KEY (veiculo_atribuido_id) REFERENCES veiculos(id),
        CONSTRAINT CHK_solicitacoes_status CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'concluida'))
    );

    CREATE INDEX IX_solicitacoes_viatura_solicitante ON solicitacoes_viatura(solicitante_id);
    CREATE INDEX IX_solicitacoes_viatura_status ON solicitacoes_viatura(status);
    CREATE INDEX IX_solicitacoes_viatura_data_inicio ON solicitacoes_viatura(data_inicio);

    PRINT 'Tabela solicitacoes_viatura criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Tabela solicitacoes_viatura já existe.';
END
GO
