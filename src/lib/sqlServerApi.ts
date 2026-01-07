import { executeQuery, sql } from './sqlserver';
import type { 
  Departamento, 
  Usuario, 
  Orcamento, 
  Rubrica, 
  Despesa, 
  Aprovacao,
  DashboardStats,
  DespesaStatus,
  AprovacaoStatus
} from '../types/database';

export const departamentosAPI = {
  getAll: async (): Promise<Departamento[]> => {
    const query = `
      SELECT id, nome, sigla, created_at, updated_at
      FROM departamentos
      ORDER BY nome
    `;
    return await executeQuery<Departamento>(query);
  },

  create: async (departamento: Omit<Departamento, 'id' | 'created_at' | 'updated_at'>): Promise<Departamento> => {
    const query = `
      INSERT INTO departamentos (nome, sigla)
      OUTPUT INSERTED.*
      VALUES (@nome, @sigla)
    `;
    const result = await executeQuery<Departamento>(query, {
      nome: departamento.nome,
      sigla: departamento.sigla
    });
    return result[0];
  }
};

export const usuariosAPI = {
  getAll: async (): Promise<Usuario[]> => {
    const query = `
      SELECT 
        u.id, u.nome, u.email, u.role, u.departamento_id, u.created_at, u.updated_at,
        d.id as 'departamento.id', d.nome as 'departamento.nome', 
        d.sigla as 'departamento.sigla', d.created_at as 'departamento.created_at',
        d.updated_at as 'departamento.updated_at'
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      ORDER BY u.nome
    `;
    const results = await executeQuery(query);
    return results.map(row => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      role: row.role,
      departamento_id: row.departamento_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      departamento: row['departamento.id'] ? {
        id: row['departamento.id'],
        nome: row['departamento.nome'],
        sigla: row['departamento.sigla'],
        created_at: row['departamento.created_at'],
        updated_at: row['departamento.updated_at']
      } : undefined
    }));
  },

  getById: async (id: string): Promise<Usuario> => {
    const query = `
      SELECT 
        u.id, u.nome, u.email, u.role, u.departamento_id, u.created_at, u.updated_at,
        d.id as 'departamento.id', d.nome as 'departamento.nome', 
        d.sigla as 'departamento.sigla', d.created_at as 'departamento.created_at',
        d.updated_at as 'departamento.updated_at'
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      WHERE u.id = @id
    `;
    const results = await executeQuery(query, { id });
    const row = results[0];
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      role: row.role,
      departamento_id: row.departamento_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      departamento: row['departamento.id'] ? {
        id: row['departamento.id'],
        nome: row['departamento.nome'],
        sigla: row['departamento.sigla'],
        created_at: row['departamento.created_at'],
        updated_at: row['departamento.updated_at']
      } : undefined
    };
  },

  create: async (usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>): Promise<Usuario> => {
    const query = `
      INSERT INTO usuarios (nome, email, role, departamento_id)
      OUTPUT INSERTED.*
      VALUES (@nome, @email, @role, @departamento_id)
    `;
    const result = await executeQuery<Usuario>(query, {
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      departamento_id: usuario.departamento_id
    });
    return await usuariosAPI.getById(result[0].id);
  },

  update: async (id: string, updates: Partial<Usuario>): Promise<Usuario> => {
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (updates.nome !== undefined) {
      fields.push('nome = @nome');
      params.nome = updates.nome;
    }
    if (updates.email !== undefined) {
      fields.push('email = @email');
      params.email = updates.email;
    }
    if (updates.role !== undefined) {
      fields.push('role = @role');
      params.role = updates.role;
    }
    if (updates.departamento_id !== undefined) {
      fields.push('departamento_id = @departamento_id');
      params.departamento_id = updates.departamento_id;
    }
    
    const query = `
      UPDATE usuarios
      SET ${fields.join(', ')}, updated_at = GETDATE()
      WHERE id = @id
    `;
    await executeQuery(query, params);
    return await usuariosAPI.getById(id);
  },

  delete: async (id: string): Promise<void> => {
    const query = `DELETE FROM usuarios WHERE id = @id`;
    await executeQuery(query, { id });
  }
};

