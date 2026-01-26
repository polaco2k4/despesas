import { Router } from 'express';
import {
  getNotificacoesByUsuario,
  createNotificacao,
  marcarComoLida,
  marcarTodasComoLidas,
  deleteNotificacao,
  getContagemNaoLidas
} from '../controllers/notificacoesController.js';

const router = Router();

// Get unread count for a user (more specific route first)
router.get('/usuario/:usuarioId/nao-lidas', getContagemNaoLidas);

// Get notifications for a user
router.get('/usuario/:usuarioId', getNotificacoesByUsuario);

// Mark all notifications as read for user
router.patch('/usuario/:usuarioId/marcar-todas-lidas', marcarTodasComoLidas);

// Create notification
router.post('/', createNotificacao);

// Mark notification as read
router.patch('/:id/marcar-lida', marcarComoLida);

// Delete notification
router.delete('/:id', deleteNotificacao);

export default router;
