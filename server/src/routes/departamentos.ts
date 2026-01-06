import { Router } from 'express';
import {
  getAllDepartamentos,
  createDepartamento,
  updateDepartamento,
  deleteDepartamento
} from '../controllers/departamentosController.js';

const router = Router();

router.get('/', getAllDepartamentos);
router.post('/', createDepartamento);
router.put('/:id', updateDepartamento);
router.delete('/:id', deleteDepartamento);

export default router;
