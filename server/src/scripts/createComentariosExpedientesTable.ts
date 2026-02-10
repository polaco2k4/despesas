import { executeQuery } from '../config/database.js';

const createComentariosExpedientesTable = async () => {
  try {
    console.log('🔧 Criando tabela comentarios_expedientes...');
    
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='comentarios_expedientes' AND xtype='U')
      CREATE TABLE comentarios_expedientes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        expediente_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        comentario NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        ativo BIT DEFAULT 1,
        
        FOREIGN KEY (expediente_id) REFERENCES expedientes(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `;
    
    await executeQuery(createTableQuery);
    
    // Criar índices para melhor performance
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_expedientes_expediente_id')
      CREATE INDEX IX_comentarios_expedientes_expediente_id ON comentarios_expedientes(expediente_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_expedientes_usuario_id')
      CREATE INDEX IX_comentarios_expedientes_usuario_id ON comentarios_expedientes(usuario_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_expedientes_created_at')
      CREATE INDEX IX_comentarios_expedientes_created_at ON comentarios_expedientes(created_at DESC);
    `;
    
    await executeQuery(createIndexesQuery);
    
    console.log('✅ Tabela comentarios_expedientes criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela comentarios_expedientes:', error);
    throw error;
  }
};

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createComentariosExpedientesTable()
    .then(() => {
      console.log('✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

export default createComentariosExpedientesTable;
