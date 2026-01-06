import { Router } from 'express';
import {
  getAllOrcamentos,
  getOrcamentoById,
  createOrcamento,
  updateOrcamento,
  deleteOrcamento
} from '../controllers/orcamentosController.js';

const router = Router();

router.get('/', getAllOrcamentos);
router.get('/:id', getOrcamentoById);
router.post('/', createOrcamento);
router.put('/:id', updateOrcamento);
router.delete('/:id', deleteOrcamento);

export default router;
