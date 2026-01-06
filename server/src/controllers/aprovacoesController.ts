import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { Aprovacao, AprovacaoStatus } from '../types/database.js';

export const getAllAprovacoes = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, despesa_id, aprovado_por, role, status, comentario, aprovado_em
      FROM aprovacoes
      ORDER BY aprovado_em DESC
    `;
    const aprovacoes = await executeQuery<Aprovacao>(query);
    res.json(aprovacoes);
  } catch (error) {
    console.error('Error fetching aprovacoes:', error);
    res.status(500).json({ error: 'Erro ao buscar aprovações' });
  }
};

export const createAprovacao = async (req: Request, res: Response) => {
  try {
    const { despesa_id, aprovado_por, role, status, comentario } = req.body;
    
    if (!despesa_id || !aprovado_por || !role || !status) {
      return res.status(400).json({ error: 'Despesa, aprovador, role e status são obrigatórios' });
    }

    await executeQuery(
      `UPDATE despesas SET status = @status WHERE id = @despesa_id`,
      { status, despesa_id }
    );

    const query = `
      INSERT INTO aprovacoes (despesa_id, aprovado_por, role, status, comentario)
      OUTPUT INSERTED.*
      VALUES (@despesa_id, @aprovado_por, @role, @status, @comentario)
    `;
    const result = await executeQuery<Aprovacao>(query, {
      despesa_id,
      aprovado_por,
      role,
      status,
      comentario
    });
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating aprovacao:', error);
    res.status(500).json({ error: 'Erro ao criar aprovação' });
  }
};
