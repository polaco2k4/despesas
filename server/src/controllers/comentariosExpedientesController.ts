import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';

// Criar tabela se não existir
const ensureComentariosExpedientesTable = async () => {
  try {
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='comentarios_expedientes' AND xtype='U')
      CREATE TABLE comentarios_expedientes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        expediente_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        comentario NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        ativo BIT DEFAULT 1,
        
        FOREIGN KEY (expediente_id) REFERENCES expedientes(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `;
    
    await executeQuery(createTableQuery);
    
    // Criar índices se não existirem
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_expedientes_expediente_id')
      CREATE INDEX IX_comentarios_expedientes_expediente_id ON comentarios_expedientes(expediente_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_expedientes_usuario_id')
      CREATE INDEX IX_comentarios_expedientes_usuario_id ON comentarios_expedientes(usuario_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_expedientes_created_at')
      CREATE INDEX IX_comentarios_expedientes_created_at ON comentarios_expedientes(created_at DESC);
    `;
    
    await executeQuery(createIndexesQuery);
  } catch (error) {
    console.error('Erro ao criar tabela comentarios_expedientes:', error);
  }
};

// Verificar se usuário tem acesso ao expediente
const checkExpedienteAccess = async (expedienteId: string, userId: string, userRole: string, userDepartmentId?: string) => {
  try {
    let query = '';
    let params: any = { expedienteId, userId };

    if (userRole === 'admin') {
      // Admin tem acesso a todos os expedientes
      query = `
        SELECT COUNT(*) as count
        FROM expedientes
        WHERE id = @expedienteId AND ativo = 1
      `;
    } else if (userRole === 'adm_area') {
      // ADM_AREA tem acesso a expedientes públicos dos departamentos associados + próprios expedientes
      query = `
        SELECT COUNT(*) as count
        FROM expedientes e
        LEFT JOIN usuarios_departamentos ud ON ud.usuario_id = @userId
        WHERE e.id = @expedienteId 
          AND e.ativo = 1
          AND ((e.departamento_id IN (SELECT departamento_id FROM usuarios_departamentos WHERE usuario_id = @userId) AND e.publico = 1) 
               OR e.criado_por = @userId OR e.responsavel_id = @userId)
      `;
    } else {
      // Outros roles: acesso a expedientes públicos do próprio departamento + próprios expedientes + expedientes onde é responsável
      query = `
        SELECT COUNT(*) as count
        FROM expedientes e
        WHERE e.id = @expedienteId 
          AND e.ativo = 1
          AND ((e.departamento_id = @userDepartmentId AND e.publico = 1) 
               OR e.criado_por = @userId OR e.responsavel_id = @userId)
      `;
      params.userDepartmentId = userDepartmentId;
    }

    const results = await executeQuery(query, params);
    return results[0]?.count > 0;
  } catch (error) {
    console.error('Erro ao verificar acesso ao expediente:', error);
    return false;
  }
};

