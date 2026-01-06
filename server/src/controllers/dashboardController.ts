import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { DashboardStats } from '../types/database.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { userId, userRole, departamentoId } = req.query;
    
    let whereClause = '';
    const params: Record<string, any> = {};
    
    if (userRole !== 'admin' && departamentoId) {
      whereClause = 'WHERE o.departamento_id = @departamento_id';
      params.departamento_id = departamentoId;
    }
    
    const query = `
      SELECT 
        (SELECT ISNULL(SUM(o.valor_total), 0) FROM orcamentos o ${whereClause}) as totalOrcamento,
        ISNULL(SUM(CASE WHEN d.status IN ('aprovada', 'paga') THEN d.valor ELSE 0 END), 0) as totalDespesas,
        ISNULL(SUM(CASE WHEN d.status = 'paga' THEN d.valor ELSE 0 END), 0) as totalPago,
        ISNULL(SUM(CASE WHEN d.status = 'pendente' THEN d.valor ELSE 0 END), 0) as totalPendente,
        ISNULL(SUM(CASE WHEN d.status = 'negada' THEN d.valor ELSE 0 END), 0) as totalNegado,
        ISNULL(SUM(CASE WHEN d.status = 'aprovada' THEN d.valor ELSE 0 END), 0) as totalAprovado,
        COUNT(CASE WHEN d.status = 'pendente' THEN 1 END) as despesasPendentes,
        COUNT(CASE WHEN d.status IN ('aprovada', 'paga') THEN 1 END) as despesasAprovadas,
        COUNT(CASE WHEN d.status = 'negada' THEN 1 END) as despesasNegadas
      FROM despesas d
      LEFT JOIN rubricas r ON d.rubrica_id = r.id
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      ${whereClause ? whereClause.replace('o.departamento_id', 'o.departamento_id') : ''}
    `;
    
    const result = await executeQuery(query, params);
    const row = result[0];
    
    const totalOrcamento = row.totalOrcamento || 0;
    const totalDespesas = row.totalDespesas || 0;
    const utilizacaoOrcamento = totalOrcamento > 0 ? (totalDespesas / totalOrcamento) * 100 : 0;
    
    const stats: DashboardStats = {
      totalOrcamento,
      totalDespesas,
      totalPago: row.totalPago || 0,
      totalPendente: row.totalPendente || 0,
      totalNegado: row.totalNegado || 0,
      totalAprovado: row.totalAprovado || 0,
      despesasPendentes: row.despesasPendentes || 0,
      despesasAprovadas: row.despesasAprovadas || 0,
      despesasNegadas: row.despesasNegadas || 0,
      utilizacaoOrcamento
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard' });
  }
};
