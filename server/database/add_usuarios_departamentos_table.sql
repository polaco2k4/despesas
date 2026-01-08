-- Migration: Create usuarios_departamentos junction table
-- Purpose: Allow adm_area users to belong to multiple departments

USE DESPESAS;
GO

-- Create usuarios_departamentos junction table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[usuarios_departamentos]') AND type in (N'U'))
BEGIN
    CREATE TABLE usuarios_departamentos (
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        departamento_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        PRIMARY KEY (usuario_id, departamento_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE
    );
    
    PRINT 'Tabela usuarios_departamentos criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Tabela usuarios_departamentos já existe.';
END
GO

-- Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_usuarios_departamentos_usuario' AND object_id = OBJECT_ID('usuarios_departamentos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_usuarios_departamentos_usuario ON usuarios_departamentos(usuario_id);
    PRINT 'Índice IX_usuarios_departamentos_usuario criado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_usuarios_departamentos_departamento' AND object_id = OBJECT_ID('usuarios_departamentos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_usuarios_departamentos_departamento ON usuarios_departamentos(departamento_id);
    PRINT 'Índice IX_usuarios_departamentos_departamento criado.';
END
GO

-- Migrate existing adm_area users to the new table
-- Copy their current departamento_id to the junction table
INSERT INTO usuarios_departamentos (usuario_id, departamento_id)
SELECT u.id, u.departamento_id
FROM usuarios u
WHERE u.role = 'adm_area' 
AND u.departamento_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM usuarios_departamentos ud 
    WHERE ud.usuario_id = u.id AND ud.departamento_id = u.departamento_id
);

PRINT 'Usuários adm_area existentes migrados para a tabela usuarios_departamentos.';
GO

-- Verify the migration
SELECT 
    u.nome,
    u.email,
    u.role,
    COUNT(ud.departamento_id) as num_departamentos,
    STRING_AGG(d.nome, ', ') as departamentos
FROM usuarios u
LEFT JOIN usuarios_departamentos ud ON u.id = ud.usuario_id
LEFT JOIN departamentos d ON ud.departamento_id = d.id
WHERE u.role = 'adm_area'
GROUP BY u.id, u.nome, u.email, u.role
ORDER BY u.nome;

PRINT 'Verificação concluída.';
GO
