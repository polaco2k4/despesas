import { executeQuery } from '../config/database.js';

const createComentariosDocumentosTable = async () => {
  try {
    console.log('🔧 Criando tabela comentarios_documentos...');
    
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='comentarios_documentos' AND xtype='U')
      CREATE TABLE comentarios_documentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        documento_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        comentario NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        ativo BIT DEFAULT 1,
        
        FOREIGN KEY (documento_id) REFERENCES documentos(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `;
    
    await executeQuery(createTableQuery);
    
    // Criar índices para melhor performance
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_documentos_documento_id')
      CREATE INDEX IX_comentarios_documentos_documento_id ON comentarios_documentos(documento_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_documentos_usuario_id')
      CREATE INDEX IX_comentarios_documentos_usuario_id ON comentarios_documentos(usuario_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_documentos_created_at')
      CREATE INDEX IX_comentarios_documentos_created_at ON comentarios_documentos(created_at DESC);
    `;
    
    await executeQuery(createIndexesQuery);
    
    console.log('✅ Tabela comentarios_documentos criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela comentarios_documentos:', error);
    throw error;
  }
};

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createComentariosDocumentosTable()
    .then(() => {
      console.log('✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

export default createComentariosDocumentosTable;
