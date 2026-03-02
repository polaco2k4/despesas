import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { getConnection, closeConnection } from './config/database.js';

import authRoutes from './routes/auth.js';
import departamentosRoutes from './routes/departamentos.js';
import usuariosRoutes from './routes/usuarios.js';
import usuariosDepartamentosRoutes from './routes/usuariosDepartamentosRoutes.js';
import orcamentosRoutes from './routes/orcamentos.js';
import rubricasRoutes from './routes/rubricas.js';
import despesasRoutes from './routes/despesas.js';
import aprovacoesRoutes from './routes/aprovacoes.js';
import dashboardRoutes from './routes/dashboard.js';
import fornecedoresRoutes from './routes/fornecedores.js';
import notificacoesRoutes from './routes/notificacoes.js';
import documentosRoutes from './routes/documentosRoutes.js';
import expedientesRoutes from './routes/expedientesRoutes.js';
import frotasRoutes from './routes/frotas.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({
  origin: true, // Allow all origins for network access
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-id', 'x-user-role', 'x-user-department-id']
}));

app.use(helmet());
app.use(morgan('dev'));

// Apply JSON parsing to all routes except multipart uploads
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.startsWith('multipart/form-data')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.startsWith('multipart/form-data')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Register document routes
app.use('/api/documentos', documentosRoutes);
app.use('/api/expedientes', expedientesRoutes);

// Middleware para garantir charset UTF-8 em todas as respostas (exceto para uploads)
app.use((req, res, next) => {
  if (!req.path.includes('/documentos') || req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api', usuariosDepartamentosRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/rubricas', rubricasRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/aprovacoes', aprovacoesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/frotas', frotasRoutes);

console.log('🔍 Debug - Routes loaded:');
console.log('- notificacoesRoutes:', !!notificacoesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API está funcionando' });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Gestão de Despesas',
    version: '1.0.0',
    endpoints: {
      departamentos: '/api/departamentos',
      usuarios: '/api/usuarios',
      orcamentos: '/api/orcamentos',
      rubricas: '/api/rubricas',
      despesas: '/api/despesas',
      aprovacoes: '/api/aprovacoes',
      dashboard: '/api/dashboard',
      frotas: '/api/frotas',
      health: '/api/health'
    }
  });
});

const startServer = async () => {
  try {
    await getConnection();
    console.log('✅ Conexão com SQL Server estabelecida');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`📊 API disponível em: http://localhost:${PORT}/api`);
      console.log(`🌐 Acessível na rede em: http://0.0.0.0:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Encerrando servidor...');
  await closeConnection();
  process.exit(0);
});

startServer();
