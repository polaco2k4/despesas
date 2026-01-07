import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { Despesa, DespesaStatus } from '../types/database.js';

export const getAllDespesas = async (req: Request, res: Response) => {
  try {
    const { status, usuario_id } = req.query;
    
    let whereClause = '';
    const params: Record<string, any> = {};
    
    if (status) {
      whereClause += ' AND d.status = @status';
      params.status = status;
    }
    
    if (usuario_id) {
      whereClause += ' AND d.usuario_id = @usuario_id';
      params.usuario_id = usuario_id;
    }
    
    const query = `
      SELECT 
        d.id, d.rubrica_id, d.usuario_id, d.descricao, d.valor, d.status,
        d.anexo_url, d.data_pagamento, d.motivo_rejeicao, d.fornecedor_id,
        d.created_at, d.updated_at,
        r.id as rubrica_id_nested,
        r.nome as rubrica_nome,
        r.descricao as rubrica_descricao,
        r.valor as rubrica_valor,
        o.id as orcamento_id,
        o.departamento_id as orcamento_departamento_id,
        dept.id as usuario_departamento_id,
        dept.nome as usuario_departamento_nome,
        u.id as usuario_id_nested,
        u.nome as usuario_nome,
        u.email as usuario_email,
        u.role as usuario_role
      FROM despesas d
      LEFT JOIN rubricas r ON d.rubrica_id = r.id
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      LEFT JOIN usuarios u ON d.usuario_id = u.id
      LEFT JOIN departamentos dept ON u.departamento_id = dept.id
      WHERE 1=1 ${whereClause}
      ORDER BY d.created_at DESC
    `;
    const result = await executeQuery<any>(query, params);
    
    // Get all aprovacoes for these despesas
    const despesaIds = result.map((row: any) => row.id);
    let aprovacoes: any[] = [];
    
    if (despesaIds.length > 0) {
      const aprovacoesQuery = `
        SELECT 
          a.id, a.despesa_id, a.aprovado_por, a.role, a.status, a.comentario, a.aprovado_em,
          u.id as aprovador_id,
          u.nome as aprovador_nome,
          u.email as aprovador_email,
          u.role as aprovador_role
        FROM aprovacoes a
        LEFT JOIN usuarios u ON a.aprovado_por = u.id
        WHERE a.despesa_id IN (${despesaIds.map((_, i) => `@id${i}`).join(', ')})
        ORDER BY a.aprovado_em ASC
      `;
      
      const aprovacoesParams: Record<string, any> = {};
      despesaIds.forEach((id, i) => {
        aprovacoesParams[`id${i}`] = id;
      });
      
      aprovacoes = await executeQuery<any>(aprovacoesQuery, aprovacoesParams);
    }
    
    // Transform flat result into nested structure
    const despesas = result.map((row: any) => {
      const despesaAprovacoes = aprovacoes
        .filter((a: any) => a.despesa_id === row.id)
        .map((a: any) => ({
          id: a.id,
          despesa_id: a.despesa_id,
          aprovado_por: a.aprovado_por,
          role: a.role,
          status: a.status,
          comentario: a.comentario,
          aprovado_em: a.aprovado_em,
          aprovador: a.aprovador_id ? {
            id: a.aprovador_id,
            nome: a.aprovador_nome,
            email: a.aprovador_email,
            role: a.aprovador_role
          } : undefined
        }));
      
      return {
        id: row.id,
        rubrica_id: row.rubrica_id,
        usuario_id: row.usuario_id,
        descricao: row.descricao,
        valor: row.valor,
        status: row.status,
        anexo_url: row.anexo_url,
        data_pagamento: row.data_pagamento,
        motivo_rejeicao: row.motivo_rejeicao,
        fornecedor_id: row.fornecedor_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        rubrica: row.rubrica_id_nested ? {
          id: row.rubrica_id_nested,
          nome: row.rubrica_nome,
          descricao: row.rubrica_descricao,
          valor: row.rubrica_valor,
          orcamento: row.orcamento_id ? {
            id: row.orcamento_id,
            departamento_id: row.orcamento_departamento_id
          } : undefined
        } : undefined,
        usuario: row.usuario_id_nested ? {
          id: row.usuario_id_nested,
          nome: row.usuario_nome,
          email: row.usuario_email,
          role: row.usuario_role,
          departamento_id: row.usuario_departamento_id,
          departamento: row.usuario_departamento_id ? {
            id: row.usuario_departamento_id,
            nome: row.usuario_departamento_nome
          } : undefined
        } : undefined,
        aprovacoes: despesaAprovacoes
      };
    });
    
    res.json(despesas);
  } catch (error) {
    console.error('Error fetching despesas:', error);
    res.status(500).json({ error: 'Erro ao buscar despesas' });
  }
};

export const getDespesaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        d.id, d.rubrica_id, d.usuario_id, d.descricao, d.valor, d.status,
        d.anexo_url, d.data_pagamento, d.motivo_rejeicao, d.fornecedor_id,
        d.created_at, d.updated_at
      FROM despesas d
      WHERE d.id = @id
    `;
    const result = await executeQuery<Despesa>(query, { id });
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching despesa:', error);
    res.status(500).json({ error: 'Erro ao buscar despesa' });
  }
};

export const createDespesa = async (req: Request, res: Response) => {
  try {
    const { rubrica_id, usuario_id, descricao, valor, anexo_url, fornecedor_id } = req.body;
    
    console.log('Creating despesa with data:', { 
      rubrica_id, 
      usuario_id, 
      descricao, 
      valor, 
      anexo_url, 
      fornecedor_id,
      status: 'pendente_gestor'
    });
    
    if (!rubrica_id || !usuario_id || !descricao || valor === undefined) {
      return res.status(400).json({ error: 'Rubrica, usuário, descrição e valor são obrigatórios' });
    }

    const query = `
      INSERT INTO despesas (rubrica_id, usuario_id, descricao, valor, status, anexo_url, fornecedor_id)
      OUTPUT INSERTED.*
      VALUES (@rubrica_id, @usuario_id, @descricao, @valor, 'pendente_gestor', @anexo_url, @fornecedor_id)
    `;
    
    console.log('Executing query:', query);
    
    const result = await executeQuery<Despesa>(query, {
      rubrica_id,
      usuario_id,
      descricao,
      valor,
      anexo_url,
      fornecedor_id
    });
    
    console.log('Despesa created successfully:', result[0]);
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating despesa:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
};

export const updateDespesa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
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
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE despesas
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery<Despesa>(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating despesa:', error);
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
};

export const deleteDespesa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM despesas WHERE id = @id`;
    await executeQuery(query, { id });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting despesa:', error);
    res.status(500).json({ error: 'Erro ao deletar despesa' });
  }
};
