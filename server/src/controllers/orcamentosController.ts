import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { Orcamento } from '../types/database.js';

export const getAllOrcamentos = async (req: Request, res: Response) => {
  try {
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
    
    // Buscar todas as rubricas de uma vez
    const rubricasQuery = `
      SELECT id, nome, descricao, valor, orcamento_id, created_at, updated_at
      FROM rubricas
      ORDER BY nome
    `;
    const allRubricas = await executeQuery(rubricasQuery);
    
    const orcamentos = results.map((row: any) => ({
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
      } : undefined,
      rubricas: allRubricas.filter((r: any) => r.orcamento_id === row.id)
    }));
    
    res.json(orcamentos);
  } catch (error) {
    console.error('Error fetching orcamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
};

export const getOrcamentoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
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
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }
    
    const row = results[0];
    
    // Buscar rubricas do orçamento
    const rubricasQuery = `
      SELECT id, nome, descricao, valor, orcamento_id, created_at, updated_at
      FROM rubricas
      WHERE orcamento_id = @orcamento_id
      ORDER BY nome
    `;
    const rubricas = await executeQuery(rubricasQuery, { orcamento_id: id });
    
    const orcamento = {
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
      } : undefined,
      rubricas: rubricas
    };
    
    res.json(orcamento);
  } catch (error) {
    console.error('Error fetching orcamento:', error);
    res.status(500).json({ error: 'Erro ao buscar orçamento' });
  }
};

export const createOrcamento = async (req: Request, res: Response) => {
  try {
    const { departamento_id, ano, valor_total } = req.body;
    
    if (!departamento_id || !ano || valor_total === undefined) {
      return res.status(400).json({ error: 'Departamento, ano e valor total são obrigatórios' });
    }

    const query = `
      INSERT INTO orcamentos (departamento_id, ano, valor_total)
      OUTPUT INSERTED.id
      VALUES (@departamento_id, @ano, @valor_total)
    `;
    const result = await executeQuery<{ id: string }>(query, {
      departamento_id,
      ano,
      valor_total
    });
    
    const orcamento = await getOrcamentoByIdInternal(result[0].id);
    res.status(201).json(orcamento);
  } catch (error) {
    console.error('Error creating orcamento:', error);
    res.status(500).json({ error: 'Erro ao criar orçamento' });
  }
};

export const updateOrcamento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
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
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE orcamentos
      SET ${fields.join(', ')}, updated_at = GETDATE()
      WHERE id = @id
    `;
    await executeQuery(query, params);
    
    const orcamento = await getOrcamentoByIdInternal(id);
    res.json(orcamento);
  } catch (error) {
    console.error('Error updating orcamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar orçamento' });
  }
};

export const deleteOrcamento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM orcamentos WHERE id = @id`;
    await executeQuery(query, { id });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting orcamento:', error);
    res.status(500).json({ error: 'Erro ao deletar orçamento' });
  }
};

async function getOrcamentoByIdInternal(id: string): Promise<Orcamento> {
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
}
