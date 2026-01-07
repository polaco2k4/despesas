-- Script completo de migração para o fluxo de aprovação sequencial
-- Executar este script para atualizar todos os CHECK constraints

USE DESPESAS;
GO

PRINT 'Iniciando migração completa para fluxo de aprovação sequencial...';
GO

-- 1. Corrigir tabela usuarios
DECLARE @usuarios_constraint NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);

SELECT @usuarios_constraint = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('usuarios') 
AND definition LIKE '%role%';

IF @usuarios_constraint IS NOT NULL
BEGIN
    SET @sql = 'ALTER TABLE usuarios DROP CONSTRAINT ' + QUOTENAME(@usuarios_constraint);
    PRINT 'Removendo constraint da tabela usuarios: ' + @usuarios_constraint;
    EXEC sp_executesql @sql;
END

ALTER TABLE usuarios 
ADD CONSTRAINT CK_usuarios_role 
CHECK (role IN ('admin', 'gestor', 'colaborador', 'adm_area'));
GO

PRINT '✅ Tabela usuarios atualizada com role adm_area';
GO

-- 2. Corrigir tabela despesas
DECLARE @despesas_constraint NVARCHAR(128);

SELECT @despesas_constraint = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('despesas') 
AND definition LIKE '%status%';

IF @despesas_constraint IS NOT NULL
BEGIN
    SET @sql = 'ALTER TABLE despesas DROP CONSTRAINT ' + QUOTENAME(@despesas_constraint);
    PRINT 'Removendo constraint da tabela despesas: ' + @despesas_constraint;
    EXEC sp_executesql @sql;
END

ALTER TABLE despesas 
ADD CONSTRAINT CK_despesas_status 
CHECK (status IN ('pendente_gestor', 'pendente_admin', 'pendente_adm_area', 'aprovada', 'rejeitada', 'paga', 'negada'));
GO

PRINT '✅ Tabela despesas atualizada com status sequenciais';
GO

-- 3. Verificar todos os constraints atualizados
PRINT 'Verificando constraints atualizados:';
GO

SELECT 
    'usuarios' as tabela,
    name,
    definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('usuarios')
AND name = 'CK_usuarios_role'
UNION ALL
SELECT 
    'despesas' as tabela,
    name,
    definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('despesas')
AND name = 'CK_despesas_status';
GO

PRINT '🎉 Migração completa concluída com sucesso!';
PRINT 'Agora você pode:';
PRINT '- Criar usuários com perfil ADM Área';
PRINT '- Criar despesas com status inicial pendente_gestor';
PRINT '- Usar o fluxo de aprovação sequencial completo';
GO
