import { executeQuery } from '../config/database.js';

async function updateDespesaNumbersToUppercase() {
  try {
    console.log('🔄 Atualizando números de despesas para DESP maiúsculo...');
    
    // Atualizar todas as despesas que têm /desp/ para /DESP/
    const updateQuery = `
      UPDATE despesas 
      SET numero_despesa = REPLACE(numero_despesa, '/desp/', '/DESP/')
      WHERE numero_despesa LIKE '%/desp/%'
    `;
    
    await executeQuery(updateQuery);
    console.log(`✅ Despesas atualizadas com sucesso!`);
    
    // Verificar resultado
    const checkQuery = `
      SELECT COUNT(*) as total 
      FROM despesas 
      WHERE numero_despesa LIKE '%/DESP/%'
    `;
    
    const checkResult = await executeQuery(checkQuery);
    console.log(`📊 Total de despesas com formato DESP: ${checkResult[0].total}`);
    
    console.log('🎉 Atualização concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar números:', error);
    process.exit(1);
  }
}

updateDespesaNumbersToUppercase();
