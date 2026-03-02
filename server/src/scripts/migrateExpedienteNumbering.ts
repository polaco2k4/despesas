import { executeQuery } from '../config/database.js';

async function migrateExpedienteNumbering() {
  try {
    console.log('🔄 Iniciando migração de numeração de expedientes...');
    
    // Add numero_expediente column
    const addColumnQuery = `
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'expedientes') 
        AND name = 'numero_expediente'
      )
      BEGIN
        ALTER TABLE expedientes
        ADD numero_expediente VARCHAR(50) NULL;
        PRINT 'Column numero_expediente added';
      END
    `;
    
    await executeQuery(addColumnQuery);
    console.log('✅ Coluna numero_expediente adicionada/verificada');
    
    // Create expediente_sequencia table
    const createTableQuery = `
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
        
        ALTER TABLE expediente_sequencia
        ADD CONSTRAINT FK_expediente_sequencia_departamento
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
        ON DELETE CASCADE;
        
        CREATE INDEX IX_expediente_sequencia_dept_ano 
        ON expediente_sequencia(departamento_id, ano);
        
        PRINT 'Table expediente_sequencia created';
      END
    `;
    
    await executeQuery(createTableQuery);
    console.log('✅ Tabela expediente_sequencia criada/verificada');
    
    console.log('🎉 Migração de numeração de expedientes concluída!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

migrateExpedienteNumbering();
