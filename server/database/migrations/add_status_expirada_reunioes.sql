-- Adicionar status 'expirada' às reuniões
-- Este script atualiza a constraint de status e cria um trigger para marcar reuniões como expiradas automaticamente

USE [DESPESAS];
GO

-- 1. Remover a constraint antiga de status (se existir)
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_reunioes_status')
BEGIN
    ALTER TABLE reunioes DROP CONSTRAINT CK_reunioes_status;
    PRINT '✓ Constraint antiga removida';
END
GO

-- 2. Adicionar nova constraint com status 'expirada'
ALTER TABLE reunioes
ADD CONSTRAINT CK_reunioes_status 
CHECK (status IN ('agendada', 'realizada', 'cancelada', 'expirada'));
GO
PRINT '✓ Nova constraint adicionada com status expirada';
GO

-- 3. Criar stored procedure para atualizar reuniões expiradas
IF OBJECT_ID('sp_atualizar_reunioes_expiradas', 'P') IS NOT NULL
    DROP PROCEDURE sp_atualizar_reunioes_expiradas;
GO

CREATE PROCEDURE sp_atualizar_reunioes_expiradas
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Atualizar reuniões que passaram do prazo (data_hora_fim) e ainda estão como 'agendada'
    UPDATE reunioes
    SET status = 'expirada',
        updated_at = GETDATE()
    WHERE status = 'agendada'
      AND data_hora_fim IS NOT NULL
      AND data_hora_fim < GETDATE();
    
    -- Se não houver data_hora_fim, usar data_hora + 2 horas como padrão
    UPDATE reunioes
    SET status = 'expirada',
        updated_at = GETDATE()
    WHERE status = 'agendada'
      AND data_hora_fim IS NULL
      AND DATEADD(HOUR, 2, data_hora) < GETDATE();
    
    PRINT '✓ Reuniões expiradas atualizadas: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
END
GO
PRINT '✓ Stored procedure criada';
GO

-- 4. Executar a procedure pela primeira vez para atualizar reuniões existentes
EXEC sp_atualizar_reunioes_expiradas;
GO

-- 5. Criar job do SQL Server Agent para executar a procedure periodicamente (a cada hora)
-- Nota: Isso requer que o SQL Server Agent esteja habilitado
USE msdb;
GO

-- Remover job se já existir
IF EXISTS (SELECT job_id FROM msdb.dbo.sysjobs WHERE name = N'Atualizar Reuniões Expiradas')
BEGIN
    EXEC msdb.dbo.sp_delete_job @job_name = N'Atualizar Reuniões Expiradas';
    PRINT '✓ Job antigo removido';
END
GO

-- Criar novo job
EXEC msdb.dbo.sp_add_job
    @job_name = N'Atualizar Reuniões Expiradas',
    @enabled = 1,
    @description = N'Atualiza automaticamente o status de reuniões que passaram do prazo';
GO

-- Adicionar step ao job
EXEC msdb.dbo.sp_add_jobstep
    @job_name = N'Atualizar Reuniões Expiradas',
    @step_name = N'Executar Procedure',
    @subsystem = N'TSQL',
    @command = N'EXEC DESPESAS.dbo.sp_atualizar_reunioes_expiradas',
    @database_name = N'DESPESAS',
    @retry_attempts = 3,
    @retry_interval = 5;
GO

-- Criar schedule para executar a cada hora
EXEC msdb.dbo.sp_add_schedule
    @schedule_name = N'A cada hora',
    @freq_type = 4,  -- Daily
    @freq_interval = 1,  -- Every day
    @freq_subday_type = 8,  -- Hours
    @freq_subday_interval = 1,  -- Every 1 hour
    @active_start_time = 0;  -- Midnight
GO

-- Anexar schedule ao job
EXEC msdb.dbo.sp_attach_schedule
    @job_name = N'Atualizar Reuniões Expiradas',
    @schedule_name = N'A cada hora';
GO

-- Adicionar job ao servidor local
EXEC msdb.dbo.sp_add_jobserver
    @job_name = N'Atualizar Reuniões Expiradas',
    @server_name = N'(local)';
GO

PRINT '✓ Job agendado criado com sucesso';
PRINT '✓ As reuniões serão verificadas e atualizadas automaticamente a cada hora';
GO

USE [DESPESAS];
GO

-- 6. Exibir estatísticas
SELECT 
    status,
    COUNT(*) as total
FROM reunioes
GROUP BY status
ORDER BY status;
GO

PRINT '===========================================';
PRINT 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
PRINT '===========================================';
PRINT 'Status disponíveis: agendada, realizada, cancelada, expirada';
PRINT 'Reuniões expiradas são atualizadas automaticamente a cada hora';
PRINT '===========================================';
