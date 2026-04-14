# Expiração Automática de Reuniões

## Descrição
Este recurso marca automaticamente as reuniões como **expiradas** quando o prazo (data/hora fim) é ultrapassado.

## Como Funciona

### 1. Critérios de Expiração
Uma reunião com status **"agendada"** será marcada como **"expirada"** quando:
- **Caso 1**: Possui `data_hora_fim` definida e essa data já passou
- **Caso 2**: Não possui `data_hora_fim` e já se passaram 2 horas desde `data_hora`

### 2. Atualização Automática
A verificação e atualização de reuniões expiradas ocorre:
- **Automaticamente** ao listar reuniões (backend verifica a cada requisição)
- **Periodicamente** via SQL Server Agent Job (a cada hora)

### 3. Restrições
- Reuniões com status **"expirada"** não podem ter o status alterado manualmente
- Apenas reuniões com status **"agendada"** podem expirar
- Reuniões **"realizadas"** ou **"canceladas"** não são afetadas

## Instalação

### Passo 1: Executar a Migração SQL
Execute o script de migração no SQL Server Management Studio (SSMS):

```powershell
# Abrir SSMS e conectar ao servidor
# Abrir o arquivo: server/database/migrations/add_status_expirada_reunioes.sql
# Executar o script completo (F5)
```

**O que o script faz:**
1. ✅ Remove constraint antiga de status
2. ✅ Adiciona nova constraint com status 'expirada'
3. ✅ Cria stored procedure `sp_atualizar_reunioes_expiradas`
4. ✅ Atualiza reuniões existentes que já expiraram
5. ✅ Cria SQL Server Agent Job para executar a cada hora
6. ✅ Exibe estatísticas de reuniões por status

### Passo 2: Verificar SQL Server Agent
O SQL Server Agent deve estar habilitado para o job funcionar:

```sql
-- Verificar se o SQL Server Agent está rodando
EXEC xp_servicecontrol 'QueryState', 'SQLServerAGENT';

-- Se não estiver rodando, iniciar o serviço
EXEC xp_servicecontrol 'Start', 'SQLServerAGENT';
```

**Ou via Windows Services:**
1. Abrir `services.msc`
2. Procurar por "SQL Server Agent"
3. Iniciar o serviço se estiver parado
4. Configurar para iniciar automaticamente

### Passo 3: Verificar Job Criado
```sql
-- Listar jobs
SELECT 
    name,
    enabled,
    date_created,
    date_modified
FROM msdb.dbo.sysjobs
WHERE name = 'Atualizar Reuniões Expiradas';

-- Ver histórico de execução
SELECT 
    j.name AS JobName,
    h.run_date,
    h.run_time,
    h.run_status,
    h.message
FROM msdb.dbo.sysjobs j
INNER JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id
WHERE j.name = 'Atualizar Reuniões Expiradas'
ORDER BY h.run_date DESC, h.run_time DESC;
```

## Execução Manual

Se precisar atualizar reuniões expiradas manualmente:

```sql
-- Executar a stored procedure
EXEC DESPESAS.dbo.sp_atualizar_reunioes_expiradas;

-- Ver quantas reuniões foram atualizadas
SELECT 
    status,
    COUNT(*) as total
FROM DESPESAS.dbo.reunioes
GROUP BY status;
```

## Testes

### Teste 1: Criar Reunião que Expira Imediatamente
```sql
-- Criar reunião com data_hora_fim no passado
INSERT INTO DESPESAS.dbo.reunioes (
    titulo, tipo, data_hora, data_hora_fim, 
    status, convocador_id
)
VALUES (
    'Teste Expiração', 
    'ordinaria', 
    DATEADD(HOUR, -3, GETDATE()),  -- 3 horas atrás
    DATEADD(HOUR, -1, GETDATE()),  -- 1 hora atrás
    'agendada',
    (SELECT TOP 1 id FROM DESPESAS.dbo.usuarios)
);

-- Executar procedure
EXEC DESPESAS.dbo.sp_atualizar_reunioes_expiradas;

-- Verificar se foi marcada como expirada
SELECT titulo, status, data_hora_fim 
FROM DESPESAS.dbo.reunioes 
WHERE titulo = 'Teste Expiração';
```

