-- Debug query to check dates and values
SELECT 
    CAST(d.created_at AS DATE) as date,
    d.valor,
    d.status,
    d.descricao
FROM despesas d
WHERE d.created_at >= DATEADD(day, -7, GETDATE())
ORDER BY d.created_at DESC;
