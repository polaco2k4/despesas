# Script para criar a tabela categorias_fornecedores
$serverName = "localhost\SQLEXPRESS"
$databaseName = "DESPESAS"

$sqlScript2 = @"
-- Tabela de Documentos de Fornecedores
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'documentos_fornecedores')
BEGIN
    CREATE TABLE documentos_fornecedores (
        id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        fornecedor_id UNIQUEIDENTIFIER NOT NULL,
        nome NVARCHAR(255) NOT NULL,
        nome_ficheiro NVARCHAR(500) NOT NULL,
        tipo NVARCHAR(100),
        tamanho BIGINT DEFAULT 0,
        data_upload DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_documentos_fornecedores_fornecedor FOREIGN KEY (fornecedor_id)
            REFERENCES fornecedores(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_documentos_fornecedores_fornecedor_id ON documentos_fornecedores(fornecedor_id);
    PRINT N'Tabela documentos_fornecedores criada com sucesso!';
END
ELSE
BEGIN
    PRINT N'Tabela documentos_fornecedores ja existe.';
END
"@

try {
    Invoke-Sqlcmd -ServerInstance $serverName -Database $databaseName -Query $sqlScript2 -ErrorAction Stop
    Write-Host "Tabela documentos_fornecedores criada com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "Erro ao criar documentos_fornecedores: $_" -ForegroundColor Red
}

$sqlScript = @"
-- Tabela de Categorias de Fornecedores
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'categorias_fornecedores')
BEGIN
    CREATE TABLE categorias_fornecedores (
        id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        nome NVARCHAR(100) NOT NULL UNIQUE,
        descricao NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );

    PRINT 'Tabela categorias_fornecedores criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Tabela categorias_fornecedores já existe.';
END
GO

-- Limpar categorias existentes com encoding incorreto
DELETE FROM categorias_fornecedores WHERE nome LIKE '%Ã%';

-- Inserir categorias padrão se não existirem
IF NOT EXISTS (SELECT * FROM categorias_fornecedores WHERE nome = N'Geral')
BEGIN
    INSERT INTO categorias_fornecedores (nome, descricao) VALUES 
    (N'Geral', N'Categoria geral para fornecedores'),
    (N'Tecnologia', N'Fornecedores de tecnologia e equipamentos'),
    (N'Serviços', N'Fornecedores de serviços diversos'),
    (N'Materiais', N'Fornecedores de materiais e suprimentos'),
    (N'Construção', N'Fornecedores de materiais e serviços de construção'),
    (N'Alimentação', N'Fornecedores de alimentos e bebidas'),
    (N'Transporte', N'Fornecedores de serviços de transporte'),
    (N'Consultoria', N'Fornecedores de serviços de consultoria');
    
    PRINT 'Categorias padrão inseridas com sucesso!';
END
ELSE
BEGIN
    PRINT 'Categorias padrão já existem.';
END
GO
"@

try {
    # Executar o script SQL
    Invoke-Sqlcmd -ServerInstance $serverName -Database $databaseName -Query $sqlScript -ErrorAction Stop
    Write-Host "Script executado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "Erro ao executar script: $_" -ForegroundColor Red
    Write-Host "Tentando com autenticação Windows..." -ForegroundColor Yellow
    
    try {
        Invoke-Sqlcmd -ServerInstance $serverName -Database $databaseName -Query $sqlScript -TrustServerCertificate -ErrorAction Stop
        Write-Host "Script executado com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "Erro: $_" -ForegroundColor Red
    }
}
