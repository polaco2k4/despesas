-- Script imediato para corrigir o CHECK constraint das despesas
USE DESPESAS;
GO

-- Remover o constraint antigo
ALTER TABLE despesas DROP CONSTRAINT CK_despesas_status;
GO

-- Adicionar o novo constraint com todos os status
ALTER TABLE despesas 
ADD CONSTRAINT CK_despesas_status 
CHECK (status IN ('pendente_gestor', 'pendente_admin', 'pendente_adm_area', 'aprovada', 'rejeitada', 'paga', 'negada'));
GO

PRINT '✅ CHECK constraint da tabela despesas atualizado!';
GO
