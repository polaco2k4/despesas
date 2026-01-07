-- Script de migração para adicionar o role 'adm_area'
-- Executar este script para atualizar bancos de dados existentes

USE DESPESAS;
GO

-- 1. Remover o CHECK constraint antigo se existir
IF EXISTS (SELECT name FROM sys.check_constraints WHERE name = 'CK__usuarios__role__3B75D760')
BEGIN
    ALTER TABLE usuarios DROP CONSTRAINT CK__usuarios__role__3B75D760;
END
GO

-- 2. Adicionar o novo CHECK constraint com 'adm_area'
ALTER TABLE usuarios 
ADD CONSTRAINT CK_usuarios_role 
CHECK (role IN ('admin', 'gestor', 'colaborador', 'adm_area'));
GO

PRINT 'Migração concluída: Role adm_area adicionado com sucesso!';
GO
