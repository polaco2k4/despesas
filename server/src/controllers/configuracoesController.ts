import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { executeQuery } from '../config/database.js';

// Imagens configuráveis da página de login
const IMAGENS = {
  logo: { chave: 'logo_login', maxSize: 1 * 1024 * 1024, label: '1 MB' },
  fundo: { chave: 'fundo_login', maxSize: 2 * 1024 * 1024, label: '2 MB' },
} as const;
type TipoImagem = keyof typeof IMAGENS;

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getTipo = (req: Request): TipoImagem | null =>
  req.params.tipo in IMAGENS ? (req.params.tipo as TipoImagem) : null;

// Garante que a tabela existe (uma vez por processo), para não depender de migração manual
let tableReady = false;
const ensureTable = async () => {
  if (tableReady) return;
  await executeQuery(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[configuracoes_sistema]') AND type in (N'U'))
    BEGIN
      CREATE TABLE configuracoes_sistema (
        chave NVARCHAR(100) PRIMARY KEY,
        valor NVARCHAR(MAX) NULL,
        updated_at DATETIME2 DEFAULT GETDATE(),
        updated_by UNIQUEIDENTIFIER NULL
      );
    END
  `);
  tableReady = true;
};

const isAdmin = (req: Request) => req.headers['x-user-role'] === 'admin';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(...Object.values(IMAGENS).map((i) => i.maxSize)) },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido. Use PNG, JPG, WEBP ou SVG.'));
    }
  },
});

// Wrapper para devolver erros do multer (tamanho/tipo) como 400 em português
export const uploadImagemMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single('imagem')(req, res, (err: any) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'A imagem é demasiado grande.' });
    }
    return res.status(400).json({ error: err.message || 'Erro ao carregar o ficheiro.' });
  });
};

export const getPublicConfig = async (_req: Request, res: Response) => {
  try {
    await ensureTable();
    const rows = await executeQuery<{ chave: string; valor: string | null }>(
      'SELECT chave, valor FROM configuracoes_sistema WHERE chave IN (@logo, @fundo)',
      { logo: IMAGENS.logo.chave, fundo: IMAGENS.fundo.chave }
    );
    const valor = (chave: string) => rows.find((r) => r.chave === chave)?.valor || null;
    return res.json({ logo: valor(IMAGENS.logo.chave), fundo: valor(IMAGENS.fundo.chave) });
  } catch (error) {
    console.error('Erro ao obter configurações públicas:', error);
    return res.status(500).json({ error: 'Erro ao obter configurações' });
  }
};

export const uploadImagem = async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Apenas administradores podem alterar as imagens.' });
  }
  const tipo = getTipo(req);
  if (!tipo) {
    return res.status(400).json({ error: 'Tipo de imagem inválido.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
  }
  if (req.file.size > IMAGENS[tipo].maxSize) {
    return res.status(400).json({ error: `A imagem não pode exceder ${IMAGENS[tipo].label}.` });
  }

  try {
    await ensureTable();
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const userId = String(req.headers['x-user-id'] || '');

    await executeQuery(
      `MERGE configuracoes_sistema AS target
       USING (SELECT @chave AS chave) AS source
       ON target.chave = source.chave
       WHEN MATCHED THEN
         UPDATE SET valor = @valor, updated_at = GETDATE(), updated_by = @updated_by
       WHEN NOT MATCHED THEN
         INSERT (chave, valor, updated_by) VALUES (@chave, @valor, @updated_by);`,
      { chave: IMAGENS[tipo].chave, valor: dataUrl, updated_by: GUID_REGEX.test(userId) ? userId : null }
    );

    return res.json({ imagem: dataUrl });
  } catch (error) {
    console.error('Erro ao guardar imagem:', error);
    return res.status(500).json({ error: 'Erro ao guardar a imagem' });
  }
};

export const deleteImagem = async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Apenas administradores podem alterar as imagens.' });
  }
  const tipo = getTipo(req);
  if (!tipo) {
    return res.status(400).json({ error: 'Tipo de imagem inválido.' });
  }

  try {
    await ensureTable();
    await executeQuery('DELETE FROM configuracoes_sistema WHERE chave = @chave', { chave: IMAGENS[tipo].chave });
    return res.json({ imagem: null });
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    return res.status(500).json({ error: 'Erro ao remover a imagem' });
  }
};
