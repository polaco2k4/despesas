import { executeQuery } from '../config/database.js';

async function resetAndGenerateNumbers() {
  try {
    console.log('🔄 Limpando tabela de sequência...');
    
    // Limpar tabela de sequência
    await executeQuery('DELETE FROM documento_sequencia');
    console.log('✅ Tabela de sequência limpa!');
    
    console.log('🔄 Gerando números para documentos existentes...');
    
    // Buscar todos os documentos que não têm número
    const documentsQuery = `
      SELECT d.id, d.departamento_id, d.created_at, dep.sigla
      FROM documentos d
      LEFT JOIN departamentos dep ON d.departamento_id = dep.id
      WHERE d.numero_documento IS NULL OR d.numero_documento = ''
      ORDER BY d.created_at
    `;
    
    const documents = await executeQuery(documentsQuery);
    console.log(`📄 Encontrados ${documents.length} documentos sem número`);
    
    for (const doc of documents) {
      const year = new Date(doc.created_at).getFullYear();
      const deptSigla = doc.sigla || 'GER';
      
      // Verificar sequência para este departamento/ano
      const sequenceQuery = `
        SELECT proximo_numero 
        FROM documento_sequencia 
        WHERE departamento_id = @departamentoId AND ano = @year
      `;
      
      let nextNumber = 1;
      const sequenceResult = await executeQuery(sequenceQuery, { 
        departamentoId: doc.departamento_id || null, 
        year 
      });
      
      if (sequenceResult.length > 0) {
        nextNumber = sequenceResult[0].proximo_numero;
        
        // Atualizar sequência
        const updateQuery = `
          UPDATE documento_sequencia 
          SET proximo_numero = proximo_numero + 1, updated_at = GETDATE()
          WHERE departamento_id = @departamentoId AND ano = @year
        `;
        await executeQuery(updateQuery, { 
          departamentoId: doc.departamento_id || null, 
          year 
        });
      } else {
        // Criar nova sequência
        const insertQuery = `
          INSERT INTO documento_sequencia (departamento_id, ano, proximo_numero)
          VALUES (@departamentoId, @year, 2)
        `;
        await executeQuery(insertQuery, { 
          departamentoId: doc.departamento_id || null, 
          year 
        });
      }
      
      // Gerar número no formato xxxx/sigla/yyyy
      const sequentialNumber = nextNumber.toString().padStart(4, '0');
      const numeroDocumento = `${sequentialNumber}/${deptSigla}/${year}`;
      
      // Atualizar documento
      const updateDocQuery = `
        UPDATE documentos 
        SET numero_documento = @numeroDocumento
        WHERE id = @id
      `;
      
      await executeQuery(updateDocQuery, {
        numeroDocumento,
        id: doc.id
      });
      
      console.log(`✅ Documento ${doc.id} atualizado: ${numeroDocumento}`);
    }
    
    console.log('🎉 Numeração gerada para todos os documentos existentes!');
    
  } catch (error) {
    console.error('❌ Erro ao gerar números:', error);
    process.exit(1);
  }
}

resetAndGenerateNumbers();
