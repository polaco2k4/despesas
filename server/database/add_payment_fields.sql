-- Migration: Add payment confirmation fields to despesas table
-- numero_operacao: banking/transfer operation number
-- comprovante_pagamento_url: path to the uploaded payment proof document

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'despesas' AND COLUMN_NAME = 'numero_operacao'
)
BEGIN
  ALTER TABLE despesas ADD numero_operacao NVARCHAR(100) NULL;
  PRINT 'Column numero_operacao added successfully.';
END
ELSE
BEGIN
  PRINT 'Column numero_operacao already exists.';
END

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'despesas' AND COLUMN_NAME = 'comprovante_pagamento_url'
)
BEGIN
  ALTER TABLE despesas ADD comprovante_pagamento_url NVARCHAR(500) NULL;
  PRINT 'Column comprovante_pagamento_url added successfully.';
END
ELSE
BEGIN
  PRINT 'Column comprovante_pagamento_url already exists.';
END
