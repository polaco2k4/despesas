-- Tabela de configurações do sistema (chave/valor)
-- Usada para as imagens da página de login (chaves 'logo_login' e 'fundo_login')
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[configuracoes_sistema]') AND type in (N'U'))
BEGIN
    CREATE TABLE configuracoes_sistema (
        chave NVARCHAR(100) PRIMARY KEY,
        valor NVARCHAR(MAX) NULL,
        updated_at DATETIME2 DEFAULT GETDATE(),
        updated_by UNIQUEIDENTIFIER NULL
    );
    PRINT 'Tabela configuracoes_sistema criada com sucesso!';
END
GO
