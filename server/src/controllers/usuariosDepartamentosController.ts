import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';

export const getUserDepartamentos = async (req: Request, res: Response) => {
  try {
    const { usuario_id } = req.params;
    
    const query = `
      SELECT 
        d.id, d.nome, d.sigla, d.created_at, d.updated_at
      FROM usuarios_departamentos ud
      INNER JOIN departamentos d ON ud.departamento_id = d.id
      WHERE ud.usuario_id = @usuario_id
      ORDER BY d.nome
    `;
    
    const results = await executeQuery(query, { usuario_id });
    res.json(results);
  } catch (error) {
    console.error('Error fetching user departamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar departamentos do usuário' });
  }
};

export const addUserDepartamento = async (req: Request, res: Response) => {
  try {
    const { usuario_id } = req.params;
    const { departamento_id } = req.body;
    
    if (!departamento_id) {
      return res.status(400).json({ error: 'ID do departamento é obrigatório' });
    }
    
    // Check if relationship already exists
    const checkQuery = `
      SELECT COUNT(*) as count FROM usuarios_departamentos 
      WHERE usuario_id = @usuario_id AND departamento_id = @departamento_id
    `;
    const checkResult = await executeQuery(checkQuery, { usuario_id, departamento_id });
    
    if (checkResult[0].count > 0) {
      return res.status(400).json({ error: 'Usuário já está associado a este departamento' });
    }
    
    // Verify user exists and is adm_area
    const userQuery = `SELECT role FROM usuarios WHERE id = @usuario_id`;
    const userResult = await executeQuery(userQuery, { usuario_id });
    
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    if (userResult[0].role !== 'adm_area') {
      return res.status(400).json({ error: 'Apenas usuários adm_area podem ter múltiplos departamentos' });
    }
    
    // Add the relationship
    const insertQuery = `
      INSERT INTO usuarios_departamentos (usuario_id, departamento_id)
      VALUES (@usuario_id, @departamento_id)
    `;
    
    await executeQuery(insertQuery, { usuario_id, departamento_id });
    
    // Return updated list
    const updatedQuery = `
      SELECT 
        d.id, d.nome, d.sigla, d.created_at, d.updated_at
      FROM usuarios_departamentos ud
      INNER JOIN departamentos d ON ud.departamento_id = d.id
      WHERE ud.usuario_id = @usuario_id
      ORDER BY d.nome
    `;
    const updatedResults = await executeQuery(updatedQuery, { usuario_id });
    
    res.status(201).json(updatedResults);
  } catch (error) {
    console.error('Error adding user departamento:', error);
    res.status(500).json({ error: 'Erro ao adicionar departamento ao usuário' });
  }
};

export const removeUserDepartamento = async (req: Request, res: Response) => {
  try {
    const { usuario_id, departamento_id } = req.params;
    
    const deleteQuery = `
      DELETE FROM usuarios_departamentos 
      WHERE usuario_id = @usuario_id AND departamento_id = @departamento_id
    `;
    
    const result = await executeQuery(deleteQuery, { usuario_id, departamento_id });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Relação usuário-departamento não encontrada' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing user departamento:', error);
    res.status(500).json({ error: 'Erro ao remover departamento do usuário' });
  }
};

export const updateUserDepartamentos = async (req: Request, res: Response) => {
  try {
    const { usuario_id } = req.params;
    const { departamento_ids } = req.body;
    
    if (!Array.isArray(departamento_ids)) {
      return res.status(400).json({ error: 'departamento_ids deve ser um array' });
    }
    
    // Verify user exists and is adm_area
    const userQuery = `SELECT role FROM usuarios WHERE id = @usuario_id`;
    const userResult = await executeQuery(userQuery, { usuario_id });
    
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    if (userResult[0].role !== 'adm_area') {
      return res.status(400).json({ error: 'Apenas usuários adm_area podem ter múltiplos departamentos' });
    }
    
    // Delete existing relationships
    const deleteQuery = `DELETE FROM usuarios_departamentos WHERE usuario_id = @usuario_id`;
    await executeQuery(deleteQuery, { usuario_id });
    
    // Insert new relationships
    if (departamento_ids.length > 0) {
      const insertQuery = `
        INSERT INTO usuarios_departamentos (usuario_id, departamento_id)
        VALUES (@usuario_id, @departamento_id)
      `;
      
      for (const departamento_id of departamento_ids) {
        await executeQuery(insertQuery, { usuario_id, departamento_id });
      }
    }
    
    // Return updated list
    const updatedQuery = `
      SELECT 
        d.id, d.nome, d.sigla, d.created_at, d.updated_at
      FROM usuarios_departamentos ud
      INNER JOIN departamentos d ON ud.departamento_id = d.id
      WHERE ud.usuario_id = @usuario_id
      ORDER BY d.nome
    `;
    const updatedResults = await executeQuery(updatedQuery, { usuario_id });
    
    res.json(updatedResults);
  } catch (error) {
    console.error('Error updating user departamentos:', error);
    res.status(500).json({ error: 'Erro ao atualizar departamentos do usuário' });
  }
};
