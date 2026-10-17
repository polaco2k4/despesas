import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/authToken.js';

// Rotas acessíveis sem sessão (ecrã de login)
const PUBLIC_PATHS = ['/auth/login', '/health', '/configuracoes/publicas'];

const USER_HEADERS = ['x-user-id', 'x-user-role', 'x-user-department-id'];

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS' || PUBLIC_PATHS.includes(req.path)) return next();

  // Os cabeçalhos x-user-* passam a vir apenas do token, nunca do cliente
  USER_HEADERS.forEach(h => delete req.headers[h]);

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : typeof req.query.token === 'string' ? req.query.token : '';

  const payload = token ? verifyToken(token) : null;
  if (payload) {
    req.headers['x-user-id'] = payload.id;
    req.headers['x-user-role'] = payload.role;
    if (payload.departamento_id) req.headers['x-user-department-id'] = payload.departamento_id;
    return next();
  }

  // Consulta da API no browser com o utilizador/senha do apiBrowserAuth (só leitura)
  if (res.locals.browserAuth && req.method === 'GET') return next();

  res.status(401).json({ error: 'Sessão inválida ou expirada' });
};

// Utilizador autenticado (preenchido pelo requireAuth a partir do token)
export const getAuthUser = (req: Request) => ({
  id: (req.headers['x-user-id'] as string) || null,
  role: (req.headers['x-user-role'] as string) || null,
  departamento_id: (req.headers['x-user-department-id'] as string) || null
});

export const sameUser = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (getAuthUser(req).role === 'admin') return next();
  res.status(403).json({ error: 'Apenas administradores podem realizar esta operação' });
};

// Rotas /usuario/:usuarioId só podem ser usadas pelo próprio utilizador
export const requireSelf = (param: string) => (req: Request, res: Response, next: NextFunction) => {
  if (sameUser(req.params[param], getAuthUser(req).id)) return next();
  res.status(403).json({ error: 'Acesso negado' });
};
