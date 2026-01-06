import { executeQuery } from './sqlserver';
import type { Usuario } from '../types/database';

interface AuthSession {
  user: Usuario;
  token: string;
  expiresAt: Date;
}

let currentSession: AuthSession | null = null;

export const signIn = async (email: string, password: string): Promise<{ data: AuthSession | null; error: Error | null }> => {
  try {
    const query = `
      SELECT 
        u.id, u.nome, u.email, u.role, u.departamento_id, u.created_at, u.updated_at,
        d.id as 'departamento.id', d.nome as 'departamento.nome', 
        d.sigla as 'departamento.sigla', d.created_at as 'departamento.created_at',
        d.updated_at as 'departamento.updated_at'
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      WHERE u.email = @email AND u.password_hash = HASHBYTES('SHA2_256', @password)
    `;
    
    const results = await executeQuery(query, { email, password });
    
    if (results.length === 0) {
      return { data: null, error: new Error('Credenciais inválidas') };
    }
    
    const row = results[0];
    const user: Usuario = {
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
    
    const token = btoa(`${user.id}:${Date.now()}`);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    currentSession = { user, token, expiresAt };
    
    localStorage.setItem('auth_session', JSON.stringify(currentSession));
    
    return { data: currentSession, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
};

export const signOut = async (): Promise<{ error: Error | null }> => {
  try {
    currentSession = null;
    localStorage.removeItem('auth_session');
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
};

export const getCurrentUser = async (): Promise<Usuario | null> => {
  try {
    if (currentSession && currentSession.expiresAt > new Date()) {
      return currentSession.user;
    }
    
    const storedSession = localStorage.getItem('auth_session');
    if (storedSession) {
      const session: AuthSession = JSON.parse(storedSession);
      if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
        currentSession = session;
        return session.user;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

export const getCurrentUserProfile = async (): Promise<Usuario | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  
  try {
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
    
    const results = await executeQuery(query, { id: user.id });
    
    if (results.length === 0) return null;
    
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
  } catch (error) {
    return null;
  }
};

export const createUser = async (
  email: string,
  password: string,
  nome: string,
  role: string,
  departamento_id?: string
): Promise<{ data: Usuario | null; error: Error | null }> => {
  try {
    const query = `
      INSERT INTO usuarios (email, password_hash, nome, role, departamento_id)
      OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email, INSERTED.role, 
             INSERTED.departamento_id, INSERTED.created_at, INSERTED.updated_at
      VALUES (@email, HASHBYTES('SHA2_256', @password), @nome, @role, @departamento_id)
    `;
    
    const result = await executeQuery(query, {
      email,
      password,
      nome,
      role,
      departamento_id: departamento_id || null
    });
    
    return { data: result[0] as Usuario, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
};
