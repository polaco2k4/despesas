import { executeQuery } from '../config/database.js';

async function runMigration() {
  try {
    console.log('🔄 Iniciando migração para numeração de documentos...');
    
    // Verificar se a coluna já existe
    const checkColumnQuery = `
      SELECT COUNT(*) as count 
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('documentos') AND name = 'numero_documento'
    `;
    
    const columnResult = await executeQuery(checkColumnQuery);
    
    if (columnResult[0].count > 0) {
      console.log('✅ Campo numero_documento já existe!');
    } else {
      console.log('➕ Adicionando campo numero_documento...');
      
      // Adicionar coluna numero_documento
      const addColumnQuery = `
        ALTER TABLE documentos
        ADD numero_documento NVARCHAR(50)
      `;
      
      await executeQuery(addColumnQuery);
      
      // Criar índice
      const createIndexQuery = `
        CREATE NONCLUSTERED INDEX IX_documentos_numero_documento 
        ON documentos(numero_documento)
      `;
      
      await executeQuery(createIndexQuery);
      console.log('✅ Campo numero_documento adicionado com sucesso!');
    }
    
    // Verificar se tabela de sequência existe
    const checkTableQuery = `
      SELECT COUNT(*) as count 
      FROM sys.objects 
      WHERE object_id = OBJECT_ID('documento_sequencia') AND type in (N'U')
    `;
    
    const tableResult = await executeQuery(checkTableQuery);
    
    if (tableResult[0].count > 0) {
      console.log('✅ Tabela documento_sequencia já existe!');
    } else {
      console.log('➕ Criando tabela documento_sequencia...');
      
      // Criar tabela de sequência
      const createTableQuery = `
        CREATE TABLE documento_sequencia (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          departamento_id UNIQUEIDENTIFIER,
          ano INT NOT NULL,
          proximo_numero INT NOT NULL DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE,
          UNIQUE (departamento_id, ano)
        )
      `;
      
      await executeQuery(createTableQuery);
      console.log('✅ Tabela documento_sequencia criada com sucesso!');
    }
    
    console.log('🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  }
}

runMigration();
