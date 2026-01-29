import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';

// Criar tabela se não existir
const ensureHistoricoDocumentosTable = async () => {
  try {
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='historico_documentos' AND xtype='U')
      CREATE TABLE historico_documentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        documento_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        tipo_alteracao VARCHAR(50) NOT NULL,
        campo_alterado VARCHAR(100),
        valor_antigo NVARCHAR(MAX),
        valor_novo NVARCHAR(MAX),
        descricao_alteracao NVARCHAR(500),
        ip_address VARCHAR(45),
        data_alteracao DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (documento_id) REFERENCES documentos(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `;
    
    await executeQuery(createTableQuery);
    
    // Criar índices se não existirem
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_historico_documentos_documento_id')
      CREATE INDEX IX_historico_documentos_documento_id ON historico_documentos(documento_id);
    `;
    
    await executeQuery(createIndexesQuery);
  } catch (error) {
    console.error('Erro ao criar tabela historico_documentos:', error);
  }
};

export const getHistoricoByDocumentoId = async (req: Request, res: Response) => {
  try {
    await ensureHistoricoDocumentosTable();
    
    const { documentoId } = req.params;
    
    const query = `
      SELECT 
        h.id, h.documento_id, h.usuario_id, h.tipo_alteracao, h.campo_alterado,
        h.valor_antigo, h.valor_novo, h.descricao_alteracao, h.ip_address, h.data_alteracao,
        u.nome as usuario_nome, u.email as usuario_email, u.role as usuario_role,
        d_antigo.sigla as departamento_antigo_sigla, d_antigo.nome as departamento_antigo_nome,
        d_novo.sigla as departamento_novo_sigla, d_novo.nome as departamento_novo_nome
      FROM historico_documentos h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN departamentos d_antigo ON h.valor_antigo = CAST(d_antigo.id AS VARCHAR(36)) AND h.campo_alterado = 'departamento_id'
      LEFT JOIN departamentos d_novo ON h.valor_novo = CAST(d_novo.id AS VARCHAR(36)) AND h.campo_alterado = 'departamento_id'
      WHERE h.documento_id = @documentoId
      ORDER BY h.data_alteracao DESC
    `;
    
    const results = await executeQuery(query, { documentoId });
    
    const historico = results.map((row: any) => {
      let valorAntigoDisplay = row.valor_antigo;
      let valorNovoDisplay = row.valor_novo;
      
      // Se o campo alterado for departamento_id, mostrar sigla em vez do ID
      if (row.campo_alterado === 'departamento_id') {
        valorAntigoDisplay = row.departamento_antigo_sigla || row.valor_antigo;
        valorNovoDisplay = row.departamento_novo_sigla || row.valor_novo;
      }
      
      return {
        id: row.id,
        documento_id: row.documento_id,
        usuario_id: row.usuario_id,
        tipo_alteracao: row.tipo_alteracao,
        campo_alterado: row.campo_alterado,
        valor_antigo: valorAntigoDisplay,
        valor_novo: valorNovoDisplay,
        descricao_alteracao: row.descricao_alteracao,
        ip_address: row.ip_address,
        data_alteracao: row.data_alteracao,
        usuario: {
          nome: row.usuario_nome,
          email: row.usuario_email,
          role: row.usuario_role
        }
      };
    });
    
    res.json(historico);
  } catch (error) {
    console.error('Error fetching historico documento:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico do documento' });
  }
};

export const createHistorico = async (
  documentoId: string,
  usuarioId: string,
  tipoAlteracao: string,
  campoAlterado?: string,
  valorAntigo?: string,
  valorNovo?: string,
  descricaoAlteracao?: string,
  ipAddress?: string
) => {
  try {
    await ensureHistoricoDocumentosTable();
    
    const query = `
      INSERT INTO historico_documentos (
        documento_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_antigo, valor_novo, descricao_alteracao, ip_address
      )
      VALUES (
        @documentoId, @usuarioId, @tipoAlteracao, @campoAlterado,
        @valorAntigo, @valorNovo, @descricaoAlteracao, @ipAddress
      )
    `;
    
    await executeQuery(query, {
      documentoId,
      usuarioId,
      tipoAlteracao,
      campoAlterado: campoAlterado || null,
      valorAntigo: valorAntigo || null,
      valorNovo: valorNovo || null,
      descricaoAlteracao: descricaoAlteracao || null,
      ipAddress: ipAddress || null
    });
  } catch (error) {
    console.error('Error creating historico:', error);
  }
};
