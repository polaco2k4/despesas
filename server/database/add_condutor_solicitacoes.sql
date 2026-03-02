-- Adicionar campo condutor_atribuido_id à tabela solicitacoes_viatura
USE DESPESAS;
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[solicitacoes_viatura]') 
    AND name = 'condutor_atribuido_id'
)
BEGIN
    ALTER TABLE solicitacoes_viatura
    ADD condutor_atribuido_id UNIQUEIDENTIFIER NULL;
    
    ALTER TABLE solicitacoes_viatura
    ADD CONSTRAINT FK_solicitacoes_viatura_condutor 
    FOREIGN KEY (condutor_atribuido_id) REFERENCES usuarios(id);
    
    CREATE INDEX IX_solicitacoes_viatura_condutor ON solicitacoes_viatura(condutor_atribuido_id);
    
    PRINT 'Campo condutor_atribuido_id adicionado com sucesso!';
END
ELSE
BEGIN
    PRINT 'Campo condutor_atribuido_id já existe.';
END
GO
