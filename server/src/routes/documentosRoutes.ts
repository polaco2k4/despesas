import { Router } from 'express';
import {
  getAllDocumentos,
  getDocumentoById,
  createDocumento,
  updateDocumento,
  deleteDocumento,
  downloadDocumento,
  upload
} from '../controllers/documentosController.js';

const router = Router();

router.get('/', getAllDocumentos);
router.get('/:id', getDocumentoById);
router.post('/', upload.single('file'), createDocumento);
router.put('/:id', updateDocumento);
router.delete('/:id', deleteDocumento);
router.get('/:filename/download', downloadDocumento);

export default router;
