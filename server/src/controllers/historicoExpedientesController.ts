import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';

// Criar tabela se não existir
const ensureHistoricoExpedientesTable = async () => {
  try {
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='historico_expedientes' AND xtype='U')
      CREATE TABLE historico_expedientes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        expediente_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        tipo_alteracao VARCHAR(50) NOT NULL,
        campo_alterado VARCHAR(100),
        valor_antigo NVARCHAR(MAX),
        valor_novo NVARCHAR(MAX),
        descricao_alteracao NVARCHAR(500),
        ip_address VARCHAR(45),
        data_alteracao DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (expediente_id) REFERENCES expedientes(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `;
    
    await executeQuery(createTableQuery);
    
    // Criar índices se não existirem
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_historico_expedientes_expediente_id')
      CREATE INDEX IX_historico_expedientes_expediente_id ON historico_expedientes(expediente_id);
    `;
    
    await executeQuery(createIndexesQuery);
  } catch (error) {
    console.error('Erro ao criar tabela historico_expedientes:', error);
  }
};

// Verificar acesso ao expediente
const checkExpedienteAccess = async (expedienteId: string, userId: string, userRole: string, userDepartmentId: string) => {
  try {
    let query = '';
    const params: any = { expedienteId, userId };

    if (userRole === 'admin') {
      // Admin tem acesso a todos os expedientes
      query = `
        SELECT COUNT(*) as count
        FROM expedientes e
        WHERE e.id = @expedienteId AND e.ativo = 1
      `;
    } else if (userRole === 'adm_area') {
      // ADM_AREA: acesso a expedientes públicos dos departamentos associados + próprios expedientes + expedientes onde é responsável
      query = `
        SELECT COUNT(*) as count
        FROM expedientes e
        LEFT JOIN usuarios_departamentos ud ON ud.usuario_id = @userId
        WHERE e.id = @expedienteId 
          AND e.ativo = 1
          AND ((e.departamento_id IN (SELECT departamento_id FROM usuarios_departamentos WHERE usuario_id = @userId) AND e.publico = 1) 
               OR e.criado_por = @userId OR e.responsavel_id = @userId)
      `;
    } else {
      // Outros roles: acesso a expedientes públicos do próprio departamento + próprios expedientes + expedientes onde é responsável
      query = `
        SELECT COUNT(*) as count
        FROM expedientes e
        WHERE e.id = @expedienteId 
          AND e.ativo = 1
          AND ((e.departamento_id = @userDepartmentId AND e.publico = 1) 
               OR e.criado_por = @userId OR e.responsavel_id = @userId)
      `;
      params.userDepartmentId = userDepartmentId;
    }

    const results = await executeQuery(query, params);
    return results[0]?.count > 0;
  } catch (error) {
    console.error('Erro ao verificar acesso ao expediente:', error);
    return false;
  }
};

export const getHistoricoByExpedienteId = async (req: Request, res: Response) => {
  try {
    await ensureHistoricoExpedientesTable();
    
    const { expedienteId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;

    // Verificar se o usuário tem acesso ao expediente
    const hasAccess = await checkExpedienteAccess(expedienteId, userId, userRole, userDepartmentId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Sem permissão para visualizar o histórico deste expediente' });
    }
    
    const query = `
      SELECT 
        h.id, h.expediente_id, h.usuario_id, h.tipo_alteracao, h.campo_alterado,
        h.valor_antigo, h.valor_novo, h.descricao_alteracao, h.ip_address, h.data_alteracao,
        u.nome as usuario_nome, u.email as usuario_email, u.role as usuario_role,
        d_antigo.sigla as departamento_antigo_sigla, d_antigo.nome as departamento_antigo_nome,
        d_novo.sigla as departamento_novo_sigla, d_novo.nome as departamento_novo_nome,
        u_antigo.nome as responsavel_antigo_nome, u_antigo.email as responsavel_antigo_email,
        u_novo.nome as responsavel_novo_nome, u_novo.email as responsavel_novo_email
      FROM historico_expedientes h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN departamentos d_antigo ON h.valor_antigo = CAST(d_antigo.id AS VARCHAR(36)) AND h.campo_alterado = 'departamento_id'
      LEFT JOIN departamentos d_novo ON h.valor_novo = CAST(d_novo.id AS VARCHAR(36)) AND h.campo_alterado = 'departamento_id'
      LEFT JOIN usuarios u_antigo ON h.valor_antigo = CAST(u_antigo.id AS VARCHAR(36)) AND h.campo_alterado = 'responsavel_id'
      LEFT JOIN usuarios u_novo ON h.valor_novo = CAST(u_novo.id AS VARCHAR(36)) AND h.campo_alterado = 'responsavel_id'
      WHERE h.expediente_id = @expedienteId
      ORDER BY h.data_alteracao DESC
    `;
    
    const results = await executeQuery(query, { expedienteId });
    
    const historico = results.map((row: any) => {
      let valorAntigoDisplay = row.valor_antigo;
      let valorNovoDisplay = row.valor_novo;
      
      // Se o campo alterado for departamento_id, mostrar sigla em vez do ID
      if (row.campo_alterado === 'departamento_id') {
        valorAntigoDisplay = row.departamento_antigo_sigla || row.valor_antigo;
        valorNovoDisplay = row.departamento_novo_sigla || row.valor_novo;
      }
      
      // Se o campo alterado for responsavel_id, mostrar nome em vez do ID
      if (row.campo_alterado === 'responsavel_id') {
        valorAntigoDisplay = row.responsavel_antigo_nome || row.valor_antigo;
        valorNovoDisplay = row.responsavel_novo_nome || row.valor_novo;
      }
      
      return {
        id: row.id,
        expediente_id: row.expediente_id,
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
    console.error('Error fetching historico expediente:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico do expediente' });
  }
};

export const createHistorico = async (
  expedienteId: string,
  usuarioId: string,
  tipoAlteracao: string,
  campoAlterado?: string,
  valorAntigo?: string,
  valorNovo?: string,
  descricaoAlteracao?: string,
  ipAddress?: string
) => {
  try {
    await ensureHistoricoExpedientesTable();
    
    const query = `
      INSERT INTO historico_expedientes (
        expediente_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_antigo, valor_novo, descricao_alteracao, ip_address
      )
      VALUES (
        @expedienteId, @usuarioId, @tipoAlteracao, @campoAlterado,
        @valorAntigo, @valorNovo, @descricaoAlteracao, @ipAddress
      )
    `;
    
    await executeQuery(query, {
      expedienteId,
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
