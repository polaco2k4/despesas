// Importar módulos
import express from 'express';
import cors from 'cors';
import path from 'path';

console.log('🚀 Iniciando servidor de teste...');

try {
  // Criar app básico
  const app = express();
  
  // Middlewares
  app.use(cors());
  app.use(express.json());
  
  // Rota de teste
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'Servidor funcionando!', 
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    });
  });
  
  // Rota para testar documentos
  app.get('/api/documentos-test', async (req, res) => {
    try {
      const { executeQuery } = await import('./src/config/database.ts');
      
      const query = `
        SELECT TOP 3 
          d.id, d.nome, d.numero_documento, d.created_at,
          dep.sigla
        FROM documentos d
        LEFT JOIN departamentos dep ON d.departamento_id = dep.id
        ORDER BY d.created_at DESC
      `;
      
      const results = await executeQuery(query);
      
      res.json({
        success: true,
        data: results,
        count: results.length
      });
      
    } catch (error) {
      console.error('Erro na query:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // Iniciar servidor
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log('📊 Teste: http://localhost:3001/api/test');
    console.log('📄 Documentos: http://localhost:3001/api/documentos-test');
  });
  
} catch (error) {
  console.error('❌ Erro ao iniciar servidor:', error);
  process.exit(1);
}
