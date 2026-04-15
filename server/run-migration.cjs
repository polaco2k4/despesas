const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'despesas_db',
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  authentication: {
    type: 'default',
    options: {
      userName: '',
      password: ''
    }
  }
};

async function runMigration() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    const pool = await sql.connect(config);
    
    console.log('✅ Conectado!');
    console.log('📄 Lendo arquivo de migração...');
    
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_despesa_anexos_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by GO statements
    const statements = migrationSQL.split(/\bGO\b/i).filter(stmt => stmt.trim());
    
    console.log(`📝 Executando ${statements.length} comandos SQL...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`\n⚙️  Executando comando ${i + 1}/${statements.length}...`);
        const result = await pool.request().query(statement);
        if (result.recordset) {
          console.log('✅ Comando executado com sucesso');
        }
      }
    }
    
    console.log('\n✅ Migração concluída com sucesso!');
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao executar migração:', err);
    process.exit(1);
  }
}

runMigration();
