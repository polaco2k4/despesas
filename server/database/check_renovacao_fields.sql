-- Script para verificar se os campos de renovação existem na tabela contratos

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'contratos'
    AND COLUMN_NAME IN (
        'renovacao_automatica',
        'periodo_renovacao',
        'dias_alerta_vencimento',
        'numero_renovacoes',
        'contrato_original_id',
        'data_ultimo_alerta'
    )
ORDER BY COLUMN_NAME;

-- Se retornar 0 linhas, os campos não existem e a migration precisa ser executada