export const orcamentosAPI = {
  getAll: async (): Promise<Orcamento[]> => {
    const query = `
      SELECT 
        o.id, o.departamento_id, o.ano, o.valor_total, o.created_at, o.updated_at,
        d.id as 'departamento.id', d.nome as 'departamento.nome', 
        d.sigla as 'departamento.sigla', d.created_at as 'departamento.created_at',
        d.updated_at as 'departamento.updated_at'
      FROM orcamentos o
      LEFT JOIN departamentos d ON o.departamento_id = d.id
      ORDER BY o.ano DESC
    `;
    const results = await executeQuery(query);
    return results.map(row => ({
      id: row.id,
      departamento_id: row.departamento_id,
      ano: row.ano,
      valor_total: row.valor_total,
      created_at: row.created_at,
      updated_at: row.updated_at,
      departamento: row['departamento.id'] ? {
        id: row['departamento.id'],
        nome: row['departamento.nome'],
        sigla: row['departamento.sigla'],
        created_at: row['departamento.created_at'],
        updated_at: row['departamento.updated_at']
      } : undefined
    }));
  },

  getById: async (id: string): Promise<Orcamento> => {
    const query = `
      SELECT 
        o.id, o.departamento_id, o.ano, o.valor_total, o.created_at, o.updated_at,
        d.id as 'departamento.id', d.nome as 'departamento.nome', 
        d.sigla as 'departamento.sigla', d.created_at as 'departamento.created_at',
        d.updated_at as 'departamento.updated_at'
      FROM orcamentos o
      LEFT JOIN departamentos d ON o.departamento_id = d.id
      WHERE o.id = @id
    `;
    const results = await executeQuery(query, { id });
    const row = results[0];
    return {
      id: row.id,
      departamento_id: row.departamento_id,
      ano: row.ano,
      valor_total: row.valor_total,
      created_at: row.created_at,
      updated_at: row.updated_at,
      departamento: row['departamento.id'] ? {
        id: row['departamento.id'],
        nome: row['departamento.nome'],
        sigla: row['departamento.sigla'],
        created_at: row['departamento.created_at'],
        updated_at: row['departamento.updated_at']
      } : undefined
    };
  },

  create: async (orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>): Promise<Orcamento> => {
    const query = `
      INSERT INTO orcamentos (departamento_id, ano, valor_total)
      OUTPUT INSERTED.*
      VALUES (@departamento_id, @ano, @valor_total)
    `;
    const result = await executeQuery<Orcamento>(query, {
      departamento_id: orcamento.departamento_id,
      ano: orcamento.ano,
      valor_total: orcamento.valor_total
    });
    return await orcamentosAPI.getById(result[0].id);
  },

  update: async (id: string, updates: Partial<Orcamento>): Promise<Orcamento> => {
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (updates.departamento_id !== undefined) {
      fields.push('departamento_id = @departamento_id');
      params.departamento_id = updates.departamento_id;
    }
    if (updates.ano !== undefined) {
      fields.push('ano = @ano');
      params.ano = updates.ano;
    }
    if (updates.valor_total !== undefined) {
      fields.push('valor_total = @valor_total');
      params.valor_total = updates.valor_total;
    }
    
    const query = `
      UPDATE orcamentos
      SET ${fields.join(', ')}, updated_at = GETDATE()
      WHERE id = @id
    `;
    await executeQuery(query, params);
    return await orcamentosAPI.getById(id);
  },

  delete: async (id: string): Promise<void> => {
    const query = `DELETE FROM orcamentos WHERE id = @id`;
    await executeQuery(query, { id });
  }
};

