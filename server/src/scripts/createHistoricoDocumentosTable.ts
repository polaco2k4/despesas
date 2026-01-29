import { executeQuery } from '../config/database.js';

const createHistoricoDocumentosTable = async () => {
  try {
    console.log('🔄 Criando tabela historico_documentos...');

    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='historico_documentos' AND xtype='U')
      CREATE TABLE historico_documentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        documento_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        tipo_alteracao VARCHAR(50) NOT NULL, -- 'criacao', 'edicao', 'visualizacao', 'download', 'exclusao'
        campo_alterado VARCHAR(100), -- campo específico que foi alterado (para edições)
        valor_antigo NVARCHAR(MAX), -- valor anterior do campo
        valor_novo NVARCHAR(MAX), -- novo valor do campo
        descricao_alteracao NVARCHAR(500), -- descrição detalhada da alteração
        ip_address VARCHAR(45), -- endereço IP do usuário
        data_alteracao DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (documento_id) REFERENCES documentos(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `;

    await executeQuery(createTableQuery);
    console.log('✅ Tabela historico_documentos criada com sucesso!');

    // Criar índices para melhor performance
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_historico_documentos_documento_id')
      CREATE INDEX IX_historico_documentos_documento_id ON historico_documentos(documento_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_historico_documentos_usuario_id')
      CREATE INDEX IX_historico_documentos_usuario_id ON historico_documentos(usuario_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_historico_documentos_data_alteracao')
      CREATE INDEX IX_historico_documentos_data_alteracao ON historico_documentos(data_alteracao);
    `;

    await executeQuery(createIndexesQuery);
    console.log('✅ Índices criados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabela historico_documentos:', error);
    throw error;
  }
};

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createHistoricoDocumentosTable()
    .then(() => {
      console.log('✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

export default createHistoricoDocumentosTable;
