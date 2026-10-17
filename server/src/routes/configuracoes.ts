import { Router } from 'express';
import {
  getPublicConfig,
  uploadImagem,
  deleteImagem,
  uploadImagemMiddleware
} from '../controllers/configuracoesController.js';

const router = Router();

router.get('/publicas', getPublicConfig);
// :tipo = 'logo' | 'fundo'
router.post('/imagens/:tipo', uploadImagemMiddleware, uploadImagem);
router.delete('/imagens/:tipo', deleteImagem);

export default router;
