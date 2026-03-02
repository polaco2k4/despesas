import { executeQuery } from '../config/database.js';

async function testDocumentNumbers() {
  try {
    console.log('🔍 Verificando documentos no banco...');
    
    const query = `
      SELECT TOP 5 
        d.id, d.nome, d.numero_documento, d.created_at,
        dep.sigla
      FROM documentos d
      LEFT JOIN departamentos dep ON d.departamento_id = dep.id
      ORDER BY d.created_at DESC
    `;
    
    const results = await executeQuery(query);
    
    console.log('📄 Documentos encontrados:');
    results.forEach((doc, index) => {
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Nome: ${doc.nome}`);
      console.log(`   Número: ${doc.numero_documento || 'NULL'}`);
      console.log(`   Departamento: ${doc.sigla || 'NULL'}`);
      console.log(`   Criado em: ${doc.created_at}`);
      console.log('---');
    });
    
    // Verificar campo específico
    const checkFieldQuery = `
      SELECT COUNT(*) as count 
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('documentos') AND name = 'numero_documento'
    `;
    
    const fieldResult = await executeQuery(checkFieldQuery);
    console.log(`✅ Campo numero_documento existe: ${fieldResult[0].count > 0 ? 'SIM' : 'NÃO'}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testDocumentNumbers();
