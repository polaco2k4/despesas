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
  const headers: Record<string, string> = {};
  
  // Only add Content-Type: application/json if body is not FormData
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add user context headers for role-based access control
  const userProfile = JSON.parse(localStorage.getItem('sgbd_user') || '{}');
  if (userProfile.id) {
    headers['x-user-id'] = userProfile.id;
    headers['x-user-role'] = userProfile.role;
    if (userProfile.departamento_id) {
      headers['x-user-department-id'] = userProfile.departamento_id;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Details:', {
      status: response.status,
      statusText: response.statusText,
      url: `${API_BASE_URL}${endpoint}`,
      errorBody: errorText
    });
    throw new Error(`API Error: ${response.statusText} - ${errorText}`);
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
  getAll: (filters?: { 
    status?: string; 
    usuario_id?: string; 
    departamento_id?: string; 
    departamento_ids?: string[];
    user_role?: string;
    user_departamento_id?: string;
    data_inicio?: string;
    data_fim?: string;
    rubrica_id?: string;
    valor_min?: number;
    valor_max?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.usuario_id) params.append('usuario_id', filters.usuario_id);
    if (filters?.departamento_id) params.append('departamento_id', filters.departamento_id);
    if (filters?.departamento_ids) {
      filters.departamento_ids.forEach(id => params.append('departamento_ids', id));
    }
    if (filters?.user_role) params.append('user_role', filters.user_role);
    if (filters?.user_departamento_id) params.append('user_departamento_id', filters.user_departamento_id);
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);
    if (filters?.rubrica_id) params.append('rubrica_id', filters.rubrica_id);
    if (filters?.valor_min) params.append('valor_min', filters.valor_min.toString());
    if (filters?.valor_max) params.append('valor_max', filters.valor_max.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    console.log('🔍 API Debug - Final URL:', `/despesas${query}`);
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

export const usuariosDepartamentosAPI = {
  getUserDepartamentos: (usuarioId: string) =>
    fetchAPI<any[]>(`/usuarios/${usuarioId}/departamentos`),
  
  addUserDepartamento: (usuarioId: string, departamentoId: string) =>
    fetchAPI<any[]>(`/usuarios/${usuarioId}/departamentos`, {
      method: 'POST',
      body: JSON.stringify({ departamento_id: departamentoId }),
    }),
  
  removeUserDepartamento: (usuarioId: string, departamentoId: string) =>
    fetchAPI<void>(`/usuarios/${usuarioId}/departamentos/${departamentoId}`, {
      method: 'DELETE',
    }),
  
  updateUserDepartamentos: (usuarioId: string, departamentoIds: string[]) =>
    fetchAPI<any[]>(`/usuarios/${usuarioId}/departamentos`, {
      method: 'PUT',
      body: JSON.stringify({ departamento_ids: departamentoIds }),
    }),
};

export const notificacoesAPI = {
  getByUsuario: (usuarioId: string, naoLidasApenas?: boolean) => {
    const params = new URLSearchParams();
    if (naoLidasApenas) params.append('naoLidasApenas', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<any[]>(`/notificacoes/usuario/${usuarioId}${query}`);
  },
  
  create: (data: {
    usuario_id: string;
    titulo: string;
    mensagem: string;
    tipo: 'info' | 'success' | 'warning' | 'error';
    categoria: 'despesa' | 'aprovacao' | 'sistema';
    acao_id?: string;
  }) =>
    fetchAPI<any>('/notificacoes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  marcarComoLida: (id: string, usuarioId: string) =>
    fetchAPI<void>(`/notificacoes/${id}/marcar-lida`, {
      method: 'PATCH',
      body: JSON.stringify({ usuarioId }),
    }),
  
  marcarTodasComoLidas: (usuarioId: string) =>
    fetchAPI<void>(`/notificacoes/usuario/${usuarioId}/marcar-todas-lidas`, {
      method: 'PATCH',
    }),
  
  delete: (id: string, usuarioId: string) =>
    fetchAPI<void>(`/notificacoes/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ usuarioId }),
    }),
  
  getContagemNaoLidas: (usuarioId: string) =>
    fetchAPI<{ count: number }>(`/notificacoes/usuario/${usuarioId}/nao-lidas`),
};

export interface DocumentoFilters {
  categoria?: string;
  departamento_id?: string;
  criado_por?: string;
  publico?: boolean;
  ativo?: boolean;
}

export const documentosAPI = {
  getAll: (filters?: any) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return fetchAPI<Documento[]>(`/documentos${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id: string) => fetchAPI<Documento>(`/documentos/${id}`),
  create: (formData: FormData) => fetchAPI<Documento>('/documentos', {
    method: 'POST',
    body: formData
  }),
  update: (id: string, data: any) => fetchAPI<Documento>(`/documentos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  delete: (id: string) => fetchAPI(`/documentos/${id}`, { method: 'DELETE' }),
  download: async (filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/documentos/download/${filename}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Get the filename from Content-Disposition header or use the provided filename
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = filename;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          downloadFilename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  },
  downloadById: async (documentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/documentos/download-by-id/${documentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = 'document';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          downloadFilename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  },
  getHistorico: (documentoId: string) => fetchAPI<any[]>(`/documentos/${documentoId}/historico`),
  
  // Comentários
  getComentarios: (documentoId: string) => fetchAPI<any[]>(`/documentos/${documentoId}/comentarios`),
  createComentario: (documentoId: string, comentario: string) => fetchAPI<any>(`/documentos/${documentoId}/comentarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comentario })
  }),
  updateComentario: (comentarioId: string, comentario: string) => fetchAPI<any>(`/documentos/comentarios/${comentarioId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comentario })
  }),
  deleteComentario: (comentarioId: string) => fetchAPI(`/documentos/comentarios/${comentarioId}`, { method: 'DELETE' }),
};

import type { Expediente, ExpedienteFilters, ExpedienteDocumento, Documento } from '../types/database';

export const expedientesAPI = {
  getAll: (filters?: ExpedienteFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return fetchAPI<Expediente[]>(`/expedientes${queryString ? `?${queryString}` : ''}`);
  },
  
  getById: (id: string) => fetchAPI<Expediente>(`/expedientes/${id}`),
  
  create: (data: {
    titulo: string;
    descricao?: string;
    tipo: string;
    prioridade?: string;
    data_prazo?: string;
    responsavel_id?: string;
    departamento_id?: string;
    observacoes?: string;
    publico?: boolean;
  }) => fetchAPI<Expediente>('/expedientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  
  update: (id: string, data: {
    titulo?: string;
    descricao?: string;
    tipo?: string;
    status?: string;
    prioridade?: string;
    data_prazo?: string;
    data_fechamento?: string;
    responsavel_id?: string;
    departamento_id?: string;
    observacoes?: string;
    publico?: boolean;
  }) => fetchAPI<Expediente>(`/expedientes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  
  delete: (id: string) => fetchAPI(`/expedientes/${id}`, { method: 'DELETE' }),
  
  // Document management
  getDocumentos: (expedienteId: string) => fetchAPI<ExpedienteDocumento[]>(`/expedientes/${expedienteId}/documentos`),
  
  addDocumento: (expedienteId: string, data: {
    documento_id: string;
    observacoes?: string;
  }) => fetchAPI<any>(`/expedientes/${expedienteId}/documentos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  
  removeDocumento: (expedienteId: string, documentoId: string) => 
    fetchAPI(`/expedientes/${expedienteId}/documentos/${documentoId}`, { method: 'DELETE' }),
  
  // History
  getHistorico: (expedienteId: string) => fetchAPI<any[]>(`/expedientes/${expedienteId}/historico`),
  
  // Comments
  getComentarios: (expedienteId: string) => fetchAPI<any[]>(`/expedientes/${expedienteId}/comentarios`),
  createComentario: (expedienteId: string, comentario: string) => fetchAPI<any>(`/expedientes/${expedienteId}/comentarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comentario })
  }),
  updateComentario: (comentarioId: string, comentario: string) => fetchAPI<any>(`/expedientes/comentarios/${comentarioId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comentario })
  }),
  deleteComentario: (comentarioId: string) => fetchAPI(`/expedientes/comentarios/${comentarioId}`, { method: 'DELETE' }),
};
