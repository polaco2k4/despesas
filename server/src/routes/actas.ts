import { Router } from 'express';
import {
  getAllReunioes,
  getReuniaoById,
  createReuniao,
  updateReuniao,
  deleteReuniao,
  updateReuniaoLink,
  getAllActas,
  getActaById,
  createActa,
  updateActa,
  deleteActa,
  getAllAcoes,
  createAcao,
  updateAcao,
  deleteAcao
} from '../controllers/actasController.js';

const router = Router();

router.get('/reunioes', getAllReunioes);
router.get('/reunioes/:id', getReuniaoById);
router.post('/reunioes', createReuniao);
router.put('/reunioes/:id', updateReuniao);
router.delete('/reunioes/:id', deleteReuniao);
router.post('/reunioes/:id/link', updateReuniaoLink);

router.get('/actas', getAllActas);
router.get('/actas/:id', getActaById);
router.post('/actas', createActa);
router.put('/actas/:id', updateActa);
router.delete('/actas/:id', deleteActa);

router.get('/acoes', getAllAcoes);
router.post('/acoes', createAcao);
router.put('/acoes/:id', updateAcao);
router.delete('/acoes/:id', deleteAcao);

export default router;
