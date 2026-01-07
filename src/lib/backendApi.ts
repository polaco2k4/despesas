// Dynamic API URL based on current hostname
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  // If accessing via IP or non-localhost, use the same hostname for API
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const authAPI = {
  signIn: async (email: string, password: string) => {
    try {
      const result = await fetchAPI<{ user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return { user: result.user, error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { user: null, error: 'Email ou senha inválidos' };
    }
  },
  
  signOut: async () => {
    return { error: null };
  },
  
  getCurrentUser: async () => {
    try {
      const result = await fetchAPI<{ user: any }>('/auth/current-user');
      return result.user;
    } catch (error) {
      return null;
    }
  },
};

export const departamentosAPI = {
  getAll: () => fetchAPI<any[]>('/departamentos'),
  
  create: (data: { nome: string; sigla?: string }) =>
    fetchAPI<any>('/departamentos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: { nome?: string; sigla?: string }) =>
    fetchAPI<any>(`/departamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<void>(`/departamentos/${id}`, {
      method: 'DELETE',
    }),
};

export const orcamentosAPI = {
  getAll: () => fetchAPI<any[]>('/orcamentos'),
  
  getById: (id: string) => fetchAPI<any>(`/orcamentos/${id}`),
  
  create: (data: { departamento_id: string; ano: number; valor_total: number }) =>
    fetchAPI<any>('/orcamentos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: { departamento_id?: string; ano?: number; valor_total?: number }) =>
    fetchAPI<any>(`/orcamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<void>(`/orcamentos/${id}`, {
      method: 'DELETE',
    }),
};

export const usuariosAPI = {
  getAll: () => fetchAPI<any[]>('/usuarios'),
  
  getById: (id: string) => fetchAPI<any>(`/usuarios/${id}`),
  
  create: (data: any) =>
    fetchAPI<any>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    fetchAPI<any>(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<void>(`/usuarios/${id}`, {
      method: 'DELETE',
    }),
};

export const rubricasAPI = {
  getAll: () => fetchAPI<any[]>('/rubricas'),
  
  getByOrcamento: (orcamentoId: string) =>
    fetchAPI<any[]>(`/rubricas/orcamento/${orcamentoId}`),
  
  create: (data: any) =>
    fetchAPI<any>('/rubricas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    fetchAPI<any>(`/rubricas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<void>(`/rubricas/${id}`, {
      method: 'DELETE',
    }),
};

export const despesasAPI = {
  getAll: (filters?: { status?: string; usuario_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.usuario_id) params.append('usuario_id', filters.usuario_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<any[]>(`/despesas${query}`);
  },
  
  getById: (id: string) => fetchAPI<any>(`/despesas/${id}`),
  
  create: (data: any) =>
    fetchAPI<any>('/despesas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    fetchAPI<any>(`/despesas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<void>(`/despesas/${id}`, {
      method: 'DELETE',
    }),
};

export const aprovacoesAPI = {
  getAll: () => fetchAPI<any[]>('/aprovacoes'),
  
  create: (data: any) =>
    fetchAPI<any>('/aprovacoes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const fornecedoresAPI = {
  getAll: () => fetchAPI<any[]>('/fornecedores'),
  
  create: (data: { nome: string; nif?: string; contacto?: string; email?: string }) =>
    fetchAPI<any>('/fornecedores', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    fetchAPI<any>(`/fornecedores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchAPI<void>(`/fornecedores/${id}`, {
      method: 'DELETE',
    }),
};

export const dashboardAPI = {
  getStats: (filters?: { userId?: string; userRole?: string; departamentoId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.userRole) params.append('userRole', filters.userRole);
    if (filters?.departamentoId) params.append('departamentoId', filters.departamentoId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<any>(`/dashboard/stats${query}`);
  },
  
  getDailyExpenses: (filters?: { userId?: string; userRole?: string; departamentoId?: string; period?: string }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.userRole) params.append('userRole', filters.userRole);
    if (filters?.departamentoId) params.append('departamentoId', filters.departamentoId);
    if (filters?.period) params.append('period', filters.period);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<any[]>(`/dashboard/daily-expenses${query}`);
  },
};
