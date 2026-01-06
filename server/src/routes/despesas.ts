import { Router } from 'express';
import {
  getAllDespesas,
  getDespesaById,
  createDespesa,
  updateDespesa,
  deleteDespesa
} from '../controllers/despesasController.js';

const router = Router();

router.get('/', getAllDespesas);
router.get('/:id', getDespesaById);
router.post('/', createDespesa);
router.put('/:id', updateDespesa);
router.delete('/:id', deleteDespesa);

export default router;
