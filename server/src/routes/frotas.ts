import { Router } from 'express';
import {
  getAllVeiculos,
  getVeiculoById,
  createVeiculo,
  updateVeiculo,
  deleteVeiculo,
  getAllManutencoes,
  createManutencao,
  updateManutencao,
  deleteManutencao,
  getAllAbastecimentos,
  createAbastecimento,
  updateAbastecimento,
  deleteAbastecimento,
  getAllAtribuicoes,
  createAtribuicao,
  updateAtribuicao,
  deleteAtribuicao,
  getAllSolicitacoes,
  createSolicitacao,
  updateSolicitacao,
  deleteSolicitacao,
  getVeiculoStats
} from '../controllers/frotasController.js';

const router = Router();

router.get('/veiculos', getAllVeiculos);
router.get('/veiculos/:id', getVeiculoById);
router.post('/veiculos', createVeiculo);
router.put('/veiculos/:id', updateVeiculo);
router.delete('/veiculos/:id', deleteVeiculo);
router.get('/veiculos/:id/stats', getVeiculoStats);

router.get('/manutencoes', getAllManutencoes);
router.post('/manutencoes', createManutencao);
router.put('/manutencoes/:id', updateManutencao);
router.delete('/manutencoes/:id', deleteManutencao);

router.get('/abastecimentos', getAllAbastecimentos);
router.post('/abastecimentos', createAbastecimento);
router.put('/abastecimentos/:id', updateAbastecimento);
router.delete('/abastecimentos/:id', deleteAbastecimento);

router.get('/atribuicoes', getAllAtribuicoes);
router.post('/atribuicoes', createAtribuicao);
router.put('/atribuicoes/:id', updateAtribuicao);
router.delete('/atribuicoes/:id', deleteAtribuicao);

router.get('/solicitacoes', getAllSolicitacoes);
router.post('/solicitacoes', createSolicitacao);
router.put('/solicitacoes/:id', updateSolicitacao);
router.delete('/solicitacoes/:id', deleteSolicitacao);

export default router;
