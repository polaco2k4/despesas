import { executeQuery } from '../config/database.js';

async function migrateDespesaNumbering() {
  try {
    console.log('🔄 Iniciando migração de numeração de despesas...');
    
    // Adicionar coluna numero_despesa
    const addColumnQuery = `
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('despesas') 
        AND name = 'numero_despesa'
      )
      BEGIN
        ALTER TABLE despesas
        ADD numero_despesa NVARCHAR(50) NULL;
        PRINT 'Coluna numero_despesa adicionada';
      END
    `;
    
    await executeQuery(addColumnQuery);
    console.log('✅ Coluna numero_despesa verificada/adicionada');
    
    // Criar tabela de sequência
    const createSequenceTableQuery = `
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[despesa_sequencia]') AND type in (N'U'))
      BEGIN
        CREATE TABLE despesa_sequencia (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          departamento_id UNIQUEIDENTIFIER NULL,
          ano INT NOT NULL,
          proximo_numero INT NOT NULL DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE,
          CONSTRAINT UQ_despesa_sequencia_dept_ano UNIQUE (departamento_id, ano)
        );
        PRINT 'Tabela despesa_sequencia criada';
      END
    `;
    
    await executeQuery(createSequenceTableQuery);
    console.log('✅ Tabela despesa_sequencia verificada/criada');
    
    // Criar índice
    const createIndexQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_despesa_sequencia_dept_ano' AND object_id = OBJECT_ID('despesa_sequencia'))
      BEGIN
        CREATE NONCLUSTERED INDEX IX_despesa_sequencia_dept_ano 
        ON despesa_sequencia(departamento_id, ano);
        PRINT 'Índice criado';
      END
    `;
    
    await executeQuery(createIndexQuery);
    console.log('✅ Índice verificado/criado');
    
    console.log('🎉 Migração de numeração de despesas concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

migrateDespesaNumbering();
