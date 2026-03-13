import express from 'express';
import { 
  getAllCategorias, 
  createCategoria, 
  updateCategoria, 
  deleteCategoria 
} from '../controllers/categoriasFornecedoresController.js';

const router = express.Router();

router.get('/', getAllCategorias);
router.post('/', createCategoria);
router.put('/:id', updateCategoria);
router.delete('/:id', deleteCategoria);

export default router;
