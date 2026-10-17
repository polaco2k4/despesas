import { API_BASE_URL } from './backendApi';

export const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'sgbd_user';

export const getAuthToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

// Acrescenta o token a URLs abertos diretamente no browser (ex.: window.open de downloads)
export const withAuthToken = (url: string) => {
  const token = getAuthToken();
  if (!token) return url;
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
};

// Envia o token de sessão em todos os pedidos à API e termina a sessão se ele expirar
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(API_BASE_URL)) {
    return originalFetch(input, init);
  }

  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }

  const response = await originalFetch(input, { ...init, headers });

  if (response.status === 401 && token && !url.includes('/auth/login')) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    window.location.reload();
  }

  return response;
};
