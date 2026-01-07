-- Update existing paid expenses with payment user information
-- This script updates existing paid expenses to show the correct payment user

-- First, let's see which expenses are paid but have no pago_por information
SELECT 
    d.id,
    d.descricao,
    d.status,
    d.data_pagamento,
    d.pago_por,
    u.nome as current_payment_user,
    d.created_at
FROM despesas d
LEFT JOIN usuarios u ON d.pago_por = u.id
WHERE d.status = 'paga' 
AND d.pago_por IS NULL
ORDER BY d.data_pagamento DESC;

-- For demonstration, let's update one of the existing paid expenses
-- In a real scenario, you might want to identify the actual financial user who made the payment
-- For now, we'll use a sample financial user (you should replace with actual user ID)

-- Find a financial user to assign as the payment user
SELECT TOP 3 id, nome, email, role 
FROM usuarios 
WHERE role IN ('admin', 'gestor') 
AND departamento_id IN (SELECT id FROM departamentos WHERE nome LIKE '%Financeiro%');

-- Update existing paid expenses with a financial user (replace with actual user ID)
-- This is just an example - you should identify the actual users who made these payments
UPDATE despesas 
SET pago_por = 'SAMPLE_USER_ID_HERE' -- Replace with actual financial user ID
WHERE status = 'paga' 
AND pago_por IS NULL 
AND id = 'YOUR_EXPENSE_ID_HERE'; -- Replace with specific expense ID

-- After updating, verify the changes
SELECT 
    d.id,
    d.descricao,
    d.status,
    d.data_pagamento,
    d.pago_por,
    u.nome as payment_user_name,
    u.email as payment_user_email
FROM despesas d
LEFT JOIN usuarios u ON d.pago_por = u.id
WHERE d.status = 'paga' 
ORDER BY d.data_pagamento DESC;
