import { executeQuery } from '../config/database.js';

const createHistoricoExpedientesTable = async () => {
  try {
    console.log('🔄 Criando tabela historico_expedientes...');

    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='historico_expedientes' AND xtype='U')
      CREATE TABLE historico_expedientes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        expediente_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        tipo_alteracao VARCHAR(50) NOT NULL, -- 'criacao', 'edicao', 'status', 'responsavel', 'exclusao'
        campo_alterado VARCHAR(100), -- campo específico que foi alterado (para edições)
        valor_antigo NVARCHAR(MAX), -- valor anterior do campo
        valor_novo NVARCHAR(MAX), -- novo valor do campo
        descricao_alteracao NVARCHAR(500), -- descrição detalhada da alteração
        ip_address VARCHAR(45), -- endereço IP do usuário
        data_alteracao DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (expediente_id) REFERENCES expedientes(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `;

    await executeQuery(createTableQuery);
    console.log('✅ Tabela historico_expedientes criada com sucesso!');

    // Criar índices para melhor performance
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_historico_expedientes_expediente_id')
      CREATE INDEX IX_historico_expedientes_expediente_id ON historico_expedientes(expediente_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_historico_expedientes_usuario_id')
      CREATE INDEX IX_historico_expedientes_usuario_id ON historico_expedientes(usuario_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_historico_expedientes_data_alteracao')
      CREATE INDEX IX_historico_expedientes_data_alteracao ON historico_expedientes(data_alteracao);
    `;

    await executeQuery(createIndexesQuery);
    console.log('✅ Índices criados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabela historico_expedientes:', error);
    throw error;
  }
};

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createHistoricoExpedientesTable()
    .then(() => {
      console.log('✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

export default createHistoricoExpedientesTable;
