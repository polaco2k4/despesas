import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { Rubrica } from '../types/database.js';

export const getAllRubricas = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        r.id, 
        r.nome, 
        r.descricao, 
        r.valor, 
        r.orcamento_id, 
        r.created_at, 
        r.updated_at,
        o.id as orcamento_id_nested,
        o.valor_total as orcamento_valor_total,
        o.departamento_id as orcamento_departamento_id,
        o.ano as orcamento_ano,
        d.id as departamento_id,
        d.nome as departamento_nome,
        d.sigla as departamento_sigla
      FROM rubricas r
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      LEFT JOIN departamentos d ON o.departamento_id = d.id
      ORDER BY r.nome
    `;
    const result = await executeQuery<any>(query);
    
    // Transform the flat result into nested structure
    const rubricas = result.map((row: any) => ({
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      valor: row.valor,
      orcamento_id: row.orcamento_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      orcamento: row.orcamento_id_nested ? {
        id: row.orcamento_id_nested,
        valor_total: row.orcamento_valor_total,
        ano: row.orcamento_ano,
        departamento_id: row.orcamento_departamento_id,
        departamento: row.departamento_id ? {
          id: row.departamento_id,
          nome: row.departamento_nome,
          sigla: row.departamento_sigla
        } : undefined
      } : undefined
    }));
    
    res.json(rubricas);
  } catch (error) {
    console.error('Error fetching rubricas:', error);
    res.status(500).json({ error: 'Erro ao buscar rubricas' });
  }
};

export const getRubricasByOrcamento = async (req: Request, res: Response) => {
  try {
    const { orcamentoId } = req.params;
    
    const query = `
      SELECT id, nome, descricao, valor, orcamento_id, created_at, updated_at
      FROM rubricas
      WHERE orcamento_id = @orcamento_id
      ORDER BY nome
    `;
    const rubricas = await executeQuery<Rubrica>(query, { orcamento_id: orcamentoId });
    res.json(rubricas);
  } catch (error) {
    console.error('Error fetching rubricas by orcamento:', error);
    res.status(500).json({ error: 'Erro ao buscar rubricas' });
  }
};

export const createRubrica = async (req: Request, res: Response) => {
  try {
    const { nome, descricao, valor, orcamento_id } = req.body;
    
    console.log('Creating rubrica with data:', { nome, descricao, valor, orcamento_id });
    
    if (!nome || valor === undefined || !orcamento_id) {
      console.log('Validation failed:', { nome: !!nome, valor: valor !== undefined, orcamento_id: !!orcamento_id });
      return res.status(400).json({ error: 'Nome, valor e orçamento são obrigatórios' });
    }

    const query = `
      INSERT INTO rubricas (nome, descricao, valor, orcamento_id)
      OUTPUT INSERTED.*
      VALUES (@nome, @descricao, @valor, @orcamento_id)
    `;
    const result = await executeQuery<Rubrica>(query, {
      nome,
      descricao,
      valor,
      orcamento_id
    });
    
    console.log('Rubrica created successfully:', result[0]);
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating rubrica:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Erro ao criar rubrica' });
  }
};

export const updateRubrica = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('Updating rubrica:', { id, updates });
    
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
    
    if (fields.length === 0) {
      console.log('No fields to update');
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE rubricas
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    console.log('Update query:', query);
    console.log('Update params:', params);
    
    const result = await executeQuery<Rubrica>(query, params);
    
    console.log('Update result:', result);
    
    if (result.length === 0) {
      console.log('Rubrica not found:', id);
      return res.status(404).json({ error: 'Rubrica não encontrada' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating rubrica:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Erro ao atualizar rubrica' });
  }
};

export const deleteRubrica = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM rubricas WHERE id = @id`;
    await executeQuery(query, { id });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting rubrica:', error);
    res.status(500).json({ error: 'Erro ao deletar rubrica' });
  }
};
