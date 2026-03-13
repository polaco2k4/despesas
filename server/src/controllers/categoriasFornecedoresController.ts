import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';

export const getAllCategorias = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, nome, descricao, created_at, updated_at
      FROM categorias_fornecedores
      ORDER BY nome
    `;
    const results = await executeQuery(query);
    res.json(results);
  } catch (error) {
    console.error('Error fetching categorias:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
};

export const createCategoria = async (req: Request, res: Response) => {
  try {
    const { nome, descricao } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Check for duplicate nome
    const nomeCheck = await executeQuery(
      `SELECT id FROM categorias_fornecedores WHERE LOWER(nome) = LOWER(@nome)`,
      { nome }
    );
    
    if (nomeCheck.length > 0) {
      return res.status(400).json({ 
        error: 'Já existe uma categoria com este nome' 
      });
    }

    const query = `
      INSERT INTO categorias_fornecedores (nome, descricao)
      OUTPUT INSERTED.*
      VALUES (@nome, @descricao)
    `;
    const result = await executeQuery(query, { 
      nome, 
      descricao: descricao || null
    });
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating categoria:', error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
};

export const updateCategoria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, descricao } = req.body;
    
    // Check for duplicate nome (if being updated)
    if (nome !== undefined) {
      const nomeCheck = await executeQuery(
        `SELECT id FROM categorias_fornecedores WHERE LOWER(nome) = LOWER(@nome) AND id != @id`,
        { nome, id }
      );
      
      if (nomeCheck.length > 0) {
        return res.status(400).json({ 
          error: 'Já existe uma categoria com este nome' 
        });
      }
    }
    
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (nome !== undefined) {
      fields.push('nome = @nome');
      params.nome = nome;
    }
    if (descricao !== undefined) {
      fields.push('descricao = @descricao');
      params.descricao = descricao;
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE categorias_fornecedores
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating categoria:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
};

export const deleteCategoria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category is being used by any supplier
    const fornecedoresCheck = await executeQuery(
      `SELECT COUNT(*) as count FROM fornecedores f
       INNER JOIN categorias_fornecedores c ON f.categoria = c.nome
       WHERE c.id = @id`,
      { id }
    );
    
    if (fornecedoresCheck[0].count > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar esta categoria pois existem fornecedores associados a ela' 
      });
    }

    const query = `DELETE FROM categorias_fornecedores WHERE id = @id`;
    await executeQuery(query, { id });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting categoria:', error);
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
};
