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
router.get('/:id', getDocumentoById);
router.get('/:documentoId/historico', getHistoricoByDocumentoId);
router.post('/', upload.single('file'), createDocumento);
router.put('/:id', updateDocumento);
router.delete('/:id', deleteDocumento);

router.get('/:documentoId/comentarios', getComentariosByDocumentoId);
router.post('/:documentoId/comentarios', createComentario);
router.put('/comentarios/:comentarioId', updateComentario);
router.delete('/comentarios/:comentarioId', deleteComentario);

export default router;
