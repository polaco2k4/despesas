import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Pede utilizador e senha (HTTP Basic) quando a API é aberta diretamente no browser.
// Os pedidos feitos pelo frontend (fetch/XHR) não são navegações e passam sem desafio.
const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const isBrowserNavigation = (req: Request) => {
  const fetchMode = req.headers['sec-fetch-mode'];
  if (fetchMode) return fetchMode === 'navigate';
  return (req.headers.accept || '').includes('text/html');
};

export const apiBrowserAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = process.env.API_DOCS_USER;
  const password = process.env.API_DOCS_PASSWORD;

  if (!user || !password) return next();
  if (!isBrowserNavigation(req)) return next();
  // Downloads abertos pelo frontend com window.open
  if (req.path.includes('/download')) return next();

  const header = req.headers.authorization || '';
  if (header.startsWith('Basic ')) {
    const [reqUser, ...rest] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
    if (safeEqual(reqUser, user) && safeEqual(rest.join(':'), password)) {
      res.locals.browserAuth = true;
      return next();
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="API Gestao de Despesas", charset="UTF-8"');
  res.status(401).json({ error: 'Autenticação necessária' });
};
