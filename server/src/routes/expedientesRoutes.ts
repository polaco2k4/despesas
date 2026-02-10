import { Router } from 'express';
import {
  getAllExpedientes,
  getExpedienteById,
  createExpediente,
  updateExpediente,
  deleteExpediente,
  getExpedienteDocumentos,
  addDocumentoToExpediente,
  removeDocumentoFromExpediente
} from '../controllers/expedientesController.js';
import { getHistoricoByExpedienteId } from '../controllers/historicoExpedientesController.js';
import { getComentariosByExpedienteId, createComentario, updateComentario, deleteComentario } from '../controllers/comentariosExpedientesController.js';

const router = Router();

// Expedientes CRUD
router.get('/', getAllExpedientes);
router.get('/:id', getExpedienteById);
router.post('/', createExpediente);
router.put('/:id', updateExpediente);
router.delete('/:id', deleteExpediente);

// Document management for expedientes
router.get('/:expedienteId/documentos', getExpedienteDocumentos);
router.post('/:expedienteId/documentos', addDocumentoToExpediente);
router.delete('/:expedienteId/documentos/:documentoId', removeDocumentoFromExpediente);

// History and comments
router.get('/:expedienteId/historico', getHistoricoByExpedienteId);
router.get('/:expedienteId/comentarios', getComentariosByExpedienteId);
router.post('/:expedienteId/comentarios', createComentario);
router.put('/comentarios/:comentarioId', updateComentario);
router.delete('/comentarios/:comentarioId', deleteComentario);

export default router;
