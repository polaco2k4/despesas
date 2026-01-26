import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { Aprovacao, AprovacaoStatus, NivelAprovacao, DespesaStatus } from '../types/database.js';
import { criarNotificacao } from './notificacoesController.js';

export const getAllAprovacoes = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, despesa_id, aprovado_por, role, status, comentario, aprovado_em
      FROM aprovacoes
      ORDER BY aprovado_em DESC
    `;
    const aprovacoes = await executeQuery<Aprovacao>(query);
    res.json(aprovacoes);
  } catch (error) {
    console.error('Error fetching aprovacoes:', error);
    res.status(500).json({ error: 'Erro ao buscar aprovações' });
  }
};

export const createAprovacao = async (req: Request, res: Response) => {
  try {
    const { despesa_id, aprovado_por, role, status, comentario } = req.body;
    
    console.log('🔍 createAprovacao debug:', { 
      despesa_id, 
      aprovado_por, 
      role, 
      status, 
      comentario: comentario || 'null'
    });
    
    if (!despesa_id || !aprovado_por || !role || !status) {
      return res.status(400).json({ error: 'Despesa, aprovador, role e status são obrigatórios' });
    }

    // Buscar informações da despesa e do aprovador
    const despesaQuery = `
      SELECT d.*, r.orcamento_id, o.departamento_id
      FROM despesas d
      LEFT JOIN rubricas r ON d.rubrica_id = r.id
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      WHERE d.id = @despesa_id
    `;
    const despesas = await executeQuery<any>(despesaQuery, { despesa_id });
    
    if (despesas.length === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    
    const despesa = despesas[0];
    console.log('📋 Despesa encontrada:', {
      id: despesa.id,
      status: despesa.status,
      departamento_id: despesa.departamento_id
    });
    
    const aprovadorQuery = `SELECT * FROM usuarios WHERE id = @aprovado_por`;
    const aprovadores = await executeQuery<any>(aprovadorQuery, { aprovado_por });
    
    if (aprovadores.length === 0) {
      return res.status(404).json({ error: 'Aprovador não encontrado' });
    }
    
    const aprovador = aprovadores[0];
    
    // If user is adm_area, fetch their assigned departments
    let departamentosIds: string[] = [];
    if (aprovador.role === 'adm_area') {
      const deptosQuery = `
        SELECT departamento_id 
        FROM usuarios_departamentos 
        WHERE usuario_id = @aprovado_por
      `;
      const deptos = await executeQuery<any>(deptosQuery, { aprovado_por });
      departamentosIds = deptos.map(d => d.departamento_id.toString());
    }
    
    console.log('👤 Aprovador encontrado:', {
      id: aprovador.id,
      role: aprovador.role,
      departamento_id: aprovador.departamento_id,
      departamentos_ids: departamentosIds
    });
    
    // Determinar nível de aprovação e validar permissões
    let nivelAprovacao: NivelAprovacao;
    let proximoStatus: DespesaStatus;
    
    // Helper function to check if user has access to department
    const hasDepartmentAccess = () => {
      if (role === 'adm_area') {
        return departamentosIds.includes(despesa.departamento_id.toString());
      }
      return aprovador.departamento_id === despesa.departamento_id;
    };
    
    if (despesa.status === 'pendente_gestor' && role === 'gestor' && 
        aprovador.departamento_id === despesa.departamento_id) {
      nivelAprovacao = 1;
      proximoStatus = status === 'aprovada' ? 'pendente_admin' : 'negada';
      console.log('✅ Aprovação nível 1 (Gestor) autorizada');
    } else if (despesa.status === 'pendente_admin' && role === 'admin') {
      nivelAprovacao = 2;
      proximoStatus = status === 'aprovada' ? 'pendente_adm_area' : 'negada';
      console.log('✅ Aprovação nível 2 (Admin) autorizada');
    } else if (despesa.status === 'pendente_adm_area' && role === 'adm_area' && 
               hasDepartmentAccess()) {
      nivelAprovacao = 3;
      proximoStatus = status === 'aprovada' ? 'aprovada' : 'negada';
      console.log('✅ Aprovação nível 3 (ADM Área) autorizada');
    } else {
      console.log('❌ Permissão negada:', {
        despesa_status: despesa.status,
        user_role: role,
        user_depto: aprovador.departamento_id,
        user_departamentos: departamentosIds,
        despesa_depto: despesa.departamento_id,
        has_access: hasDepartmentAccess(),
        condicao1: despesa.status === 'pendente_gestor',
        condicao2: role === 'gestor',
        condicao3: aprovador.departamento_id === despesa.departamento_id,
        condicao4: despesa.status === 'pendente_adm_area',
        condicao5: role === 'adm_area',
        condicao6: hasDepartmentAccess()
      });
      return res.status(403).json({ error: 'Usuário não tem permissão para aprovar esta despesa neste nível' });
    }
    
    // Atualizar status da despesa
    await executeQuery(
      `UPDATE despesas SET status = @status WHERE id = @despesa_id`,
      { status: proximoStatus, despesa_id }
    );

    // Inserir registro de aprovação
    const query = `
      INSERT INTO aprovacoes (despesa_id, aprovado_por, role, status, comentario, nivel_aprovacao)
      OUTPUT INSERTED.*
      VALUES (@despesa_id, @aprovado_por, @role, @status, @comentario, @nivel_aprovacao)
    `;
    const result = await executeQuery<Aprovacao>(query, {
      despesa_id,
      aprovado_por,
      role,
      status,
      comentario,
      nivel_aprovacao: nivelAprovacao
    });
    
    // Criar notificações baseadas no resultado da aprovação
    const aprovacaoResult = result[0];
    
    // Notificar o solicitante da despesa sobre o resultado
    await criarNotificacao(
      despesa.usuario_id,
      status === 'aprovada' ? 'Despesa Aprovada' : 'Despesa Rejeitada',
      `Sua despesa "${despesa.descricao}" de Kz ${Number(despesa.valor).toLocaleString('pt-PT')} foi ${status === 'aprovada' ? 'aprovada' : 'rejeitada'} por ${aprovador.nome}.`,
      status === 'aprovada' ? 'success' : 'error',
      'aprovacao',
      despesa_id
    );
    
    // Se foi aprovada e precisa do próximo nível, notificar os próximos aprovadores
    if (status === 'aprovada' && proximoStatus !== 'aprovada') {
      let proximosAprovadores = [];
      
      if (proximoStatus === 'pendente_admin') {
        // Notificar admins
        const adminsQuery = `
          SELECT id, nome, email
          FROM usuarios
          WHERE role = 'admin'
        `;
        proximosAprovadores = await executeQuery(adminsQuery, {});
      } else if (proximoStatus === 'pendente_adm_area') {
        // Notificar ADMs da área do departamento
        const admAreaQuery = `
          SELECT u.id, u.nome, u.email
          FROM usuarios u
          JOIN usuarios_departamentos ud ON u.id = ud.usuario_id
          WHERE u.role = 'adm_area' AND ud.departamento_id = @departamento_id
        `;
        proximosAprovadores = await executeQuery(admAreaQuery, { 
          departamento_id: despesa.departamento_id 
        });
      }
      
      for (const proximoAprovador of proximosAprovadores) {
        await criarNotificacao(
          proximoAprovador.id,
          'Despesa Aguardando Aprovação',
          `A despesa "${despesa.descricao}" de Kz ${Number(despesa.valor).toLocaleString('pt-PT')} foi aprovada e agora requer sua aprovação.`,
          'info',
          'aprovacao',
          despesa_id
        );
      }
    }
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating aprovacao:', error);
    res.status(500).json({ error: 'Erro ao criar aprovação' });
  }
};
