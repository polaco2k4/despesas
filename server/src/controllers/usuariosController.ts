import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { Usuario } from '../types/database.js';

export const getAllUsuarios = async (req: Request, res: Response) => {
  try {
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
    
    const usuarios = await Promise.all(results.map(async (row: any) => {
      const usuario: any = {
        id: row.id,
        nome: row.nome,
        email: row.email,
        role: row.role,
        departamento_id: row.departamento_id,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      // For adm_area users, get all their departments
      if (row.role === 'adm_area') {
        const deptQuery = `
          SELECT 
            d.id, d.nome, d.sigla, d.created_at, d.updated_at
          FROM usuarios_departamentos ud
          INNER JOIN departamentos d ON ud.departamento_id = d.id
          WHERE ud.usuario_id = @usuario_id
          ORDER BY d.nome
        `;
        const deptResults = await executeQuery(deptQuery, { usuario_id: row.id });
        usuario.departamentos = deptResults.map((deptRow: any) => ({
          id: deptRow.id,
          nome: deptRow.nome,
          sigla: deptRow.sigla,
          created_at: deptRow.created_at,
          updated_at: deptRow.updated_at
        }));
        usuario.departamento = usuario.departamentos.length > 0 ? usuario.departamentos[0] : undefined;
      } else {
        // For other roles, use their single department
        usuario.departamento = row['departamento.id'] ? {
          id: row['departamento.id'],
          nome: row['departamento.nome'],
          sigla: row['departamento.sigla'],
          created_at: row['departamento.created_at'],
          updated_at: row['departamento.updated_at']
        } : undefined;
        usuario.departamentos = usuario.departamento ? [usuario.departamento] : [];
      }

      return usuario;
    }));
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error fetching usuarios:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};

export const getUsuarioById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
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
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const row = results[0];
    const usuario = {
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
    
    res.json(usuario);
  } catch (error) {
    console.error('Error fetching usuario:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

export const createUsuario = async (req: Request, res: Response) => {
  try {
    const { nome, email, role, departamento_id, password_hash } = req.body;
    
    console.log('Creating usuario with data:', { nome, email, role, departamento_id, password_hash: '***' });
    
    if (!nome || !email || !role) {
      return res.status(400).json({ error: 'Nome, email e role são obrigatórios' });
    }

    if (!password_hash) {
      return res.status(400).json({ error: 'Senha é obrigatória' });
    }

    // Validar se o role é permitido
    const validRoles = ['admin', 'gestor', 'colaborador', 'adm_area'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role inválido. Roles permitidos: admin, gestor, colaborador, adm_area' });
    }

    // Temporariamente usando senha em texto plano até resolver problema com bcrypt
    // TODO: Implementar hash com bcrypt quando módulo funcionar
    const query = `
      INSERT INTO usuarios (nome, email, role, departamento_id, password_hash)
      OUTPUT INSERTED.id
      VALUES (@nome, @email, @role, @departamento_id, @password_hash)
    `;
    
    const result = await executeQuery<{ id: string }>(query, {
      nome,
      email,
      role,
      departamento_id: departamento_id || null,
      password_hash: password_hash
    });
    
    console.log('Usuario created with id:', result[0].id);
    
    const usuario = await getUsuarioByIdInternal(result[0].id);
    res.status(201).json(usuario);
  } catch (error) {
    console.error('Error creating usuario:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

export const updateUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
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
      // Validar se o role é permitido
      const validRoles = ['admin', 'gestor', 'colaborador', 'adm_area'];
      if (!validRoles.includes(updates.role)) {
        return res.status(400).json({ error: 'Role inválido. Roles permitidos: admin, gestor, colaborador, adm_area' });
      }
      fields.push('role = @role');
      params.role = updates.role;
    }
    if (updates.departamento_id !== undefined) {
      fields.push('departamento_id = @departamento_id');
      params.departamento_id = updates.departamento_id;
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE usuarios
      SET ${fields.join(', ')}, updated_at = GETDATE()
      WHERE id = @id
    `;
    await executeQuery(query, params);
    
    const usuario = await getUsuarioByIdInternal(id);
    res.json(usuario);
  } catch (error) {
    console.error('Error updating usuario:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

export const deleteUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se usuário existe
    const checkUserQuery = `SELECT id, nome FROM usuarios WHERE id = @id`;
    const userResults = await executeQuery(checkUserQuery, { id });
    
    if (userResults.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar dependências - despesas criadas pelo usuário
    const checkDespesasQuery = `SELECT COUNT(*) as count FROM despesas WHERE usuario_id = @id`;
    const despesasResults = await executeQuery(checkDespesasQuery, { id });
    const despesasCount = despesasResults[0].count;

    // Verificar dependências - aprovações feitas pelo usuário
    const checkAprovacoesQuery = `SELECT COUNT(*) as count FROM aprovacoes WHERE aprovado_por = @id`;
    const aprovacoesResults = await executeQuery(checkAprovacoesQuery, { id });
    const aprovacoesCount = aprovacoesResults[0].count;

    // Se houver dependências, retornar erro informativo
    if (despesasCount > 0 || aprovacoesCount > 0) {
      const dependencies = [];
      if (despesasCount > 0) dependencies.push(`${despesasCount} despesa(s)`);
      if (aprovacoesCount > 0) dependencies.push(`${aprovacoesCount} aprovação(ões)`);
      
      return res.status(400).json({ 
        error: 'Não é possível deletar este usuário',
        details: `O usuário possui ${dependencies.join(' e ')} associadas. Para deletar, primeiro remova ou transfira essas dependências.`,
        dependencies: {
          despesas: despesasCount,
          aprovacoes: aprovacoesCount
        }
      });
    }

    // Deletar relacionamentos em usuarios_departamentos se existirem
    const deleteUserDeptsQuery = `DELETE FROM usuarios_departamentos WHERE usuario_id = @id`;
    await executeQuery(deleteUserDeptsQuery, { id });

    // Deletar notificações do usuário se existirem
    const deleteNotificationsQuery = `DELETE FROM notificacoes WHERE usuario_id = @id`;
    await executeQuery(deleteNotificationsQuery, { id });

    // Agora pode deletar o usuário
    const deleteQuery = `DELETE FROM usuarios WHERE id = @id`;
    await executeQuery(deleteQuery, { id });
    
    console.log(`✅ Usuário ${userResults[0].nome} (${id}) deletado com sucesso`);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting usuario:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário', details: error instanceof Error ? error.message : 'Erro desconhecido' });
  }
};

async function getUsuarioByIdInternal(id: string): Promise<Usuario> {
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
}
