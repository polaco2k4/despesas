import { supabase } from './supabase';
import type { 
  Departamento, 
  Usuario, 
  Orcamento, 
  Rubrica, 
  Despesa, 
  Aprovacao,
  DashboardStats,
  DespesaStatus,
  AprovacaoStatus
} from '../types/database';

// Departamentos API
export const departamentosAPI = {
  getAll: async (): Promise<Departamento[]> => {
    const { data, error } = await supabase
      .from('departamentos')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data;
  },

  create: async (departamento: Omit<Departamento, 'id' | 'created_at' | 'updated_at'>): Promise<Departamento> => {
    const { data, error } = await supabase
      .from('departamentos')
      .insert(departamento)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Usuarios API
export const usuariosAPI = {
  getAll: async (): Promise<Usuario[]> => {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        departamento:departamentos(*)
      `)
      .order('nome');
    
    if (error) throw error;
    return data;
  },

  getById: async (id: string): Promise<Usuario> => {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        departamento:departamentos(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  create: async (usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>): Promise<Usuario> => {
    const { data, error } = await supabase
      .from('usuarios')
      .insert(usuario)
      .select(`
        *,
        departamento:departamentos(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Usuario>): Promise<Usuario> => {
    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        departamento:departamentos(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Orçamentos API
export const orcamentosAPI = {
  getAll: async (): Promise<Orcamento[]> => {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`
        *,
        departamento:departamentos(*),
        rubricas(*)
      `)
      .order('ano', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getById: async (id: string): Promise<Orcamento> => {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`
        *,
        departamento:departamentos(*),
        rubricas(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  create: async (orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>): Promise<Orcamento> => {
    const { data, error } = await supabase
      .from('orcamentos')
      .insert(orcamento)
      .select(`
        *,
        departamento:departamentos(*),
        rubricas(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Orcamento>): Promise<Orcamento> => {
    const { data, error } = await supabase
      .from('orcamentos')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        departamento:departamentos(*),
        rubricas(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('orcamentos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Rubricas API
export const rubricasAPI = {
  getAll: async (): Promise<Rubrica[]> => {
    const { data, error } = await supabase
      .from('rubricas')
      .select(`
        *,
        orcamento:orcamentos(*, departamento:departamentos(*))
      `)
      .order('nome');
    
    if (error) throw error;
    return data;
  },

  getByOrcamento: async (orcamentoId: string): Promise<Rubrica[]> => {
    const { data, error } = await supabase
      .from('rubricas')
      .select('*')
      .eq('orcamento_id', orcamentoId)
      .order('nome');
    
    if (error) throw error;
    return data;
  },

  create: async (rubrica: Omit<Rubrica, 'id' | 'created_at' | 'updated_at'>): Promise<Rubrica> => {
    const { data, error } = await supabase
      .from('rubricas')
      .insert(rubrica)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Rubrica>): Promise<Rubrica> => {
    const { data, error } = await supabase
      .from('rubricas')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('rubricas')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Despesas API
export const despesasAPI = {
  getAll: async (filters?: {
    departamento_id?: string;
    status?: DespesaStatus;
    usuario_id?: string;
  }): Promise<Despesa[]> => {
    let query = supabase
      .from('despesas')
      .select(`
        *,
        usuario:usuarios(*),
        rubrica:rubricas(*, orcamento:orcamentos(*, departamento:departamentos(*))),
        aprovacoes(*, aprovador:usuarios(*))
      `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.usuario_id) {
      query = query.eq('usuario_id', filters.usuario_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getById: async (id: string): Promise<Despesa> => {
    const { data, error } = await supabase
      .from('despesas')
      .select(`
        *,
        usuario:usuarios(*),
        rubrica:rubricas(*, orcamento:orcamentos(*, departamento:departamentos(*))),
        aprovacoes(*, aprovador:usuarios(*))
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  create: async (despesa: Omit<Despesa, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Despesa> => {
    const { data, error } = await supabase
      .from('despesas')
      .insert({ ...despesa, status: 'pendente' })
      .select(`
        *,
        usuario:usuarios(*),
        rubrica:rubricas(*, orcamento:orcamentos(*, departamento:departamentos(*))),
        aprovacoes(*, aprovador:usuarios(*))
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Despesa>): Promise<Despesa> => {
    const { data, error } = await supabase
      .from('despesas')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        usuario:usuarios(*),
        rubrica:rubricas(*, orcamento:orcamentos(*, departamento:departamentos(*))),
        aprovacoes(*, aprovador:usuarios(*))
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('despesas')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Aprovações API
export const aprovacoesAPI = {
  getAll: async (): Promise<Aprovacao[]> => {
    const { data, error } = await supabase
      .from('aprovacoes')
      .select(`
        *,
        despesa:despesas(*, usuario:usuarios(*), rubrica:rubricas(*)),
        aprovador:usuarios(*)
      `)
      .order('aprovado_em', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  create: async (aprovacao: {
    despesa_id: string;
    status: AprovacaoStatus;
    comentario?: string;
  }): Promise<Aprovacao> => {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const userProfile = await supabase
      .from('usuarios')
      .select('role')
      .eq('id', user.data.user.id)
      .single();

    if (userProfile.error) throw userProfile.error;

    // Atualizar status da despesa
    await supabase
      .from('despesas')
      .update({ status: aprovacao.status })
      .eq('id', aprovacao.despesa_id);

    const { data, error } = await supabase
      .from('aprovacoes')
      .insert({
        despesa_id: aprovacao.despesa_id,
        aprovado_por: user.data.user.id,
        role: userProfile.data.role,
        status: aprovacao.status,
        comentario: aprovacao.comentario
      })
      .select(`
        *,
        despesa:despesas(*, usuario:usuarios(*), rubrica:rubricas(*)),
        aprovador:usuarios(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Dashboard API
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    // Get current user to determine access level
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const userProfile = await supabase
      .from('usuarios')
      .select('role, departamento_id')
      .eq('id', user.data.user.id)
      .single();

    if (userProfile.error) throw userProfile.error;

    let orcamentosQuery = supabase.from('orcamentos').select('valor_total');
    let despesasQuery = supabase.from('despesas').select('valor, status, rubrica:rubricas(orcamento:orcamentos(*))');

    // Apply filters based on user role
    if (userProfile.data.role !== 'admin') {
      orcamentosQuery = orcamentosQuery.eq('departamento_id', userProfile.data.departamento_id);
      despesasQuery = despesasQuery.eq('rubrica.orcamento.departamento_id', userProfile.data.departamento_id);
    }

    const [orcamentosResult, despesasResult] = await Promise.all([
      orcamentosQuery,
      despesasQuery
    ]);

    if (orcamentosResult.error) throw orcamentosResult.error;
    if (despesasResult.error) throw despesasResult.error;

    const totalOrcamento = orcamentosResult.data.reduce((sum, o) => sum + o.valor_total, 0);
    const totalDespesas = despesasResult.data.reduce((sum, d) => sum + (d.status === 'aprovada' || d.status === 'paga' ? d.valor : 0), 0);
    const despesasPendentes = despesasResult.data.filter(d => d.status === 'pendente').length;
    const despesasAprovadas = despesasResult.data.filter(d => d.status === 'aprovada' || d.status === 'paga').length;
    const despesasNegadas = despesasResult.data.filter(d => d.status === 'negada').length;
    const utilizacaoOrcamento = totalOrcamento > 0 ? (totalDespesas / totalOrcamento) * 100 : 0;

    return {
      totalOrcamento,
      totalDespesas,
      despesasPendentes,
      despesasAprovadas,
      despesasNegadas,
      utilizacaoOrcamento
    };
  }
};