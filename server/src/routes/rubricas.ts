import { Router } from 'express';
import {
  getAllRubricas,
  getRubricasByOrcamento,
  createRubrica,
  updateRubrica,
  deleteRubrica
} from '../controllers/rubricasController.js';

const router = Router();

router.get('/', getAllRubricas);
router.get('/orcamento/:orcamentoId', getRubricasByOrcamento);
router.post('/', createRubrica);
router.put('/:id', updateRubrica);
router.delete('/:id', deleteRubrica);

export default router;
