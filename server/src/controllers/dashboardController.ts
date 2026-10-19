import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { DashboardStats } from '../types/database.js';
import { getAuthUser } from '../middleware/requireAuth.js';
import { getPlaneamentoDeptId, sameGuid } from './aprovacoesController.js';

// Perfil e departamento vêm do token; gestores e colaboradores só veem o próprio departamento
const getDashboardScope = (req: Request) => {
  const { role, departamento_id } = getAuthUser(req);
  const restrito = role === 'gestor' || role === 'colaborador';
  return {
    userRole: role,
    departamentoId: restrito || req.query.departamentoId ? departamento_id : undefined
  };
};

// Filtros de "pendentes" e "pagas" de acordo com o perfil:
// - admin: todas as despesas em qualquer fase de aprovação
// - gestor: as que aguardam a sua aprovação (nível 1 do seu departamento; nível 2 se for de Planeamento)
// - adm_area: as que aguardam aprovação de nível 3 nos departamentos que gere
// - colaborador: as suas próprias despesas
const getPendentesPagasScope = (req: Request) => {
  const { id, role, departamento_id } = getAuthUser(req);
  const params: Record<string, any> = {};
  let pendentesWhere = "d.status IN ('pendente_gestor', 'pendente_admin', 'pendente_adm_area')";
  let pagasWhere = "d.status = 'paga'";

  if (role === 'gestor') {
    params.departamento_id = departamento_id;
    const nivel1 = "(d.status = 'pendente_gestor' AND o.departamento_id = @departamento_id)";
    pendentesWhere = sameGuid(departamento_id, getPlaneamentoDeptId())
      ? `(${nivel1} OR d.status = 'pendente_admin')`
      : nivel1;
    pagasWhere += ' AND o.departamento_id = @departamento_id';
  } else if (role === 'adm_area') {
    params.user_id = id;
    const deptos = 'o.departamento_id IN (SELECT departamento_id FROM usuarios_departamentos WHERE usuario_id = @user_id)';
    pendentesWhere = `d.status = 'pendente_adm_area' AND ${deptos}`;
    pagasWhere += ` AND ${deptos}`;
  } else if (role !== 'admin') {
    params.user_id = id;
    pendentesWhere += ' AND d.usuario_id = @user_id';
    pagasWhere += ' AND d.usuario_id = @user_id';
  }

  return { pendentesWhere, pagasWhere, params };
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { id, role } = getAuthUser(req);
    const { userRole, departamentoId } = getDashboardScope(req);

    // Orçamento e despesas do ano fiscal atual (ano do orçamento da rubrica), com o mesmo âmbito por perfil usado nos Relatórios
    const params: Record<string, any> = { ano: new Date().getFullYear() };
    let orcamentoWhere = 'WHERE o.ano = @ano';
    let despesasWhere = 'WHERE o.ano = @ano';

    if (userRole !== 'admin' && departamentoId) {
      orcamentoWhere += ' AND o.departamento_id = @departamento_id';
      despesasWhere += ' AND o.departamento_id = @departamento_id';
      params.departamento_id = departamentoId;
    } else if (role === 'adm_area') {
      const deptos = ' AND o.departamento_id IN (SELECT departamento_id FROM usuarios_departamentos WHERE usuario_id = @user_id)';
      orcamentoWhere += deptos;
      despesasWhere += deptos;
      params.user_id = id;
    }

    const query = `
      SELECT
        (SELECT ISNULL(SUM(o.valor_total), 0) FROM orcamentos o ${orcamentoWhere}) as totalOrcamento,
        ISNULL(SUM(CASE WHEN d.status IN ('aprovada', 'paga') THEN d.valor ELSE 0 END), 0) as totalDespesas,
        ISNULL(SUM(CASE WHEN d.status = 'negada' THEN d.valor ELSE 0 END), 0) as totalNegado,
        ISNULL(SUM(CASE WHEN d.status = 'aprovada' THEN d.valor ELSE 0 END), 0) as totalAprovado,
        COUNT(CASE WHEN d.status IN ('aprovada', 'paga') THEN 1 END) as despesasAprovadas,
        COUNT(CASE WHEN d.status = 'negada' THEN 1 END) as despesasNegadas
      FROM despesas d
      LEFT JOIN rubricas r ON d.rubrica_id = r.id
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      ${despesasWhere}
    `;

    const scope = getPendentesPagasScope(req);
    const pendentesPagasQuery = `
      SELECT
        COUNT(CASE WHEN ${scope.pendentesWhere} THEN 1 END) as despesasPendentes,
        ISNULL(SUM(CASE WHEN ${scope.pendentesWhere} THEN d.valor ELSE 0 END), 0) as totalPendente,
        COUNT(CASE WHEN ${scope.pagasWhere} THEN 1 END) as despesasPagas,
        ISNULL(SUM(CASE WHEN ${scope.pagasWhere} THEN d.valor ELSE 0 END), 0) as totalPago
      FROM despesas d
      LEFT JOIN rubricas r ON d.rubrica_id = r.id
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      WHERE o.ano = @ano
    `;

    const [result, pendentesPagas] = await Promise.all([
      executeQuery(query, params),
      executeQuery(pendentesPagasQuery, { ...scope.params, ano: params.ano })
    ]);
    const row = result[0];
    const pp = pendentesPagas[0];

    const totalOrcamento = row.totalOrcamento || 0;
    const totalDespesas = row.totalDespesas || 0;
    const utilizacaoOrcamento = totalOrcamento > 0 ? (totalDespesas / totalOrcamento) * 100 : 0;

    const stats: DashboardStats = {
      totalOrcamento,
      totalDespesas,
      totalPago: pp.totalPago || 0,
      totalPendente: pp.totalPendente || 0,
      totalNegado: row.totalNegado || 0,
      totalAprovado: row.totalAprovado || 0,
      despesasPendentes: pp.despesasPendentes || 0,
      despesasPagas: pp.despesasPagas || 0,
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

export const getDailyExpenses = async (req: Request, res: Response) => {
  try {
    const { userRole, departamentoId } = getDashboardScope(req);
    
    let whereClause = 'WHERE d.created_at >= DATEADD(day, -7, GETDATE())'; // Always get last 7 days for graph
    const params: Record<string, any> = {};
    
    if (userRole !== 'admin' && departamentoId) {
      whereClause += ' AND o.departamento_id = @departamento_id';
      params.departamento_id = departamentoId;
    }
    
    const query = `
      SELECT 
        CAST(d.created_at AS DATE) as date,
        SUM(d.valor) as total,
        COUNT(*) as count
      FROM despesas d
      LEFT JOIN rubricas r ON d.rubrica_id = r.id
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      ${whereClause}
      GROUP BY CAST(d.created_at AS DATE)
      ORDER BY date DESC
    `;
    
    const result = await executeQuery(query, params);
    
    // Generate last 7 days with data
    const dailyData = [];
    const today = new Date();
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      // Format date to match SQL Server date format (YYYY-MM-DD)
      const dateStr = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
        String(date.getDate()).padStart(2, '0');
      
      // Find matching data from database results
      const dayData = result.find((row: any) => {
        const dbDate = new Date(row.date);
        const dbDateStr = dbDate.getFullYear() + '-' + 
          String(dbDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(dbDate.getDate()).padStart(2, '0');
        return dbDateStr === dateStr;
      });
      
      dailyData.push({
        day: daysOfWeek[date.getDay()],
        date: dateStr,
        total: dayData?.total || 0,
        count: dayData?.count || 0
      });
    }
    
    res.json(dailyData);
  } catch (error) {
    console.error('Error fetching daily expenses:', error);
    res.status(500).json({ error: 'Erro ao buscar despesas diárias' });
  }
};