export const rubricasAPI = {
  getAll: async (): Promise<Rubrica[]> => {
    const query = `
      SELECT id, nome, descricao, valor, orcamento_id, created_at, updated_at
      FROM rubricas
      ORDER BY nome
    `;
    return await executeQuery<Rubrica>(query);
  },

  getByOrcamento: async (orcamentoId: string): Promise<Rubrica[]> => {
    const query = `
      SELECT id, nome, descricao, valor, orcamento_id, created_at, updated_at
      FROM rubricas
      WHERE orcamento_id = @orcamento_id
      ORDER BY nome
    `;
    return await executeQuery<Rubrica>(query, { orcamento_id: orcamentoId });
  },

  create: async (rubrica: Omit<Rubrica, 'id' | 'created_at' | 'updated_at'>): Promise<Rubrica> => {
    const query = `
      INSERT INTO rubricas (nome, descricao, valor, orcamento_id)
      OUTPUT INSERTED.*
      VALUES (@nome, @descricao, @valor, @orcamento_id)
    `;
    const result = await executeQuery<Rubrica>(query, {
      nome: rubrica.nome,
      descricao: rubrica.descricao,
      valor: rubrica.valor,
      orcamento_id: rubrica.orcamento_id
    });
    return result[0];
  },

  update: async (id: string, updates: Partial<Rubrica>): Promise<Rubrica> => {
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (updates.nome !== undefined) {
      fields.push('nome = @nome');
      params.nome = updates.nome;
    }
    if (updates.descricao !== undefined) {
      fields.push('descricao = @descricao');
      params.descricao = updates.descricao;
    }
    if (updates.valor !== undefined) {
      fields.push('valor = @valor');
      params.valor = updates.valor;
    }
    if (updates.orcamento_id !== undefined) {
      fields.push('orcamento_id = @orcamento_id');
      params.orcamento_id = updates.orcamento_id;
    }
    
    const query = `
      UPDATE rubricas
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery<Rubrica>(query, params);
    return result[0];
  },

  delete: async (id: string): Promise<void> => {
    const query = `DELETE FROM rubricas WHERE id = @id`;
    await executeQuery(query, { id });
  }
};

export const despesasAPI = {
  getAll: async (filters?: {
    departamento_id?: string;
    status?: DespesaStatus;
    usuario_id?: string;
  }): Promise<Despesa[]> => {
    let whereClause = '';
    const params: Record<string, any> = {};
    
    if (filters?.status) {
      whereClause += ' AND d.status = @status';
      params.status = filters.status;
    }
    
    if (filters?.usuario_id) {
      whereClause += ' AND d.usuario_id = @usuario_id';
      params.usuario_id = filters.usuario_id;
    }
    
    const query = `
      SELECT 
        d.id, d.rubrica_id, d.usuario_id, d.descricao, d.valor, d.status,
        d.anexo_url, d.data_pagamento, d.motivo_rejeicao, d.fornecedor_id,
        d.created_at, d.updated_at
      FROM despesas d
      WHERE 1=1 ${whereClause}
      ORDER BY d.created_at DESC
    `;
    return await executeQuery<Despesa>(query, params);
  },

  getById: async (id: string): Promise<Despesa> => {
    const query = `
      SELECT 
        d.id, d.rubrica_id, d.usuario_id, d.descricao, d.valor, d.status,
        d.anexo_url, d.data_pagamento, d.motivo_rejeicao, d.fornecedor_id,
        d.created_at, d.updated_at
      FROM despesas d
      WHERE d.id = @id
    `;
    const result = await executeQuery<Despesa>(query, { id });
    return result[0];
  },

  create: async (despesa: Omit<Despesa, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Despesa> => {
    const query = `
      INSERT INTO despesas (rubrica_id, usuario_id, descricao, valor, status, anexo_url, fornecedor_id)
      OUTPUT INSERTED.*
      VALUES (@rubrica_id, @usuario_id, @descricao, @valor, 'pendente_gestor', @anexo_url, @fornecedor_id)
    `;
    const result = await executeQuery<Despesa>(query, {
      rubrica_id: despesa.rubrica_id,
      usuario_id: despesa.usuario_id,
      descricao: despesa.descricao,
      valor: despesa.valor,
      anexo_url: despesa.anexo_url,
      fornecedor_id: despesa.fornecedor_id
    });
    return result[0];
  },

  update: async (id: string, updates: Partial<Despesa>): Promise<Despesa> => {
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (updates.rubrica_id !== undefined) {
      fields.push('rubrica_id = @rubrica_id');
      params.rubrica_id = updates.rubrica_id;
    }
    if (updates.descricao !== undefined) {
      fields.push('descricao = @descricao');
      params.descricao = updates.descricao;
    }
    if (updates.valor !== undefined) {
      fields.push('valor = @valor');
      params.valor = updates.valor;
    }
    if (updates.status !== undefined) {
      fields.push('status = @status');
      params.status = updates.status;
    }
    if (updates.anexo_url !== undefined) {
      fields.push('anexo_url = @anexo_url');
      params.anexo_url = updates.anexo_url;
    }
    if (updates.data_pagamento !== undefined) {
      fields.push('data_pagamento = @data_pagamento');
      params.data_pagamento = updates.data_pagamento;
    }
    if (updates.motivo_rejeicao !== undefined) {
      fields.push('motivo_rejeicao = @motivo_rejeicao');
      params.motivo_rejeicao = updates.motivo_rejeicao;
    }
    
    const query = `
      UPDATE despesas
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery<Despesa>(query, params);
    return result[0];
  },

  delete: async (id: string): Promise<void> => {
    const query = `DELETE FROM despesas WHERE id = @id`;
    await executeQuery(query, { id });
  }
};

