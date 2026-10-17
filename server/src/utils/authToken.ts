import crypto from 'crypto';

// Token assinado (formato JWT HS256) emitido no login e validado em cada pedido à API.
export interface TokenPayload {
  id: string;
  role: string;
  departamento_id?: string | null;
  exp: number;
}

// Lido só quando é usado: os imports ESM correm antes do dotenv.config() do index.ts
let secret = '';
const getSecret = () => {
  if (!secret) {
    secret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET não definido no .env - sessões serão perdidas ao reiniciar o servidor');
    }
  }
  return secret;
};

const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

const sign = (data: string) => crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');

export const createToken = (user: { id: string; role: string; departamento_id?: string | null }) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: TokenPayload = {
    id: user.id,
    role: user.role,
    departamento_id: user.departamento_id || null,
    exp: Math.floor(Date.now() / 1000) + Number(process.env.AUTH_TOKEN_TTL_HOURS || 12) * 60 * 60
  };
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
};

export const verifyToken = (token: string): TokenPayload | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${body}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.id || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};
