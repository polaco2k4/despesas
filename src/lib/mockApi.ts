import type { 
  Departamento, 
  Usuario, 
  Orcamento, 
  Rubrica, 
  Despesa, 
  Aprovacao,
  DashboardStats,
  UserRole,
  DespesaStatus,
  AprovacaoStatus
} from '../types/database';

import type { Fornecedor } from '../data/mockData';

import {
  mockDepartamentos,
  mockUsuarios,
  mockOrcamentos,
  mockRubricas,
  mockDespesas,
  mockAprovacoes,
  mockFornecedores,
  getCurrentUser,
  authenticateUser,
  logoutUser
} from '../data/mockData';

// Simulate API delay
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Departamentos API
export const departamentosAPI = {
  getAll: async (): Promise<Departamento[]> => {
    await delay();
    return [...mockDepartamentos];
  },

  create: async (departamento: Omit<Departamento, 'id' | 'created_at' | 'updated_at'>): Promise<Departamento> => {
    await delay();
    const newDepartamento: Departamento = {
      ...departamento,
      id: `dept-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDepartamentos.push(newDepartamento);
    return newDepartamento;
  },

  update: async (id: string, updates: Partial<Departamento>): Promise<Departamento> => {
    await delay();
    const index = mockDepartamentos.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Departamento não encontrado');
    
    mockDepartamentos[index] = {
      ...mockDepartamentos[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return mockDepartamentos[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    const index = mockDepartamentos.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Departamento não encontrado');
    mockDepartamentos.splice(index, 1);
  }
};

// Usuarios API
export const usuariosAPI = {
  getAll: async (): Promise<Usuario[]> => {
    await delay();
    return mockUsuarios.map(user => ({
      ...user,
      departamento: mockDepartamentos.find(d => d.id === user.departamento_id)
    }));
  },

  getById: async (id: string): Promise<Usuario> => {
    await delay();
    const user = mockUsuarios.find(u => u.id === id);
    if (!user) throw new Error('Utilizador não encontrado');
    return {
      ...user,
      departamento: mockDepartamentos.find(d => d.id === user.departamento_id)
    };
  },

  create: async (usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>): Promise<Usuario> => {
    await delay();
    const newUsuario: Usuario = {
      ...usuario,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      departamento: mockDepartamentos.find(d => d.id === usuario.departamento_id)
    };
    mockUsuarios.push(newUsuario);
    return newUsuario;
  },

  update: async (id: string, updates: Partial<Usuario>): Promise<Usuario> => {
    await delay();
    const index = mockUsuarios.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Utilizador não encontrado');
    
    mockUsuarios[index] = {
      ...mockUsuarios[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return {
      ...mockUsuarios[index],
      departamento: mockDepartamentos.find(d => d.id === mockUsuarios[index].departamento_id)
    };
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    const index = mockUsuarios.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Utilizador não encontrado');
    mockUsuarios.splice(index, 1);
  }
};

// Orçamentos API
export const orcamentosAPI = {
  getAll: async (): Promise<Orcamento[]> => {
    await delay();
    const currentUser = getCurrentUser();
    let orcamentos = [...mockOrcamentos];
    
    // Filter based on user role
    if (currentUser?.role !== 'admin') {
      orcamentos = orcamentos.filter(o => o.departamento_id === currentUser?.departamento_id);
    }
    
    return orcamentos.map(orcamento => ({
      ...orcamento,
      departamento: mockDepartamentos.find(d => d.id === orcamento.departamento_id),
      rubricas: mockRubricas.filter(r => r.orcamento_id === orcamento.id)
    }));
  },

  getById: async (id: string): Promise<Orcamento> => {
    await delay();
    const orcamento = mockOrcamentos.find(o => o.id === id);
    if (!orcamento) throw new Error('Orçamento não encontrado');
    
    return {
      ...orcamento,
      departamento: mockDepartamentos.find(d => d.id === orcamento.departamento_id),
      rubricas: mockRubricas.filter(r => r.orcamento_id === orcamento.id)
    };
  },

  create: async (orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>): Promise<Orcamento> => {
    await delay();
    const newOrcamento: Orcamento = {
      ...orcamento,
      id: `orc-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      departamento: mockDepartamentos.find(d => d.id === orcamento.departamento_id),
      rubricas: []
    };
    mockOrcamentos.push(newOrcamento);
    return newOrcamento;
  },

  update: async (id: string, updates: Partial<Orcamento>): Promise<Orcamento> => {
    await delay();
    const index = mockOrcamentos.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Orçamento não encontrado');
    
    mockOrcamentos[index] = {
      ...mockOrcamentos[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return {
      ...mockOrcamentos[index],
      departamento: mockDepartamentos.find(d => d.id === mockOrcamentos[index].departamento_id),
      rubricas: mockRubricas.filter(r => r.orcamento_id === mockOrcamentos[index].id)
    };
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    const index = mockOrcamentos.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Orçamento não encontrado');
    mockOrcamentos.splice(index, 1);
  }
};

// Rubricas API
export const rubricasAPI = {
  getAll: async (): Promise<Rubrica[]> => {
    await delay();
    const currentUser = getCurrentUser();
    let rubricas = [...mockRubricas];
    
    // Filter based on user role
    if (currentUser?.role !== 'admin') {
      const userOrcamentos = mockOrcamentos.filter(o => o.departamento_id === currentUser?.departamento_id);
      const orcamentoIds = userOrcamentos.map(o => o.id);
      rubricas = rubricas.filter(r => orcamentoIds.includes(r.orcamento_id));
    }
    
    return rubricas.map(rubrica => ({
      ...rubrica,
      orcamento: {
        ...mockOrcamentos.find(o => o.id === rubrica.orcamento_id)!,
        departamento: mockDepartamentos.find(d => d.id === mockOrcamentos.find(o => o.id === rubrica.orcamento_id)?.departamento_id)
      }
    }));
  },

  getByOrcamento: async (orcamentoId: string): Promise<Rubrica[]> => {
    await delay();
    return mockRubricas.filter(r => r.orcamento_id === orcamentoId);
  },

  create: async (rubrica: Omit<Rubrica, 'id' | 'created_at' | 'updated_at'>): Promise<Rubrica> => {
    await delay();
    const newRubrica: Rubrica = {
      ...rubrica,
      id: `rub-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockRubricas.push(newRubrica);
    return newRubrica;
  },

  update: async (id: string, updates: Partial<Rubrica>): Promise<Rubrica> => {
    await delay();
    const index = mockRubricas.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Rubrica não encontrada');
    
    mockRubricas[index] = {
      ...mockRubricas[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return mockRubricas[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    const index = mockRubricas.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Rubrica não encontrada');
    mockRubricas.splice(index, 1);
  }
};

// Despesas API
export const despesasAPI = {
  getAll: async (filters?: {
    departamento_id?: string;
    status?: DespesaStatus;
    usuario_id?: string;
  }): Promise<Despesa[]> => {
    await delay();
    const currentUser = getCurrentUser();
    let despesas = [...mockDespesas];
    
    // Apply user role filtering
    if (currentUser) {
      if (currentUser.role === 'colaborador') {
        // Colaborador can see all expenses from their department
        const userDepartment = currentUser.departamento_id;
        if (userDepartment) {
          // Get all rubricas from the user's department
          const departmentRubricas = mockRubricas.filter(rubrica => {
            const orcamento = mockOrcamentos.find(o => o.id === rubrica.orcamento_id);
            return orcamento?.departamento_id === userDepartment;
          });
          const rubricaIds = departmentRubricas.map(r => r.id);
          despesas = despesas.filter(d => rubricaIds.includes(d.rubrica_id));
        }
      } else if (currentUser.role === 'gestor') {
        // Gestor can see expenses from their department
        const userRubricas = mockRubricas.filter(r => {
          const orcamento = mockOrcamentos.find(o => o.id === r.orcamento_id);
          return orcamento?.departamento_id === currentUser.departamento_id;
        });
        const rubricaIds = userRubricas.map(r => r.id);
        despesas = despesas.filter(d => rubricaIds.includes(d.rubrica_id));
      }
      // Admin can see all expenses
    }
    
    // Apply additional filters
    if (filters?.status) {
      despesas = despesas.filter(d => d.status === filters.status);
    }
    if (filters?.usuario_id) {
      despesas = despesas.filter(d => d.usuario_id === filters.usuario_id);
    }
    
    return despesas.map(despesa => ({
      ...despesa,
      usuario: mockUsuarios.find(u => u.id === despesa.usuario_id),
      rubrica: {
        ...mockRubricas.find(r => r.id === despesa.rubrica_id)!,
        orcamento: {
          ...mockOrcamentos.find(o => o.id === mockRubricas.find(r => r.id === despesa.rubrica_id)?.orcamento_id)!,
          departamento: mockDepartamentos.find(d => d.id === mockOrcamentos.find(o => o.id === mockRubricas.find(r => r.id === despesa.rubrica_id)?.orcamento_id)?.departamento_id)
        }
      },
      aprovacoes: mockAprovacoes.filter(a => a.despesa_id === despesa.id).map(a => ({
        ...a,
        aprovador: mockUsuarios.find(u => u.id === a.aprovado_por)
      }))
    }));
  },

  getById: async (id: string): Promise<Despesa> => {
    await delay();
    const despesa = mockDespesas.find(d => d.id === id);
    if (!despesa) throw new Error('Despesa não encontrada');
    
    return {
      ...despesa,
      usuario: mockUsuarios.find(u => u.id === despesa.usuario_id),
      rubrica: {
        ...mockRubricas.find(r => r.id === despesa.rubrica_id)!,
        orcamento: {
          ...mockOrcamentos.find(o => o.id === mockRubricas.find(r => r.id === despesa.rubrica_id)?.orcamento_id)!,
          departamento: mockDepartamentos.find(d => d.id === mockOrcamentos.find(o => o.id === mockRubricas.find(r => r.id === despesa.rubrica_id)?.orcamento_id)?.departamento_id)
        }
      },
      aprovacoes: mockAprovacoes.filter(a => a.despesa_id === despesa.id).map(a => ({
        ...a,
        aprovador: mockUsuarios.find(u => u.id === a.aprovado_por)
      }))
    };
  },

  create: async (despesa: Omit<Despesa, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Despesa> => {
    await delay();
    const newDespesa: Despesa = {
      ...despesa,
      id: `desp-${Date.now()}`,
      status: 'pendente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDespesas.push(newDespesa);
    
    return {
      ...newDespesa,
      usuario: mockUsuarios.find(u => u.id === newDespesa.usuario_id),
      rubrica: mockRubricas.find(r => r.id === newDespesa.rubrica_id),
      aprovacoes: []
    };
  },

  update: async (id: string, updates: Partial<Despesa>): Promise<Despesa> => {
    await delay();
    const index = mockDespesas.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Despesa não encontrada');
    
    mockDespesas[index] = {
      ...mockDespesas[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return {
      ...mockDespesas[index],
      usuario: mockUsuarios.find(u => u.id === mockDespesas[index].usuario_id),
      rubrica: mockRubricas.find(r => r.id === mockDespesas[index].rubrica_id),
      aprovacoes: mockAprovacoes.filter(a => a.despesa_id === mockDespesas[index].id)
    };
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    const index = mockDespesas.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Despesa não encontrada');
    mockDespesas.splice(index, 1);
  }
};

// Aprovações API
export const aprovacoesAPI = {
  getAll: async (): Promise<Aprovacao[]> => {
    await delay();
    return mockAprovacoes.map(aprovacao => ({
      ...aprovacao,
      despesa: mockDespesas.find(d => d.id === aprovacao.despesa_id),
      aprovador: mockUsuarios.find(u => u.id === aprovacao.aprovado_por)
    }));
  },

  create: async (aprovacao: {
    despesa_id: string;
    status: AprovacaoStatus;
    comentario?: string;
  }): Promise<Aprovacao> => {
    await delay();
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Utilizador não autenticado');

    // Update despesa status
    const despesaIndex = mockDespesas.findIndex(d => d.id === aprovacao.despesa_id);
    if (despesaIndex !== -1) {
      mockDespesas[despesaIndex].status = aprovacao.status;
      mockDespesas[despesaIndex].updated_at = new Date().toISOString();
    }

    const newAprovacao: Aprovacao = {
      id: `apr-${Date.now()}`,
      despesa_id: aprovacao.despesa_id,
      aprovado_por: currentUser.id,
      role: currentUser.role,
      status: aprovacao.status,
      comentario: aprovacao.comentario || null,
      aprovado_em: new Date().toISOString(),
      despesa: mockDespesas.find(d => d.id === aprovacao.despesa_id),
      aprovador: currentUser
    };
    
    mockAprovacoes.push(newAprovacao);
    return newAprovacao;
  }
};

// Fornecedores API
export const fornecedoresAPI = {
  getAll: async (): Promise<Fornecedor[]> => {
    await delay();
    return [...mockFornecedores];
  },

  getById: async (id: string): Promise<Fornecedor> => {
    await delay();
    const fornecedor = mockFornecedores.find(f => f.id === id);
    if (!fornecedor) throw new Error('Fornecedor não encontrado');
    return fornecedor;
  },

  create: async (fornecedor: Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>): Promise<Fornecedor> => {
    await delay();
    const newFornecedor: Fornecedor = {
      ...fornecedor,
      id: `forn-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockFornecedores.push(newFornecedor);
    return newFornecedor;
  },

  update: async (id: string, updates: Partial<Fornecedor>): Promise<Fornecedor> => {
    await delay();
    const index = mockFornecedores.findIndex(f => f.id === id);
    if (index === -1) throw new Error('Fornecedor não encontrado');
    
    mockFornecedores[index] = {
      ...mockFornecedores[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return mockFornecedores[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    const index = mockFornecedores.findIndex(f => f.id === id);
    if (index === -1) throw new Error('Fornecedor não encontrado');
    mockFornecedores.splice(index, 1);
  }
};

// Dashboard API
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    await delay();
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Utilizador não autenticado');

    let orcamentos = [...mockOrcamentos];
    let despesas = [...mockDespesas];

    // Apply filters based on user role
    if (currentUser.role !== 'admin') {
      orcamentos = orcamentos.filter(o => o.departamento_id === currentUser.departamento_id);
      
      const userRubricas = mockRubricas.filter(r => {
        const orcamento = mockOrcamentos.find(o => o.id === r.orcamento_id);
        return orcamento?.departamento_id === currentUser.departamento_id;
      });
      const rubricaIds = userRubricas.map(r => r.id);
      despesas = despesas.filter(d => rubricaIds.includes(d.rubrica_id));
    }

    const totalOrcamento = orcamentos.reduce((sum, o) => sum + o.valor_total, 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + (d.status === 'aprovada' ? d.valor : 0), 0);
    const despesasPendentes = despesas.filter(d => d.status === 'pendente').length;
    const despesasAprovadas = despesas.filter(d => d.status === 'aprovada').length;
    const despesasRejeitadas = despesas.filter(d => d.status === 'rejeitada').length;
    const utilizacaoOrcamento = totalOrcamento > 0 ? (totalDespesas / totalOrcamento) * 100 : 0;

    return {
      totalOrcamento,
      totalDespesas,
      despesasPendentes,
      despesasAprovadas,
      despesasRejeitadas,
      utilizacaoOrcamento
    };
  }
};

// Auth API
export const authAPI = {
  signIn: async (email: string, password: string) => {
    await delay();
    const user = authenticateUser(email, password);
    if (!user) {
      throw new Error('Credenciais inválidas');
    }
    return { user, error: null };
  },

  signOut: async () => {
    await delay();
    logoutUser();
    return { error: null };
  },

  getCurrentUser: () => {
    return getCurrentUser();
  }
};