export const aprovacoesAPI = {
  getAll: async (): Promise<Aprovacao[]> => {
    const query = `
      SELECT id, despesa_id, aprovado_por, role, status, comentario, aprovado_em
      FROM aprovacoes
      ORDER BY aprovado_em DESC
    `;
    return await executeQuery<Aprovacao>(query);
  },

  create: async (aprovacao: {
    despesa_id: string;
    aprovado_por: string;
    role: string;
    status: AprovacaoStatus;
    comentario?: string;
  }): Promise<Aprovacao> => {
    await executeQuery(
      `UPDATE despesas SET status = @status WHERE id = @despesa_id`,
      { status: aprovacao.status, despesa_id: aprovacao.despesa_id }
    );

    const query = `
      INSERT INTO aprovacoes (despesa_id, aprovado_por, role, status, comentario)
      OUTPUT INSERTED.*
      VALUES (@despesa_id, @aprovado_por, @role, @status, @comentario)
    `;
    const result = await executeQuery<Aprovacao>(query, {
      despesa_id: aprovacao.despesa_id,
      aprovado_por: aprovacao.aprovado_por,
      role: aprovacao.role,
      status: aprovacao.status,
      comentario: aprovacao.comentario
    });
    return result[0];
  }
};

export const dashboardAPI = {
  getStats: async (userId: string, userRole: string, departamentoId?: string): Promise<DashboardStats> => {
    let whereClause = '';
    const params: Record<string, any> = {};
    
    if (userRole !== 'admin' && departamentoId) {
      whereClause = 'WHERE o.departamento_id = @departamento_id';
      params.departamento_id = departamentoId;
    }
    
    const query = `
      SELECT 
        ISNULL(SUM(o.valor_total), 0) as totalOrcamento,
        ISNULL(SUM(CASE WHEN d.status IN ('aprovada', 'paga') THEN d.valor ELSE 0 END), 0) as totalDespesas,
        ISNULL(SUM(CASE WHEN d.status = 'paga' THEN d.valor ELSE 0 END), 0) as totalPago,
        ISNULL(SUM(CASE WHEN d.status = 'pendente_gestor' THEN d.valor ELSE 0 END), 0) as totalPendente,
        ISNULL(SUM(CASE WHEN d.status = 'negada' THEN d.valor ELSE 0 END), 0) as totalNegado,
        ISNULL(SUM(CASE WHEN d.status = 'aprovada' THEN d.valor ELSE 0 END), 0) as totalAprovado,
        COUNT(CASE WHEN d.status = 'pendente_gestor' THEN 1 END) as despesasPendentes,
        COUNT(CASE WHEN d.status IN ('aprovada', 'paga') THEN 1 END) as despesasAprovadas,
        COUNT(CASE WHEN d.status = 'negada' THEN 1 END) as despesasNegadas
      FROM orcamentos o
      LEFT JOIN rubricas r ON r.orcamento_id = o.id
      LEFT JOIN despesas d ON d.rubrica_id = r.id
      ${whereClause}
    `;
    
    const result = await executeQuery(query, params);
    const row = result[0];
    
    const totalOrcamento = row.totalOrcamento || 0;
    const totalDespesas = row.totalDespesas || 0;
    const utilizacaoOrcamento = totalOrcamento > 0 ? (totalDespesas / totalOrcamento) * 100 : 0;
    
    return {
      totalOrcamento,
      totalDespesas,
      totalPago: row.totalPago || 0,
      totalPendente: row.totalPendente || 0,
      totalNegado: row.totalNegado || 0,
      totalAprovado: row.totalAprovado || 0,
      utilizacaoOrcamento
    };
  }
};
