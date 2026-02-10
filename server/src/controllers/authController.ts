import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import { createADAuthService } from '../services/adAuthService.js';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Primeiro, tenta autenticação AD
    const adAuthService = createADAuthService();
    const adUser = await adAuthService.authenticateUser(email, password);
    
    if (adUser) {
      console.log('🔐 AD Authentication successful for:', email);
      
      // Busca ou cria usuário no banco local
      let localUser = await findOrCreateLocalUser(adUser);
      
      if (localUser) {
        return res.json({ user: localUser });
      }
    }

    // Se AD falhar, tenta autenticação local (fallback)
    console.log('🔄 Falling back to local authentication for:', email);
    
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
      console.log('User not found in local database:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    
    const row = results[0];
    
    // Validação de senha local
    if (row.password_hash !== password) {
      console.log('Invalid local password for:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    
    // Busca departamentos do usuário
    const userWithDepartments = await buildUserWithDepartments(row);
    
    console.log('Local authentication successful for:', email);
    return res.json({ user: userWithDepartments });
    
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

/**
 * Busca ou cria usuário local baseado nos dados do AD
 */
async function findOrCreateLocalUser(adUser: any): Promise<any> {
  try {
    // Busca usuário existente
    const existingUserQuery = `
      SELECT 
        u.id, u.nome, u.email, u.role, u.departamento_id,
        u.created_at, u.updated_at,
        d.id as 'departamento.id', d.nome as 'departamento.nome', 
        d.sigla as 'departamento.sigla', d.created_at as 'departamento.created_at',
        d.updated_at as 'departamento.updated_at'
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      WHERE u.email = @email
    `;
    
    const existingResults = await executeQuery(existingUserQuery, { email: adUser.email });
    
    if (existingResults.length > 0) {
      // Usuário já existe, atualiza informações se necessário
      const row = existingResults[0];
      
      if (row.nome !== adUser.displayName) {
        await executeQuery(
          'UPDATE usuarios SET nome = @nome, updated_at = GETDATE() WHERE id = @id',
          { nome: adUser.displayName, id: row.id }
        );
        row.nome = adUser.displayName;
      }
      
      return await buildUserWithDepartments(row);
    } else {
      // Cria novo usuário
      console.log('🆕 Creating new user from AD:', adUser.email);
      
      // Busca departamento padrão (primeiro disponível)
      const defaultDeptQuery = 'SELECT TOP 1 id FROM departamentos ORDER BY nome';
      const deptResults = await executeQuery(defaultDeptQuery, {});
      const defaultDeptId = deptResults.length > 0 ? deptResults[0].id : null;
      
      const insertQuery = `
        INSERT INTO usuarios (nome, email, role, departamento_id, password_hash, created_at, updated_at)
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email, INSERTED.role, 
               INSERTED.departamento_id, INSERTED.created_at, INSERTED.updated_at
        VALUES (@nome, @email, @role, @departamento_id, @password_hash, GETDATE(), GETDATE())
      `;
      
      const insertResults = await executeQuery(insertQuery, {
        nome: adUser.displayName,
        email: adUser.email,
        role: 'colaborador', // Role padrão para usuários AD
        departamento_id: defaultDeptId,
        password_hash: '' // Usuários AD não precisam de senha local
      });
      
      if (insertResults.length > 0) {
        const newUser = insertResults[0];
        return await buildUserWithDepartments(newUser);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding/creating local user:', error);
    return null;
  }
}

/**
 * Constrói objeto do usuário com departamentos
 */
async function buildUserWithDepartments(row: any): Promise<any> {
  try {
    let departamentos: Array<{
      id: string;
      nome: string;
      sigla: string;
      created_at: Date;
      updated_at: Date;
    }> = [];
    
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
      
      departamentos = deptResults.map((deptRow: any) => ({
        id: deptRow.id,
        nome: deptRow.nome,
        sigla: deptRow.sigla,
        created_at: deptRow.created_at,
        updated_at: deptRow.updated_at
      }));
    } else if (row['departamento.id']) {
      departamentos = [{
        id: row['departamento.id'],
        nome: row['departamento.nome'],
        sigla: row['departamento.sigla'],
        created_at: row['departamento.created_at'],
        updated_at: row['departamento.updated_at']
      }];
    }
    
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      role: row.role,
      departamento_id: row.departamento_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      departamentos: departamentos,
      departamento: departamentos.length > 0 ? departamentos[0] : undefined
    };
  } catch (error) {
    console.error('Error building user with departments:', error);
    return null;
  }
}

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // Por enquanto, retornar null - implementar sessões depois
    res.json({ user: null });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário atual' });
  }
};
