import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';

export const getAllFornecedores = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, nome, nif, telefone, email, endereco, created_at, updated_at
      FROM fornecedores
      ORDER BY nome
    `;
    const results = await executeQuery(query);
    res.json(results);
  } catch (error) {
    console.error('Error fetching fornecedores:', error);
    res.status(500).json({ error: 'Erro ao buscar fornecedores' });
  }
};

export const createFornecedor = async (req: Request, res: Response) => {
  try {
    const { nome, nif, telefone, email, endereco } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const query = `
      INSERT INTO fornecedores (nome, nif, telefone, email, endereco)
      OUTPUT INSERTED.*
      VALUES (@nome, @nif, @telefone, @email, @endereco)
    `;
    const result = await executeQuery(query, { nome, nif, telefone, email, endereco });
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating fornecedor:', error);
    res.status(500).json({ error: 'Erro ao criar fornecedor' });
  }
};

export const updateFornecedor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (updates.nome !== undefined) {
      fields.push('nome = @nome');
      params.nome = updates.nome;
    }
    if (updates.nif !== undefined) {
      fields.push('nif = @nif');
      params.nif = updates.nif;
    }
    if (updates.telefone !== undefined) {
      fields.push('telefone = @telefone');
      params.telefone = updates.telefone;
    }
    if (updates.email !== undefined) {
      fields.push('email = @email');
      params.email = updates.email;
    }
    if (updates.endereco !== undefined) {
      fields.push('endereco = @endereco');
      params.endereco = updates.endereco;
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE fornecedores
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating fornecedor:', error);
    res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
  }
};

export const deleteFornecedor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM fornecedores WHERE id = @id`;
    await executeQuery(query, { id });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting fornecedor:', error);
    res.status(500).json({ error: 'Erro ao deletar fornecedor' });
  }
};
