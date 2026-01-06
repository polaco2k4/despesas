import { Router } from 'express';
import {
  getAllAprovacoes,
  createAprovacao
} from '../controllers/aprovacoesController.js';

const router = Router();

router.get('/', getAllAprovacoes);
router.post('/', createAprovacao);

export default router;
