export type UserRole = 'admin' | 'gestor' | 'colaborador' | 'adm_area';
export type DespesaStatus = 'pendente_gestor' | 'pendente_admin' | 'pendente_adm_area' | 'aprovada' | 'rejeitada' | 'paga' | 'negada';
export type AprovacaoStatus = 'aprovada' | 'negada';
export type NivelAprovacao = 1 | 2 | 3;

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
  departamentos?: Departamento[];
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
  pago_por?: string | null;
  numero_despesa?: string;
  created_at: string;
  updated_at: string;
  rubrica?: Rubrica;
  usuario?: Usuario;
  pago_por_usuario?: Usuario;
  aprovacoes?: Aprovacao[];
}

export interface Aprovacao {
  id: string;
  despesa_id: string;
  aprovado_por: string;
  role: UserRole;
  status: AprovacaoStatus;
  comentario: string | null;
  nivel_aprovacao: NivelAprovacao;
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
  despesasPendentes: number;
  despesasAprovadas: number;
  despesasNegadas: number;
  utilizacaoOrcamento: number;
}

export interface Documento {
  id: string;
  nome: string;
  nome_original: string;
  descricao?: string;
  tipo_arquivo: string;
  tamanho: number;
  caminho_arquivo: string;
  url_acesso?: string;
  categoria?: string;
  tags?: string;
  criado_por: string;
  departamento_id?: string;
  publico: boolean;
  ativo: boolean;
  versao: number;
  documento_pai_id?: string;
  created_at: string;
  updated_at: string;
  numero_documento?: string;
  criador?: Usuario;
  departamento?: Departamento;
  documento_pai?: Documento;
  versoes?: Documento[];
  permissoes?: PermissaoDocumento[];
}

export interface PermissaoDocumento {
  id: string;
  documento_id: string;
  usuario_id?: string;
  departamento_id?: string;
  role?: UserRole;
  permissao: 'leitura' | 'escrita' | 'admin';
  created_at: string;
  usuario?: Usuario;
  departamento?: Departamento;
}

export interface DocumentoUpload {
  file: File;
  nome?: string;
  descricao?: string;
  categoria?: string;
  tags?: string;
  publico?: boolean;
  departamento_id?: string;
}

export interface Expediente {
  id: string;
  numero: string;
  numero_expediente?: string;
  titulo: string;
  descricao?: string;
  tipo: 'administrativo' | 'juridico' | 'financeiro' | 'rh' | 'outros';
  status: 'aberto' | 'em_andamento' | 'suspenso' | 'fechado';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  data_abertura: string;
  data_prazo?: string;
  data_fechamento?: string;
  criado_por: string;
  responsavel_id?: string;
  departamento_id?: string;
  observacoes?: string;
  publico: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  criador?: Usuario;
  responsavel?: Usuario;
  departamento?: Departamento;
  documentos?: Documento[];
  total_documentos?: number;
}

export interface ExpedienteDocumento {
  id: string;
  expediente_id: string;
  documento_id: string;
  adicionado_por: string;
  data_adicao: string;
  observacoes?: string;
  documento?: Documento;
  adicionado_por_usuario?: Usuario;
}

export interface ExpedienteFilters {
  tipo?: string;
  status?: string;
  prioridade?: string;
  departamento_id?: string;
  criado_por?: string;
  responsavel_id?: string;
  publico?: boolean;
  data_inicio?: string;
  data_fim?: string;
}