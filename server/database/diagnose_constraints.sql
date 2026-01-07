-- Script de diagnóstico para verificar os CHECK constraints atuais
USE DESPESAS;
GO

PRINT '=== DIAGNÓSTICO DE CHECK CONSTRAINTS ===';
PRINT '';

-- Verificar constraints da tabela usuarios
PRINT 'CHECK constraints da tabela usuarios:';
SELECT 
    name,
    definition,
    'usuarios' as tabela
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('usuarios');
PRINT '';

-- Verificar constraints da tabela despesas
PRINT 'CHECK constraints da tabela despesas:';
SELECT 
    name,
    definition,
    'despesas' as tabela
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('despesas');
PRINT '';

-- Verificar se os valores que queremos usar são permitidos
PRINT '=== TESTE DE VALORES ===';
PRINT '';

-- Testar se 'adm_area' é permitido em usuarios.role
BEGIN TRY
    DECLARE @test_role NVARCHAR(50) = 'adm_area';
    IF EXISTS (
        SELECT 1 FROM usuarios 
        WHERE role = @test_role
    ) OR NOT EXISTS (
        SELECT 1 FROM sys.check_constraints cc
        WHERE cc.parent_object_id = OBJECT_ID('usuarios')
        AND cc.definition LIKE '%role%'
        AND NOT EXISTS (
            SELECT 1 FROM (VALUES (@test_role)) AS v(role)
            WHERE v.role NOT IN ('admin', 'gestor', 'colaborador', 'adm_area')
        )
    )
    BEGIN
        PRINT '✅ Role "adm_area" é permitido na tabela usuarios';
    END
    ELSE
    BEGIN
        PRINT '❌ Role "adm_area" NÃO é permitido na tabela usuarios';
    END
END TRY
BEGIN CATCH
    PRINT '❌ Erro ao verificar role "adm_area": ' + ERROR_MESSAGE();
END CATCH
PRINT '';

-- Testar se 'pendente_gestor' é permitido em despesas.status
BEGIN TRY
    DECLARE @test_status NVARCHAR(50) = 'pendente_gestor';
    IF EXISTS (
        SELECT 1 FROM despesas 
        WHERE status = @test_status
    ) OR NOT EXISTS (
        SELECT 1 FROM sys.check_constraints cc
        WHERE cc.parent_object_id = OBJECT_ID('despesas')
        AND cc.definition LIKE '%status%'
        AND NOT EXISTS (
            SELECT 1 FROM (VALUES (@test_status)) AS v(status)
            WHERE v.status NOT IN ('pendente_gestor', 'pendente_admin', 'pendente_adm_area', 'aprovada', 'rejeitada', 'paga', 'negada')
        )
    )
    BEGIN
        PRINT '✅ Status "pendente_gestor" é permitido na tabela despesas';
    END
    ELSE
    BEGIN
        PRINT '❌ Status "pendente_gestor" NÃO é permitido na tabela despesas';
    END
END TRY
BEGIN CATCH
    PRINT '❌ Erro ao verificar status "pendente_gestor": ' + ERROR_MESSAGE();
END CATCH
PRINT '';

PRINT '=== FIM DO DIAGNÓSTICO ===';
GO
