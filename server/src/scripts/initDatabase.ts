import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getConnection, closeConnection } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDatabase() {
  try {
    console.log('🔄 Iniciando criação do banco de dados...\n');

    const connection = await getConnection();

    const schemaPath = join(__dirname, '../../database/schema.sql');
    const seedPath = join(__dirname, '../../database/seed.sql');

    console.log('📄 Executando schema.sql...');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    
    const schemaBatches = schemaSQL
      .split('GO')
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    for (const batch of schemaBatches) {
      await connection.request().query(batch);
    }
    console.log('✅ Schema criado com sucesso!\n');

    console.log('📄 Executando seed.sql...');
    const seedSQL = readFileSync(seedPath, 'utf-8');
    
    const seedBatches = seedSQL
      .split('GO')
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    for (const batch of seedBatches) {
      await connection.request().query(batch);
    }
    console.log('✅ Dados iniciais inseridos com sucesso!\n');

    console.log('🎉 Banco de dados inicializado com sucesso!');
    console.log('\n📋 Credenciais de acesso:');
    console.log('   Email: admin@empresa.ao');
    console.log('   Senha: senha123\n');

    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    await closeConnection();
    process.exit(1);
  }
}

initDatabase();
