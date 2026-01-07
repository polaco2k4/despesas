import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { getConnection, closeConnection } from './config/database.js';

import authRoutes from './routes/auth.js';
import departamentosRoutes from './routes/departamentos.js';
import usuariosRoutes from './routes/usuarios.js';
import orcamentosRoutes from './routes/orcamentos.js';
import rubricasRoutes from './routes/rubricas.js';
import despesasRoutes from './routes/despesas.js';
import aprovacoesRoutes from './routes/aprovacoes.js';
import dashboardRoutes from './routes/dashboard.js';
import fornecedoresRoutes from './routes/fornecedores.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para garantir charset UTF-8 em todas as respostas
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use(cors({
  origin: true, // Allow all origins for network access
  credentials: true
}));

app.use('/api/auth', authRoutes);
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/rubricas', rubricasRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/aprovacoes', aprovacoesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);

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