### Teste 2: Verificar Reunião Sem data_hora_fim
```sql
-- Criar reunião sem data_hora_fim (expira após 2 horas)
INSERT INTO DESPESAS.dbo.reunioes (
    titulo, tipo, data_hora, 
    status, convocador_id
)
VALUES (
    'Teste Expiração Sem Fim', 
    'ordinaria', 
    DATEADD(HOUR, -3, GETDATE()),  -- 3 horas atrás (já expirou)
    'agendada',
    (SELECT TOP 1 id FROM DESPESAS.dbo.usuarios)
);

-- Executar procedure
EXEC DESPESAS.dbo.sp_atualizar_reunioes_expiradas;

-- Verificar
SELECT titulo, status, data_hora, data_hora_fim 
FROM DESPESAS.dbo.reunioes 
WHERE titulo = 'Teste Expiração Sem Fim';
```

## Frontend

### Cores de Status
- 🟡 **Agendada**: Amarelo (`bg-yellow-100 text-yellow-800`)
- 🟢 **Realizada**: Verde (`bg-green-100 text-green-800`)
- 🔴 **Cancelada**: Vermelho (`bg-red-100 text-red-800`)
- 🟠 **Expirada**: Laranja (`bg-orange-100 text-orange-800`)

### Filtros
O filtro de status inclui a opção "Expirada" para visualizar apenas reuniões expiradas.

### Restrições na Interface
- Reuniões expiradas aparecem com o campo de status desabilitado
- Não é possível alterar o status de uma reunião expirada manualmente
- Tooltip explica: "Reuniões expiradas não podem ter o status alterado"

## Troubleshooting

### Job não está executando
```sql
-- Verificar se o job está habilitado
SELECT name, enabled 
FROM msdb.dbo.sysjobs 
WHERE name = 'Atualizar Reuniões Expiradas';

-- Habilitar o job se necessário
EXEC msdb.dbo.sp_update_job 
    @job_name = 'Atualizar Reuniões Expiradas',
    @enabled = 1;

-- Executar job manualmente para testar
EXEC msdb.dbo.sp_start_job @job_name = 'Atualizar Reuniões Expiradas';
```

### Verificar permissões
```sql
-- Verificar se o usuário tem permissão para executar a procedure
GRANT EXECUTE ON DESPESAS.dbo.sp_atualizar_reunioes_expiradas TO [seu_usuario];
```

### Remover Job (se necessário)
```sql
-- Remover o job
EXEC msdb.dbo.sp_delete_job 
    @job_name = 'Atualizar Reuniões Expiradas';
```

## Logs e Monitoramento

### Ver últimas execuções
```sql
SELECT TOP 10
    j.name AS JobName,
    CONVERT(VARCHAR(10), h.run_date) AS RunDate,
    STUFF(STUFF(RIGHT('000000' + CONVERT(VARCHAR(6), h.run_time), 6), 5, 0, ':'), 3, 0, ':') AS RunTime,
    CASE h.run_status
        WHEN 0 THEN 'Failed'
        WHEN 1 THEN 'Succeeded'
        WHEN 2 THEN 'Retry'
        WHEN 3 THEN 'Canceled'
        WHEN 4 THEN 'In Progress'
    END AS Status,
    h.message
FROM msdb.dbo.sysjobs j
INNER JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id
WHERE j.name = 'Atualizar Reuniões Expiradas'
ORDER BY h.run_date DESC, h.run_time DESC;
```

## Notas Importantes

1. **Backup**: Sempre faça backup do banco de dados antes de executar migrações
2. **SQL Server Agent**: Certifique-se de que o serviço está rodando
3. **Permissões**: O usuário do SQL Server Agent precisa ter permissões adequadas
4. **Timezone**: As datas são armazenadas no timezone do servidor (WAT)
5. **Performance**: A query de atualização é otimizada e não deve impactar performance

## Reversão

Se precisar reverter a migração:

```sql
-- 1. Remover o job
EXEC msdb.dbo.sp_delete_job @job_name = 'Atualizar Reuniões Expiradas';

-- 2. Remover a stored procedure
DROP PROCEDURE IF EXISTS DESPESAS.dbo.sp_atualizar_reunioes_expiradas;

-- 3. Atualizar reuniões expiradas de volta para agendada (opcional)
UPDATE DESPESAS.dbo.reunioes
SET status = 'agendada'
WHERE status = 'expirada';

-- 4. Remover constraint
ALTER TABLE DESPESAS.dbo.reunioes DROP CONSTRAINT CK_reunioes_status;

-- 5. Recriar constraint sem 'expirada'
ALTER TABLE DESPESAS.dbo.reunioes
ADD CONSTRAINT CK_reunioes_status 
CHECK (status IN ('agendada', 'realizada', 'cancelada'));
```
