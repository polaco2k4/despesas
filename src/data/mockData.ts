import type { 
  Departamento, 
  Usuario, 
  Orcamento, 
  Rubrica, 
  Despesa, 
  Aprovacao,
  UserRole,
  DespesaStatus,
  AprovacaoStatus
} from '../types/database';

// Mock Data
export const mockDepartamentos: Departamento[] = [
  {
    id: '1',
    nome: 'Finanças',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    nome: 'Marketing',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    nome: 'TI',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    nome: 'Recursos Humanos',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const mockUsuarios: Usuario[] = [
  {
    id: 'user-1',
    nome: 'Ana Silva',
    email: 'ana@empresa.com',
    role: 'admin',
    departamento_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    departamento: mockDepartamentos[0]
  },
  {
    id: 'user-2',
    nome: 'João Santos',
    email: 'joao@empresa.com',
    role: 'gestor',
    departamento_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    departamento: mockDepartamentos[0]
  },
  {
    id: 'user-3',
    nome: 'Maria Oliveira',
    email: 'maria@empresa.com',
    role: 'gestor',
    departamento_id: '2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    departamento: mockDepartamentos[1]
  },
  {
    id: 'user-4',
    nome: 'Carlos Costa',
    email: 'carlos@empresa.com',
    role: 'colaborador',
    departamento_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    departamento: mockDepartamentos[0]
  },
  {
    id: 'user-5',
    nome: 'Beatriz Lima',
    email: 'beatriz@empresa.com',
    role: 'colaborador',
    departamento_id: '3',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    departamento: mockDepartamentos[2]
  }
];

export const mockOrcamentos: Orcamento[] = [
  {
    id: 'orc-1',
    departamento_id: '1',
    ano: 2025,
    valor_total: 100000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    departamento: mockDepartamentos[0]
  },
  {
    id: 'orc-2',
    departamento_id: '2',
    ano: 2025,
    valor_total: 80000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    departamento: mockDepartamentos[1]
  },
  {
    id: 'orc-3',
    departamento_id: '3',
    ano: 2025,
    valor_total: 120000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    departamento: mockDepartamentos[2]
  },
  {
    id: 'orc-4',
    departamento_id: '4',
    ano: 2025,
    valor_total: 60000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    departamento: mockDepartamentos[3]
  }
];

export const mockRubricas: Rubrica[] = [
  // Finanças
  {
    id: 'rub-1',
    nome: 'Salários',
    descricao: 'Despesas com salários e benefícios',
    valor: 60000,
    orcamento_id: 'orc-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    orcamento: mockOrcamentos[0]
  },
  {
    id: 'rub-2',
    nome: 'Consultoria',
    descricao: 'Serviços de consultoria externa',
    valor: 20000,
    orcamento_id: 'orc-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    orcamento: mockOrcamentos[0]
  },
  {
    id: 'rub-3',
    nome: 'Materiais de Escritório',
    descricao: 'Material de escritório e consumíveis',
    valor: 5000,
    orcamento_id: 'orc-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    orcamento: mockOrcamentos[0]
  },
  // Marketing
  {
    id: 'rub-4',
    nome: 'Publicidade',
    descricao: 'Campanhas publicitárias e marketing digital',
    valor: 40000,
    orcamento_id: 'orc-2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    orcamento: mockOrcamentos[1]
  },
  {
    id: 'rub-5',
    nome: 'Eventos',
    descricao: 'Organização de eventos e conferências',
    valor: 30000,
    orcamento_id: 'orc-2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    orcamento: mockOrcamentos[1]
  },
  {
    id: 'rub-6',
    nome: 'Design',
    descricao: 'Serviços de design gráfico e web',
    valor: 10000,
    orcamento_id: 'orc-2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    orcamento: mockOrcamentos[1]
  },
  // TI
  {
    id: 'rub-7',
    nome: 'Servidores',
    descricao: 'Manutenção e upgrade de servidores',
    valor: 30000,
    orcamento_id: 'orc-3',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    orcamento: mockOrcamentos[2]
  },
  {
    id: 'rub-8',
    nome: 'Software',
    descricao: 'Licenças de software e aplicações',
    valor: 15000,
    orcamento_id: 'orc-3',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    orcamento: mockOrcamentos[2]
  },
  {
    id: 'rub-9',
    nome: 'Licenças',
    descricao: 'Licenças de sistemas operacionais',
    valor: 5000,
    orcamento_id: 'orc-3',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    orcamento: mockOrcamentos[2]
  }
];

export const mockDespesas: Despesa[] = [
  {
    id: 'desp-1',
    rubrica_id: 'rub-3',
    usuario_id: 'user-4',
    descricao: 'Compra de papel e canetas para o escritório',
    valor: 500,
    status: 'pendente',
    anexo_url: null,
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z',
    rubrica: mockRubricas[2],
    usuario: mockUsuarios[3]
  },
  {
    id: 'desp-2',
    rubrica_id: 'rub-8',
    usuario_id: 'user-5',
    descricao: 'Licença anual do software de desenvolvimento',
    valor: 2000,
    status: 'aprovada',
    anexo_url: null,
    created_at: '2024-11-15T14:30:00Z',
    updated_at: '2024-11-16T09:15:00Z',
    rubrica: mockRubricas[7],
    usuario: mockUsuarios[4]
  },
  {
    id: 'desp-3',
    rubrica_id: 'rub-4',
    usuario_id: 'user-3',
    descricao: 'Campanha publicitária no Google Ads',
    valor: 3500,
    status: 'pendente',
    anexo_url: null,
    created_at: '2024-12-05T16:20:00Z',
    updated_at: '2024-12-05T16:20:00Z',
    rubrica: mockRubricas[3],
    usuario: mockUsuarios[2]
  },
  {
    id: 'desp-4',
    rubrica_id: 'rub-2',
    usuario_id: 'user-2',
    descricao: 'Consultoria em auditoria financeira',
    valor: 8000,
    status: 'aprovada',
    anexo_url: null,
    created_at: '2024-11-20T11:45:00Z',
    updated_at: '2024-11-21T08:30:00Z',
    rubrica: mockRubricas[1],
    usuario: mockUsuarios[1]
  },
  {
    id: 'desp-5',
    rubrica_id: 'rub-5',
    usuario_id: 'user-3',
    descricao: 'Organização da conferência anual',
    valor: 12000,
    status: 'rejeitada',
    anexo_url: null,
    created_at: '2024-11-10T13:15:00Z',
    updated_at: '2024-11-12T10:00:00Z',
    rubrica: mockRubricas[4],
    usuario: mockUsuarios[2]
  }
];

export const mockAprovacoes: Aprovacao[] = [
  {
    id: 'apr-1',
    despesa_id: 'desp-2',
    aprovado_por: 'user-1',
    role: 'admin',
    status: 'aprovada',
    comentario: 'Despesa aprovada - licença necessária para o projeto',
    aprovado_em: '2024-11-16T09:15:00Z',
    despesa: mockDespesas[1],
    aprovador: mockUsuarios[0]
  },
  {
    id: 'apr-2',
    despesa_id: 'desp-4',
    aprovado_por: 'user-1',
    role: 'admin',
    status: 'aprovada',
    comentario: 'Auditoria necessária para compliance',
    aprovado_em: '2024-11-21T08:30:00Z',
    despesa: mockDespesas[3],
    aprovador: mockUsuarios[0]
  },
  {
    id: 'apr-3',
    despesa_id: 'desp-5',
    aprovado_por: 'user-1',
    role: 'admin',
    status: 'rejeitada',
    comentario: 'Orçamento insuficiente para este ano',
    aprovado_em: '2024-11-12T10:00:00Z',
    despesa: mockDespesas[4],
    aprovador: mockUsuarios[0]
  }
];

// Fornecedores
export interface Fornecedor {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  nif: string;
  categoria: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
}

export const mockFornecedores: Fornecedor[] = [
  {
    id: 'forn-1',
    nome: 'Papelaria Central',
    email: 'vendas@papelariacentral.pt',
    telefone: '+351 21 123 4567',
    endereco: 'Rua das Flores, 123, Lisboa',
    nif: '123456789',
    categoria: 'Material de Escritório',
    status: 'ativo',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'forn-2',
    nome: 'TechSolutions Lda',
    email: 'info@techsolutions.pt',
    telefone: '+351 22 987 6543',
    endereco: 'Av. da Tecnologia, 456, Porto',
    nif: '987654321',
    categoria: 'Software e Licenças',
    status: 'ativo',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z'
  },
  {
    id: 'forn-3',
    nome: 'Marketing Pro',
    email: 'contacto@marketingpro.pt',
    telefone: '+351 21 555 7890',
    endereco: 'Rua do Comércio, 789, Lisboa',
    nif: '456789123',
    categoria: 'Publicidade e Marketing',
    status: 'ativo',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  },
  {
    id: 'forn-4',
    nome: 'Consultores Associados',
    email: 'geral@consultores.pt',
    telefone: '+351 21 444 5566',
    endereco: 'Praça dos Negócios, 321, Lisboa',
    nif: '789123456',
    categoria: 'Consultoria',
    status: 'ativo',
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z'
  },
  {
    id: 'forn-5',
    nome: 'Eventos & Cia',
    email: 'eventos@eventosecia.pt',
    telefone: '+351 22 333 4455',
    endereco: 'Rua dos Eventos, 654, Porto',
    nif: '321654987',
    categoria: 'Organização de Eventos',
    status: 'inativo',
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-11-01T00:00:00Z'
  }
];

// Current user simulation
export let currentUser: Usuario | null = null;

export const setCurrentUser = (user: Usuario | null) => {
  currentUser = user;
};

export const getCurrentUser = () => currentUser;

// Authentication simulation
export const authenticateUser = (email: string, password: string): Usuario | null => {
  const user = mockUsuarios.find(u => u.email === email);
  if (user && password === '123456') {
    setCurrentUser(user);
    return user;
  }
  return null;
};

export const logoutUser = () => {
  setCurrentUser(null);
};