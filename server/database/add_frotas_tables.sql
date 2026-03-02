-- Gestão de Frotas - Tabelas
USE DESPESAS;
GO

-- Tabela: veiculos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[veiculos]') AND type in (N'U'))
BEGIN
    CREATE TABLE veiculos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        matricula NVARCHAR(20) NOT NULL UNIQUE,
        marca NVARCHAR(100) NOT NULL,
        modelo NVARCHAR(100) NOT NULL,
        ano INT NOT NULL,
        tipo NVARCHAR(50) NOT NULL CHECK (tipo IN ('ligeiro', 'pesado', 'moto', 'outro')),
        cor NVARCHAR(50),
        numero_chassis NVARCHAR(100),
        departamento_id UNIQUEIDENTIFIER,
        condutor_atual_id UNIQUEIDENTIFIER,
        quilometragem_atual DECIMAL(10, 2) DEFAULT 0,
        capacidade_tanque DECIMAL(10, 2),
        consumo_medio DECIMAL(10, 2),
        data_aquisicao DATE,
        valor_aquisicao DECIMAL(18, 2),
        status NVARCHAR(50) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'manutencao', 'inativo', 'abatido')),
        observacoes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL,
        FOREIGN KEY (condutor_atual_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
END
GO

-- Tabela: manutencoes
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[manutencoes]') AND type in (N'U'))
BEGIN
    CREATE TABLE manutencoes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        veiculo_id UNIQUEIDENTIFIER NOT NULL,
        tipo NVARCHAR(50) NOT NULL CHECK (tipo IN ('preventiva', 'corretiva', 'revisao', 'inspecao')),
        descricao NVARCHAR(MAX) NOT NULL,
        data_manutencao DATE NOT NULL,
        quilometragem DECIMAL(10, 2),
        custo DECIMAL(18, 2) NOT NULL,
        fornecedor_id UNIQUEIDENTIFIER,
        proximo_servico_km DECIMAL(10, 2),
        proximo_servico_data DATE,
        status NVARCHAR(50) NOT NULL DEFAULT 'concluida' CHECK (status IN ('agendada', 'em_andamento', 'concluida', 'cancelada')),
        responsavel_id UNIQUEIDENTIFIER,
        observacoes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE,
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL,
        FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
END
GO

-- Tabela: abastecimentos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[abastecimentos]') AND type in (N'U'))
BEGIN
    CREATE TABLE abastecimentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        veiculo_id UNIQUEIDENTIFIER NOT NULL,
        data_abastecimento DATETIME2 NOT NULL DEFAULT GETDATE(),
        quilometragem DECIMAL(10, 2) NOT NULL,
        litros DECIMAL(10, 2) NOT NULL,
        preco_litro DECIMAL(10, 2) NOT NULL,
        valor_total DECIMAL(18, 2) NOT NULL,
        tipo_combustivel NVARCHAR(50) NOT NULL CHECK (tipo_combustivel IN ('gasolina', 'diesel', 'eletrico', 'hibrido', 'gas')),
        posto NVARCHAR(255),
        condutor_id UNIQUEIDENTIFIER,
        tanque_cheio BIT DEFAULT 0,
        observacoes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE,
        FOREIGN KEY (condutor_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
END
GO

-- Tabela: atribuicoes_veiculos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[atribuicoes_veiculos]') AND type in (N'U'))
BEGIN
    CREATE TABLE atribuicoes_veiculos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        veiculo_id UNIQUEIDENTIFIER NOT NULL,
        condutor_id UNIQUEIDENTIFIER NOT NULL,
        data_inicio DATE NOT NULL,
        data_fim DATE,
        quilometragem_inicio DECIMAL(10, 2),
        quilometragem_fim DECIMAL(10, 2),
        motivo NVARCHAR(MAX),
        status NVARCHAR(50) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'finalizada', 'cancelada')),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE,
        FOREIGN KEY (condutor_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
END
GO

-- Índices para melhorar performance
CREATE NONCLUSTERED INDEX IX_veiculos_departamento ON veiculos(departamento_id);
CREATE NONCLUSTERED INDEX IX_veiculos_status ON veiculos(status);
CREATE NONCLUSTERED INDEX IX_veiculos_matricula ON veiculos(matricula);
CREATE NONCLUSTERED INDEX IX_manutencoes_veiculo ON manutencoes(veiculo_id);
CREATE NONCLUSTERED INDEX IX_manutencoes_data ON manutencoes(data_manutencao);
CREATE NONCLUSTERED INDEX IX_manutencoes_status ON manutencoes(status);
CREATE NONCLUSTERED INDEX IX_abastecimentos_veiculo ON abastecimentos(veiculo_id);
CREATE NONCLUSTERED INDEX IX_abastecimentos_data ON abastecimentos(data_abastecimento);
CREATE NONCLUSTERED INDEX IX_atribuicoes_veiculo ON atribuicoes_veiculos(veiculo_id);
CREATE NONCLUSTERED INDEX IX_atribuicoes_condutor ON atribuicoes_veiculos(condutor_id);
CREATE NONCLUSTERED INDEX IX_atribuicoes_status ON atribuicoes_veiculos(status);
GO

PRINT 'Tabelas de Gestão de Frotas criadas com sucesso!';
