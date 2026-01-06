import express from 'express';
import { 
  getAllFornecedores, 
  createFornecedor, 
  updateFornecedor, 
  deleteFornecedor 
} from '../controllers/fornecedoresController.js';

const router = express.Router();

router.get('/', getAllFornecedores);
router.post('/', createFornecedor);
router.put('/:id', updateFornecedor);
router.delete('/:id', deleteFornecedor);

export default router;
