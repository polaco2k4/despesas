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

export default router;
