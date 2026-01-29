import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';

// Criar tabela se não existir
const ensureComentariosDocumentosTable = async () => {
  try {
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='comentarios_documentos' AND xtype='U')
      CREATE TABLE comentarios_documentos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        documento_id UNIQUEIDENTIFIER NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        comentario NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        ativo BIT DEFAULT 1,
        
        FOREIGN KEY (documento_id) REFERENCES documentos(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `;
    
    await executeQuery(createTableQuery);
    
    // Criar índices se não existirem
    const createIndexesQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_documentos_documento_id')
      CREATE INDEX IX_comentarios_documentos_documento_id ON comentarios_documentos(documento_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_documentos_usuario_id')
      CREATE INDEX IX_comentarios_documentos_usuario_id ON comentarios_documentos(usuario_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_comentarios_documentos_created_at')
      CREATE INDEX IX_comentarios_documentos_created_at ON comentarios_documentos(created_at DESC);
    `;
    
    await executeQuery(createIndexesQuery);
  } catch (error) {
    console.error('Erro ao criar tabela comentarios_documentos:', error);
  }
};

// Verificar se usuário tem acesso ao documento
const checkDocumentAccess = async (documentoId: string, userId: string, userRole: string, userDepartmentId?: string) => {
  try {
    let query = '';
    let params: any = { documentoId, userId };

    if (userRole === 'admin') {
      // Admin tem acesso a todos os documentos
      query = `
        SELECT COUNT(*) as count
        FROM documentos
        WHERE id = @documentoId AND ativo = 1
      `;
    } else if (userRole === 'adm_area') {
      // ADM_AREA tem acesso a documentos públicos dos departamentos associados + próprios documentos
      query = `
        SELECT COUNT(*) as count
        FROM documentos d
        LEFT JOIN usuarios_departamentos ud ON ud.usuario_id = @userId
        WHERE d.id = @documentoId 
          AND d.ativo = 1
          AND ((d.departamento_id IN (SELECT departamento_id FROM usuarios_departamentos WHERE usuario_id = @userId) AND d.publico = 1) 
               OR d.criado_por = @userId)
      `;
    } else {
      // Outros roles: acesso a documentos públicos do próprio departamento + próprios documentos
      query = `
        SELECT COUNT(*) as count
        FROM documentos d
        WHERE d.id = @documentoId 
          AND d.ativo = 1
          AND ((d.departamento_id = @userDepartmentId AND d.publico = 1) 
               OR d.criado_por = @userId)
      `;
      params.userDepartmentId = userDepartmentId;
    }

    const results = await executeQuery(query, params);
    return results[0]?.count > 0;
  } catch (error) {
    console.error('Erro ao verificar acesso ao documento:', error);
    return false;
  }
};

// Buscar comentários de um documento
export const getComentariosByDocumentoId = async (req: Request, res: Response) => {
  try {
    await ensureComentariosDocumentosTable();
    
    const { documentoId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;

    // Verificar se o usuário tem acesso ao documento
    const hasAccess = await checkDocumentAccess(documentoId, userId, userRole, userDepartmentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado ao documento' });
    }

    const query = `
      SELECT 
        c.id, c.documento_id, c.usuario_id, c.comentario, c.created_at, c.updated_at,
        u.nome as usuario_nome, u.email as usuario_email, u.role as usuario_role
      FROM comentarios_documentos c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.documento_id = @documentoId AND c.ativo = 1
      ORDER BY c.created_at DESC
    `;
    
    const results = await executeQuery(query, { documentoId });
    
    const comentarios = results.map((row: any) => ({
      id: row.id,
      documento_id: row.documento_id,
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
    console.error('Error fetching comentarios documento:', error);
    res.status(500).json({ error: 'Erro ao buscar comentários do documento' });
  }
};

// Criar novo comentário
export const createComentario = async (req: Request, res: Response) => {
  try {
    await ensureComentariosDocumentosTable();
    
    const { documentoId } = req.params;
    const { comentario } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;

    if (!comentario || comentario.trim().length === 0) {
      return res.status(400).json({ error: 'Comentário é obrigatório' });
    }

    // Verificar se o usuário tem acesso ao documento
    const hasAccess = await checkDocumentAccess(documentoId, userId, userRole, userDepartmentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado ao documento' });
    }

    const query = `
      INSERT INTO comentarios_documentos (documento_id, usuario_id, comentario)
      OUTPUT INSERTED.id
      VALUES (@documentoId, @userId, @comentario)
    `;
    
    const results = await executeQuery(query, {
      documentoId,
      userId,
      comentario: comentario.trim()
    });

    const comentarioId = results[0].id;

    // Buscar o comentário criado com informações do usuário
    const selectQuery = `
      SELECT 
        c.id, c.documento_id, c.usuario_id, c.comentario, c.created_at, c.updated_at,
        u.nome as usuario_nome, u.email as usuario_email, u.role as usuario_role
      FROM comentarios_documentos c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.id = @comentarioId
    `;

    const comentarioResults = await executeQuery(selectQuery, { comentarioId });
    const row = comentarioResults[0];

    const novoComentario = {
      id: row.id,
      documento_id: row.documento_id,
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
      SELECT usuario_id FROM comentarios_documentos 
      WHERE id = @comentarioId AND ativo = 1
    `;
    
    const checkResults = await executeQuery(checkQuery, { comentarioId });
    
    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    const comentarioUserId = checkResults[0].usuario_id;
    
    // Apenas o próprio usuário ou admin pode editar
    if (userRole !== 'admin' && comentarioUserId !== userId) {
      return res.status(403).json({ error: 'Acesso negado para editar este comentário' });
    }

    const updateQuery = `
      UPDATE comentarios_documentos 
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
        c.id, c.documento_id, c.usuario_id, c.comentario, c.created_at, c.updated_at,
        u.nome as usuario_nome, u.email as usuario_email, u.role as usuario_role
      FROM comentarios_documentos c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.id = @comentarioId
    `;

    const results = await executeQuery(selectQuery, { comentarioId });
    const row = results[0];

    const comentarioAtualizado = {
      id: row.id,
      documento_id: row.documento_id,
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

// Deletar comentário (soft delete - apenas o próprio usuário ou admin)
export const deleteComentario = async (req: Request, res: Response) => {
  try {
    const { comentarioId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Verificar se o comentário existe e se o usuário pode deletá-lo
    const checkQuery = `
      SELECT usuario_id FROM comentarios_documentos 
      WHERE id = @comentarioId AND ativo = 1
    `;
    
    const checkResults = await executeQuery(checkQuery, { comentarioId });
    
    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    const comentarioUserId = checkResults[0].usuario_id;
    
    // Apenas o próprio usuário ou admin pode deletar
    if (userRole !== 'admin' && comentarioUserId !== userId) {
      return res.status(403).json({ error: 'Acesso negado para deletar este comentário' });
    }

    const deleteQuery = `
      UPDATE comentarios_documentos 
      SET ativo = 0, updated_at = GETDATE()
      WHERE id = @comentarioId
    `;
    
    await executeQuery(deleteQuery, { comentarioId });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting comentario:', error);
    res.status(500).json({ error: 'Erro ao deletar comentário' });
  }
};
