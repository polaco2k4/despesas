-- Tabela de Contratos
CREATE TABLE contratos (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    numero_contrato NVARCHAR(50) NOT NULL,
    titulo NVARCHAR(255) NOT NULL,
    descricao NVARCHAR(MAX),
    tipo NVARCHAR(50) NOT NULL DEFAULT 'servico', -- servico, fornecimento, obra, consultoria, locacao, outro
    fornecedor_id UNIQUEIDENTIFIER NULL,
    departamento_id UNIQUEIDENTIFIER NULL,
    responsavel_id UNIQUEIDENTIFIER NULL,
    valor_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    moeda NVARCHAR(10) DEFAULT 'AOA',
    data_inicio DATE NOT NULL,
    data_fim DATE,
    data_assinatura DATE,
    status NVARCHAR(30) DEFAULT 'rascunho', -- rascunho, ativo, suspenso, concluido, cancelado, expirado
    prioridade NVARCHAR(20) DEFAULT 'media', -- baixa, media, alta, critica
    termos NVARCHAR(MAX),
    observacoes NVARCHAR(MAX),
    anexo_url NVARCHAR(500),
    criado_por UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id),
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

-- Índices para melhor performance
CREATE INDEX IX_contratos_status ON contratos(status);
CREATE INDEX IX_contratos_fornecedor ON contratos(fornecedor_id);
CREATE INDEX IX_contratos_departamento ON contratos(departamento_id);
CREATE INDEX IX_contratos_data_fim ON contratos(data_fim);
CREATE UNIQUE INDEX IX_contratos_numero ON contratos(numero_contrato);

PRINT 'Tabela contratos criada com sucesso!';
