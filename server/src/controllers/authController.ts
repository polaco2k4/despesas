import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const query = `
      SELECT 
        u.id, u.nome, u.email, u.role, u.departamento_id, u.password_hash,
        u.created_at, u.updated_at,
        d.id as 'departamento.id', d.nome as 'departamento.nome', 
        d.sigla as 'departamento.sigla', d.created_at as 'departamento.created_at',
        d.updated_at as 'departamento.updated_at'
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      WHERE u.email = @email
    `;
    
    const results = await executeQuery(query, { email });
    
    if (results.length === 0) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    
    const row = results[0];
    
    // Validação de senha em texto plano (temporário)
    // TODO: Implementar bcrypt.compare quando bcrypt funcionar
    if (row.password_hash !== password) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    
    // Remover password_hash da resposta
    const user = {
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
    
    console.log('Login successful for:', email);
    res.json({ user });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // Por enquanto, retornar null - implementar sessões depois
    res.json({ user: null });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário atual' });
  }
};
