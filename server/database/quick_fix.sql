-- Solução rápida: Desabilitar temporariamente o CHECK constraint
USE DESPESAS;
GO

-- Opção 1: Remover todos os CHECK constraints da tabela usuarios
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'ALTER TABLE usuarios DROP CONSTRAINT ' + QUOTENAME(name) + ';' + CHAR(13)
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('usuarios');

IF @sql <> ''
BEGIN
    PRINT 'Removendo constraints...';
    EXEC sp_executesql @sql;
END

-- Adicionar o novo constraint com 'adm_area'
ALTER TABLE usuarios 
ADD CONSTRAINT CK_usuarios_role 
CHECK (role IN ('admin', 'gestor', 'colaborador', 'adm_area'));
GO

PRINT 'Quick fix aplicado com sucesso!';
GO
