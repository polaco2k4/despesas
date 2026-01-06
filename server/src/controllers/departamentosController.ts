import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { Departamento } from '../types/database.js';

export const getAllDepartamentos = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, nome, sigla, created_at, updated_at
      FROM departamentos
      ORDER BY nome
    `;
    const departamentos = await executeQuery<Departamento>(query);
    res.json(departamentos);
  } catch (error) {
    console.error('Error fetching departamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar departamentos' });
  }
};

export const createDepartamento = async (req: Request, res: Response) => {
  try {
    const { nome, sigla } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const query = `
      INSERT INTO departamentos (nome, sigla)
      OUTPUT INSERTED.*
      VALUES (@nome, @sigla)
    `;
    const result = await executeQuery<Departamento>(query, { nome, sigla });
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating departamento:', error);
    res.status(500).json({ error: 'Erro ao criar departamento' });
  }
};

export const updateDepartamento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, sigla } = req.body;

    const query = `
      UPDATE departamentos
      SET nome = @nome, sigla = @sigla, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery<Departamento>(query, { id, nome, sigla });
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Departamento não encontrado' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating departamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar departamento' });
  }
};

export const deleteDepartamento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM departamentos WHERE id = @id`;
    await executeQuery(query, { id });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting departamento:', error);
    res.status(500).json({ error: 'Erro ao deletar departamento' });
  }
};
