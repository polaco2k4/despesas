import { Router } from 'express';
import {
  getAllContratos,
  getContratoById,
  createContrato,
  updateContrato,
  deleteContrato,
  getContratosStats,
  uploadAnexo,
  downloadAnexo,
  deleteAnexo,
  upload
} from '../controllers/contratosController.js';

const router = Router();

router.get('/', getAllContratos);
router.get('/stats', getContratosStats);
router.get('/:id', getContratoById);
router.get('/:id/download-anexo', downloadAnexo);
router.post('/', createContrato);
router.post('/:id/upload-anexo', upload.single('file'), uploadAnexo);
router.put('/:id', updateContrato);
router.delete('/:id', deleteContrato);
router.delete('/:id/anexo', deleteAnexo);

export default router;
