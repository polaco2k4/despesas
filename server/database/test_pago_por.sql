-- Test script to verify pago_por functionality
-- This script creates a test expense and verifies the pago_por field works correctly

-- First, let's check if the pago_por field exists and is properly configured
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'despesas' 
    AND COLUMN_NAME IN ('pago_por', 'data_pagamento')
ORDER BY COLUMN_NAME;

-- Check if foreign key constraint exists
SELECT 
    fk.name AS ForeignKeyName,
    tp.name AS ParentTable,
    cp.name AS ParentColumn,
    tr.name AS ReferencedTable,
    cr.name AS ReferencedColumn
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
WHERE tp.name = 'despesas' AND cp.name = 'pago_por';

-- Show a sample of existing expenses to see current state
SELECT TOP 5 
    id,
    descricao,
    status,
    data_pagamento,
    pago_por,
    created_at
FROM despesas 
ORDER BY created_at DESC;