// Buscar comentários de um expediente
export const getComentariosByExpedienteId = async (req: Request, res: Response) => {
  try {
    await ensureComentariosExpedientesTable();
    
    const { expedienteId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;

    // Verificar se o usuário tem acesso ao expediente
    const hasAccess = await checkExpedienteAccess(expedienteId, userId, userRole, userDepartmentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado ao expediente' });
    }

    const query = `
      SELECT 
        c.id, c.expediente_id, c.usuario_id, c.comentario, c.created_at, c.updated_at,
        u.nome as usuario_nome, u.email as usuario_email, u.role as usuario_role
      FROM comentarios_expedientes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.expediente_id = @expedienteId AND c.ativo = 1
      ORDER BY c.created_at DESC
    `;
    
    const results = await executeQuery(query, { expedienteId });
    
    const comentarios = results.map((row: any) => ({
      id: row.id,
      expediente_id: row.expediente_id,
      usuario_id: row.usuario_id,
      comentario: row.comentario,
      created_at: row.created_at,
      updated_at: row.updated_at,
      usuario: {
        nome: row.usuario_nome,
        email: row.usuario_email,
        role: row.usuario_role
      }
    }));
    
    res.json(comentarios);
  } catch (error) {
    console.error('Error fetching comentarios expediente:', error);
    res.status(500).json({ error: 'Erro ao buscar comentários do expediente' });
  }
};

// Criar novo comentário
export const createComentario = async (req: Request, res: Response) => {
  try {
    await ensureComentariosExpedientesTable();
    
    const { expedienteId } = req.params;
    const { comentario } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;

    if (!comentario || comentario.trim().length === 0) {
      return res.status(400).json({ error: 'Comentário é obrigatório' });
    }

    // Verificar se o usuário tem acesso ao expediente
    const hasAccess = await checkExpedienteAccess(expedienteId, userId, userRole, userDepartmentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado ao expediente' });
    }

    // Verificar se o expediente está fechado e o usuário não é admin
    const expedienteQuery = `
      SELECT status FROM expedientes 
      WHERE id = @expedienteId AND ativo = 1
    `;
    const expedienteResult = await executeQuery(expedienteQuery, { expedienteId });
    
    if (expedienteResult.length === 0) {
      return res.status(404).json({ error: 'Expediente não encontrado' });
    }
    
    if (expedienteResult[0].status === 'fechado' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Não é possível comentar em expedientes fechados. Apenas administradores podem fazê-lo.' });
    }

    const query = `
      INSERT INTO comentarios_expedientes (expediente_id, usuario_id, comentario)
      OUTPUT INSERTED.id
      VALUES (@expedienteId, @userId, @comentario)
    `;
    
    const results = await executeQuery(query, {
      expedienteId,
      userId,
      comentario: comentario.trim()
    });

    const comentarioId = results[0].id;

    // Buscar o comentário criado com informações do usuário
    const selectQuery = `
      SELECT 
        c.id, c.expediente_id, c.usuario_id, c.comentario, c.created_at, c.updated_at,
        u.nome as usuario_nome, u.email as usuario_email, u.role as usuario_role
      FROM comentarios_expedientes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.id = @comentarioId
    `;

    const comentarioResults = await executeQuery(selectQuery, { comentarioId });
    const row = comentarioResults[0];

    const novoComentario = {
      id: row.id,
      expediente_id: row.expediente_id,
      usuario_id: row.usuario_id,
      comentario: row.comentario,
      created_at: row.created_at,
      updated_at: row.updated_at,
      usuario: {
        nome: row.usuario_nome,
        email: row.usuario_email,
        role: row.usuario_role
      }
    };

    res.status(201).json(novoComentario);
  } catch (error) {
    console.error('Error creating comentario:', error);
    res.status(500).json({ error: 'Erro ao criar comentário' });
  }
};

// Atualizar comentário (apenas o próprio usuário ou admin)
export const updateComentario = async (req: Request, res: Response) => {
  try {
    const { comentarioId } = req.params;
    const { comentario } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!comentario || comentario.trim().length === 0) {
      return res.status(400).json({ error: 'Comentário é obrigatório' });
    }

    // Verificar se o comentário existe e se o usuário pode editá-lo
    const checkQuery = `
      SELECT c.usuario_id, c.expediente_id, e.status
      FROM comentarios_expedientes c
      LEFT JOIN expedientes e ON c.expediente_id = e.id
      WHERE c.id = @comentarioId AND c.ativo = 1
    `;
    
    const checkResults = await executeQuery(checkQuery, { comentarioId });
    
    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    const comentarioUserId = checkResults[0].usuario_id;
    const expedienteStatus = checkResults[0].status;
    
    // Verificar se o expediente está fechado e o usuário não é admin
    if (expedienteStatus === 'fechado' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Não é possível editar comentários em expedientes fechados. Apenas administradores podem fazê-lo.' });
    }
    
    // Apenas o próprio usuário ou admin pode editar
    if (userRole !== 'admin' && comentarioUserId !== userId) {
      return res.status(403).json({ error: 'Acesso negado para editar este comentário' });
    }

    const updateQuery = `
      UPDATE comentarios_expedientes 
      SET comentario = @comentario, updated_at = GETDATE()
      WHERE id = @comentarioId
    `;
    
    await executeQuery(updateQuery, {
      comentarioId,
      comentario: comentario.trim()
    });

    // Buscar o comentário atualizado
    const selectQuery = `
      SELECT 
        c.id, c.expediente_id, c.usuario_id, c.comentario, c.created_at, c.updated_at,
        u.nome as usuario_nome, u.email as usuario_email, u.role as usuario_role
      FROM comentarios_expedientes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.id = @comentarioId
    `;

    const results = await executeQuery(selectQuery, { comentarioId });
    const row = results[0];

    const comentarioAtualizado = {
      id: row.id,
      expediente_id: row.expediente_id,
      usuario_id: row.usuario_id,
      comentario: row.comentario,
      created_at: row.created_at,
      updated_at: row.updated_at,
      usuario: {
        nome: row.usuario_nome,
        email: row.usuario_email,
        role: row.usuario_role
      }
    };

    res.json(comentarioAtualizado);
  } catch (error) {
    console.error('Error updating comentario:', error);
    res.status(500).json({ error: 'Erro ao atualizar comentário' });
  }
};

// Deletar comentário (apenas o próprio usuário ou admin)
export const deleteComentario = async (req: Request, res: Response) => {
  try {
    const { comentarioId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Verificar se o comentário existe e se o usuário pode deletá-lo
    const checkQuery = `
      SELECT c.usuario_id, c.expediente_id, e.status
      FROM comentarios_expedientes c
      LEFT JOIN expedientes e ON c.expediente_id = e.id
      WHERE c.id = @comentarioId AND c.ativo = 1
    `;
    
    const checkResults = await executeQuery(checkQuery, { comentarioId });
    
    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    const comentarioUserId = checkResults[0].usuario_id;
    const expedienteStatus = checkResults[0].status;
    
    // Verificar se o expediente está fechado e o usuário não é admin
    if (expedienteStatus === 'fechado' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Não é possível deletar comentários em expedientes fechados. Apenas administradores podem fazê-lo.' });
    }
    
    // Apenas o próprio usuário ou admin pode deletar
    if (userRole !== 'admin' && comentarioUserId !== userId) {
      return res.status(403).json({ error: 'Acesso negado para deletar este comentário' });
    }

    // Soft delete
    const deleteQuery = `
      UPDATE comentarios_expedientes 
      SET ativo = 0, updated_at = GETDATE()
      WHERE id = @comentarioId
    `;
    
    await executeQuery(deleteQuery, { comentarioId });

    res.json({ message: 'Comentário deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting comentario:', error);
    res.status(500).json({ error: 'Erro ao deletar comentário' });
  }
};
