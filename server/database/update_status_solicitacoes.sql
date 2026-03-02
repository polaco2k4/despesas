-- Atualizar constraint de status para incluir 'atribuida'
USE DESPESAS;
GO

-- Remover a constraint antiga
IF EXISTS (
    SELECT * FROM sys.check_constraints 
    WHERE name = 'CHK_solicitacoes_status' 
    AND parent_object_id = OBJECT_ID('solicitacoes_viatura')
)
BEGIN
    ALTER TABLE solicitacoes_viatura
    DROP CONSTRAINT CHK_solicitacoes_status;
    
    PRINT 'Constraint CHK_solicitacoes_status removida.';
END

-- Adicionar a nova constraint com 'atribuida'
ALTER TABLE solicitacoes_viatura
ADD CONSTRAINT CHK_solicitacoes_status 
CHECK (status IN ('pendente', 'aprovada', 'atribuida', 'rejeitada', 'concluida'));

PRINT 'Constraint CHK_solicitacoes_status atualizada com sucesso! Status "atribuida" adicionado.';
GO
