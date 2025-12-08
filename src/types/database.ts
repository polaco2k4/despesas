export type UserRole = 'admin' | 'gestor' | 'colaborador';
export type DespesaStatus = 'pendente' | 'aprovada' | 'rejeitada' | 'paga' | 'negada';
export type AprovacaoStatus = 'aprovada' | 'negada';

export interface Departamento {
  id: string;
  nome: string;
  sigla?: string;
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  departamento_id: string | null;
  created_at: string;
  updated_at: string;
  departamento?: Departamento;
}

export interface Orcamento {
  id: string;
  departamento_id: string;
  ano: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
  departamento?: Departamento;
  rubricas?: Rubrica[];
}

export interface Rubrica {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  orcamento_id: string;
  created_at: string;
  updated_at: string;
  orcamento?: Orcamento;
  despesas?: Despesa[];
}

export interface Despesa {
  id: string;
  rubrica_id: string;
  usuario_id: string;
  descricao: string;
  valor: number;
  status: DespesaStatus;
  anexo_url: string | null;
  data_pagamento?: string | null;
  motivo_rejeicao?: string | null;
  fornecedor_id?: string | null;
  created_at: string;
  updated_at: string;
  rubrica?: Rubrica;
  usuario?: Usuario;
  aprovacoes?: Aprovacao[];
}

export interface Aprovacao {
  id: string;
  despesa_id: string;
  aprovado_por: string;
  role: UserRole;
  status: AprovacaoStatus;
  comentario: string | null;
  aprovado_em: string;
  despesa?: Despesa;
  aprovador?: Usuario;
}

export interface DashboardStats {
  totalOrcamento: number;
  totalDespesas: number;
  totalPago: number;
  totalPendente: number;
  totalNegado: number;
  totalAprovado: number;
  utilizacaoOrcamento: number;
}