import { Router } from 'express';
import {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  resetPassword
} from '../controllers/usuariosController.js';
import { requireAdmin } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', getAllUsuarios);
router.get('/:id', getUsuarioById);
router.post('/', requireAdmin, createUsuario);
router.put('/:id', requireAdmin, updateUsuario);
router.put('/:id/password', requireAdmin, resetPassword);
router.delete('/:id', requireAdmin, deleteUsuario);

export default router;
