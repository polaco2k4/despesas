import { Router } from 'express';
import {
  getUserDepartamentos,
  addUserDepartamento,
  removeUserDepartamento,
  updateUserDepartamentos
} from '../controllers/usuariosDepartamentosController.js';
import { requireAdmin } from '../middleware/requireAuth.js';

const router = Router();

// Get all departments for a user
router.get('/usuarios/:usuario_id/departamentos', getUserDepartamentos);

// Add a department to a user
router.post('/usuarios/:usuario_id/departamentos', requireAdmin, addUserDepartamento);

// Remove a department from a user
router.delete('/usuarios/:usuario_id/departamentos/:departamento_id', requireAdmin, removeUserDepartamento);

// Update all departments for a user
router.put('/usuarios/:usuario_id/departamentos', requireAdmin, updateUserDepartamentos);

export default router;
