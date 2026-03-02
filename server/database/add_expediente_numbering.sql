-- Add numero_expediente column to expedientes table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'expedientes') 
    AND name = 'numero_expediente'
)
BEGIN
    ALTER TABLE expedientes
    ADD numero_expediente VARCHAR(50) NULL;
    
    PRINT 'Column numero_expediente added to expedientes table';
END
ELSE
BEGIN
    PRINT 'Column numero_expediente already exists in expedientes table';
END
GO

-- Create expediente_sequencia table for tracking sequence numbers
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'expediente_sequencia')
BEGIN
    CREATE TABLE expediente_sequencia (
        id INT IDENTITY(1,1) PRIMARY KEY,
        departamento_id UNIQUEIDENTIFIER NULL,
        ano INT NOT NULL,
        proximo_numero INT NOT NULL DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_expediente_sequencia_dept_ano UNIQUE (departamento_id, ano)
    );
    
    -- Add foreign key constraint
    ALTER TABLE expediente_sequencia
    ADD CONSTRAINT FK_expediente_sequencia_departamento
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
    ON DELETE CASCADE;
    
    -- Create index for better performance
    CREATE INDEX IX_expediente_sequencia_dept_ano 
    ON expediente_sequencia(departamento_id, ano);
    
    PRINT 'Table expediente_sequencia created successfully';
END
ELSE
BEGIN
    PRINT 'Table expediente_sequencia already exists';
END
GO

-- Verify the changes
SELECT 
    'expedientes' as table_name,
    name as column_name,
    TYPE_NAME(system_type_id) as data_type,
    max_length,
    is_nullable
FROM sys.columns
WHERE object_id = OBJECT_ID(N'expedientes')
AND name = 'numero_expediente';

SELECT 
    'expediente_sequencia' as table_name,
    COUNT(*) as record_count
FROM expediente_sequencia;

PRINT 'Expediente numbering schema setup completed!';
