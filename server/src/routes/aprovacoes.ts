import { Router } from 'express';
import {
  getAllAprovacoes,
  createAprovacao,
  getAprovacoesConfig
} from '../controllers/aprovacoesController.js';

const router = Router();

router.get('/config', getAprovacoesConfig);
router.get('/', getAllAprovacoes);
router.post('/', createAprovacao);

export default router;
