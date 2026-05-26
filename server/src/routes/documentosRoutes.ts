import { Router } from 'express';
import {
  getAllDocumentos,
  getDocumentoById,
  createDocumento,
  updateDocumento,
  deleteDocumento,
  downloadDocumento,
  downloadDocumentoById,
  upload
} from '../controllers/documentosController.js';
import { getHistoricoByDocumentoId } from '../controllers/historicoDocumentosController.js';
import { getComentariosByDocumentoId, createComentario, updateComentario, deleteComentario } from '../controllers/comentariosDocumentosController.js';

const router = Router();

router.get('/', getAllDocumentos);
router.get('/download/:filename', downloadDocumento);
router.get('/download-by-id/:id', downloadDocumentoById);
router.get('/:documentoId/historico', getHistoricoByDocumentoId);
router.get('/:documentoId/comentarios', getComentariosByDocumentoId);
router.post('/:documentoId/comentarios', createComentario);
router.put('/comentarios/:comentarioId', updateComentario);
router.delete('/comentarios/:comentarioId', deleteComentario);
router.get('/:id', getDocumentoById);
router.post('/', upload.single('file'), createDocumento);
router.put('/:id', upload.single('file'), updateDocumento);
router.delete('/:id', deleteDocumento);

export default router;
