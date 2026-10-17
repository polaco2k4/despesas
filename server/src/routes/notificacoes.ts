import { Router } from 'express';
import {
  getNotificacoesByUsuario,
  createNotificacao,
  marcarComoLida,
  marcarTodasComoLidas,
  deleteNotificacao,
  getContagemNaoLidas
} from '../controllers/notificacoesController.js';
import { requireSelf } from '../middleware/requireAuth.js';

const router = Router();

// Get unread count for a user (more specific route first)
router.get('/usuario/:usuarioId/nao-lidas', requireSelf('usuarioId'), getContagemNaoLidas);

// Get notifications for a user
router.get('/usuario/:usuarioId', requireSelf('usuarioId'), getNotificacoesByUsuario);

// Mark all notifications as read for user
router.patch('/usuario/:usuarioId/marcar-todas-lidas', requireSelf('usuarioId'), marcarTodasComoLidas);

// Create notification
router.post('/', createNotificacao);

// Mark notification as read
router.patch('/:id/marcar-lida', marcarComoLida);

// Delete notification
router.delete('/:id', deleteNotificacao);

export default router;
