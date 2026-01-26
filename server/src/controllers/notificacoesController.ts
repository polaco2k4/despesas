import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';

export const getNotificacoesByUsuario = async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;
    const { naoLidasApenas = 'false' } = req.query;
    
    console.log('🔍 Debug - getNotificacoesByUsuario called:', { usuarioId, naoLidasApenas });
    
    // Simple test query first
    const query = `
      SELECT TOP 5 
        n.id,
        n.titulo,
        n.mensagem,
        n.tipo,
        n.categoria,
        n.acao_id,
        n.lida,
        n.data_criacao,
        n.data_leitura
      FROM notificacoes n
      WHERE n.usuario_id = @usuarioId
      ORDER BY n.data_criacao DESC
    `;
    
    const result = await executeQuery(query, { usuarioId });
    console.log('🔍 Debug - Query result:', result);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
};

export const createNotificacao = async (req: Request, res: Response) => {
  try {
    const { usuario_id, titulo, mensagem, tipo, categoria, acao_id } = req.body;
    
    const query = `
      INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, categoria, acao_id)
      OUTPUT inserted.id, inserted.titulo, inserted.mensagem, inserted.tipo, inserted.categoria, inserted.acao_id, inserted.lida, inserted.data_criacao, inserted.data_leitura
      VALUES (@usuario_id, @titulo, @mensagem, @tipo, @categoria, @acao_id)
    `;
    
    const result = await executeQuery(query, { 
      usuario_id, 
      titulo, 
      mensagem, 
      tipo, 
      categoria, 
      acao_id: acao_id || null 
    });
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Erro ao criar notificação' });
  }
};

export const marcarComoLida = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { usuarioId } = req.body;
    
    const query = `
      UPDATE notificacoes 
      SET lida = 1, data_leitura = GETDATE()
      WHERE id = @id AND usuario_id = @usuarioId
    `;
    
    await executeQuery(query, { id, usuarioId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
  }
};

export const marcarTodasComoLidas = async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;
    
    const query = `
      UPDATE notificacoes 
      SET lida = 1, data_leitura = GETDATE()
      WHERE usuario_id = @usuarioId AND lida = 0
    `;
    
    await executeQuery(query, { usuarioId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Erro ao marcar todas as notificações como lidas' });
  }
};

export const deleteNotificacao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { usuarioId } = req.body;
    
    const query = `
      DELETE FROM notificacoes 
      WHERE id = @id AND usuario_id = @usuarioId
    `;
    
    await executeQuery(query, { id, usuarioId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Erro ao excluir notificação' });
  }
};

export const getContagemNaoLidas = async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;
    
    const query = `
      SELECT COUNT(*) as count
      FROM notificacoes 
      WHERE usuario_id = @usuarioId AND lida = 0
    `;
    
    const result = await executeQuery(query, { usuarioId });
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Erro ao buscar contagem de não lidas' });
  }
};

// Helper function to create notifications from other controllers
export const criarNotificacao = async (
  usuario_id: string,
  titulo: string,
  mensagem: string,
  tipo: 'info' | 'success' | 'warning' | 'error',
  categoria: 'despesa' | 'aprovacao' | 'sistema',
  acao_id?: string
) => {
  try {
    const query = `
      INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, categoria, acao_id)
      VALUES (@usuario_id, @titulo, @mensagem, @tipo, @categoria, @acao_id)
    `;
    
    await executeQuery(query, { 
      usuario_id, 
      titulo, 
      mensagem, 
      tipo, 
      categoria, 
      acao_id: acao_id || null 
    });
    
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};
