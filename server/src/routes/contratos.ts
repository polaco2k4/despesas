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
  upload,
  verificarContratosVencimento,
  processarRenovacaoAutomatica,
  renovarContrato
} from '../controllers/contratosController.js';

const router = Router();

router.get('/', getAllContratos);
router.get('/stats', getContratosStats);
router.get('/alertas-vencimento', verificarContratosVencimento);
router.get('/:id', getContratoById);
router.get('/:id/download-anexo', downloadAnexo);
router.post('/', createContrato);
router.post('/processar-renovacao', processarRenovacaoAutomatica);
router.post('/:id/renovar', renovarContrato);
router.post('/:id/upload-anexo', upload.single('file'), uploadAnexo);
router.put('/:id', updateContrato);
router.delete('/:id', deleteContrato);
router.delete('/:id/anexo', deleteAnexo);

export default router;
