import { executeQuery } from '../config/database.js';

const createExpedientesTable = async () => {
  try {
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='expedientes' AND xtype='U')
      CREATE TABLE expedientes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        numero VARCHAR(50) UNIQUE NOT NULL,
        titulo NVARCHAR(200) NOT NULL,
        descricao NVARCHAR(MAX),
        tipo VARCHAR(50) NOT NULL, -- 'administrativo', 'juridico', 'financeiro', 'rh', 'outros'
        status VARCHAR(50) NOT NULL DEFAULT 'aberto', -- 'aberto', 'em_andamento', 'suspenso', 'fechado'
        prioridade VARCHAR(20) NOT NULL DEFAULT 'media', -- 'baixa', 'media', 'alta', 'urgente'
        data_abertura DATETIME2 DEFAULT GETDATE(),
        data_prazo DATETIME2,
        data_fechamento DATETIME2,
        criado_por UNIQUEIDENTIFIER NOT NULL,
        responsavel_id UNIQUEIDENTIFIER,
        departamento_id UNIQUEIDENTIFIER,
        observacoes NVARCHAR(MAX),
        publico BIT DEFAULT 0,
        ativo BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (criado_por) REFERENCES usuarios(id),
        FOREIGN KEY (responsavel_id) REFERENCES usuarios(id),
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
      );
    `;
    
    await executeQuery(createTableQuery);
    
    // Create indexes
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_expedientes_numero')
      CREATE UNIQUE INDEX IX_expedientes_numero ON expedientes(numero);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_expedientes_status')
      CREATE INDEX IX_expedientes_status ON expedientes(status);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_expedientes_tipo')
      CREATE INDEX IX_expedientes_tipo ON expedientes(tipo);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_expedientes_departamento_id')
      CREATE INDEX IX_expedientes_departamento_id ON expedientes(departamento_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_expedientes_criado_por')
      CREATE INDEX IX_expedientes_criado_por ON expedientes(criado_por);
    `;
    
    await executeQuery(createIndexesQuery);
    
    console.log('Tabela expedientes criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabela expedientes:', error);
  }
};

// Also create expedientes_documentos relationship table
const createExpedientesDocumentosTable = async () => {
  try {
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='expedientes_documentos' AND xtype='U')
      CREATE TABLE expedientes_documentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        expediente_id UNIQUEIDENTIFIER NOT NULL,
        documento_id UNIQUEIDENTIFIER NOT NULL,
        adicionado_por UNIQUEIDENTIFIER NOT NULL,
        data_adicao DATETIME2 DEFAULT GETDATE(),
        observacoes NVARCHAR(500),
        
        FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE,
        FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
        FOREIGN KEY (adicionado_por) REFERENCES usuarios(id),
        
        UNIQUE(expediente_id, documento_id)
      );
    `;
    
    await executeQuery(createTableQuery);
    
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_expedientes_documentos_expediente_id')
      CREATE INDEX IX_expedientes_documentos_expediente_id ON expedientes_documentos(expediente_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_expedientes_documentos_documento_id')
      CREATE INDEX IX_expedientes_documentos_documento_id ON expedientes_documentos(documento_id);
    `;
    
    await executeQuery(createIndexesQuery);
    
    console.log('Tabela expedientes_documentos criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabela expedientes_documentos:', error);
  }
};

export { createExpedientesTable, createExpedientesDocumentosTable };
