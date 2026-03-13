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
