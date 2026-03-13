import express from 'express';
import { 
  getAllFornecedores, 
  createFornecedor, 
  updateFornecedor, 
  deleteFornecedor,
  addDocumentoFornecedor,
  downloadDocumentoFornecedor,
  removeDocumentoFornecedor,
  uploadDocumento
} from '../controllers/fornecedoresController.js';

const router = express.Router();

router.get('/', getAllFornecedores);
router.post('/', createFornecedor);
router.put('/:id', updateFornecedor);
router.delete('/:id', deleteFornecedor);

// Document routes
router.post('/:fornecedorId/documentos', uploadDocumento.single('documento'), addDocumentoFornecedor);
router.get('/:fornecedorId/documentos/:documentoId/download', downloadDocumentoFornecedor);
router.delete('/:fornecedorId/documentos/:documentoId', removeDocumentoFornecedor);

export default router;
