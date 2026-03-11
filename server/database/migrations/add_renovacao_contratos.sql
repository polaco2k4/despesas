-- Migration: Adicionar campos de renovação automática e alertas aos contratos

-- Adicionar novos campos à tabela contratos
ALTER TABLE contratos
ADD renovacao_automatica BIT DEFAULT 0,
    periodo_renovacao INT NULL, -- período em meses
    data_ultimo_alerta DATE NULL,
    dias_alerta_vencimento INT DEFAULT 30, -- alertar X dias antes do vencimento
    numero_renovacoes INT DEFAULT 0, -- contador de renovações
    contrato_original_id UNIQUEIDENTIFIER NULL; -- referência ao contrato original se for renovação

-- Adicionar foreign key separadamente
ALTER TABLE contratos
ADD CONSTRAINT FK_contratos_original 
FOREIGN KEY (contrato_original_id) REFERENCES contratos(id);

-- Criar índice para melhorar performance nas consultas de vencimento
CREATE INDEX IX_contratos_data_fim_renovacao ON contratos(data_fim, renovacao_automatica) 
WHERE data_fim IS NOT NULL;

-- Criar índice para alertas
CREATE INDEX IX_contratos_alertas ON contratos(data_fim, dias_alerta_vencimento, status)
WHERE data_fim IS NOT NULL AND status = 'ativo';

PRINT 'Campos de renovação automática adicionados com sucesso!';
