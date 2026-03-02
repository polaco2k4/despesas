import { executeQuery } from '../config/database.js';

async function generateExistingExpedienteNumbers() {
  try {
    console.log('🔄 Gerando números para expedientes existentes...');
    
    // Limpar tabela de sequência
    await executeQuery('DELETE FROM expediente_sequencia');
    console.log('✅ Tabela de sequência limpa!');
    
    // Buscar todos os expedientes que não têm número
    const expedientesQuery = `
      SELECT e.id, e.created_at, e.departamento_id, d.sigla
      FROM expedientes e
      LEFT JOIN departamentos d ON e.departamento_id = d.id
      WHERE e.numero_expediente IS NULL OR e.numero_expediente = ''
      ORDER BY e.created_at
    `;
    
    const expedientes = await executeQuery(expedientesQuery);
    console.log(`📄 Encontrados ${expedientes.length} expedientes sem número`);
    
    for (const expediente of expedientes) {
      const year = new Date(expediente.created_at).getFullYear();
      const deptSigla = expediente.sigla || 'GER';
      
      // Verificar sequência para este departamento/ano
      const sequenceQuery = `
        SELECT proximo_numero 
        FROM expediente_sequencia 
        WHERE departamento_id = @departamentoId AND ano = @year
      `;
      
      let nextNumber = 1;
      const sequenceResult = await executeQuery(sequenceQuery, { 
        departamentoId: expediente.departamento_id || null, 
        year 
      });
      
      if (sequenceResult.length > 0) {
        nextNumber = sequenceResult[0].proximo_numero;
        
        // Atualizar sequência
        const updateQuery = `
          UPDATE expediente_sequencia 
          SET proximo_numero = proximo_numero + 1, updated_at = GETDATE()
          WHERE departamento_id = @departamentoId AND ano = @year
        `;
        await executeQuery(updateQuery, { 
          departamentoId: expediente.departamento_id || null, 
          year 
        });
      } else {
        // Criar nova sequência
        const insertQuery = `
          INSERT INTO expediente_sequencia (departamento_id, ano, proximo_numero)
          VALUES (@departamentoId, @year, 2)
        `;
        await executeQuery(insertQuery, { 
          departamentoId: expediente.departamento_id || null, 
          year 
        });
      }
      
      // Gerar número no formato xxxx/EXP/sigla/yyyy
      const sequentialNumber = nextNumber.toString().padStart(4, '0');
      const numeroExpediente = `${sequentialNumber}/EXP/${deptSigla}/${year}`;
      
      // Atualizar expediente
      const updateExpedienteQuery = `
        UPDATE expedientes 
        SET numero_expediente = @numeroExpediente
        WHERE id = @id
      `;
      
      await executeQuery(updateExpedienteQuery, {
        numeroExpediente,
        id: expediente.id
      });
      
      console.log(`✅ Expediente ${expediente.id} atualizado: ${numeroExpediente}`);
    }
    
    console.log('🎉 Numeração gerada para todos os expedientes existentes!');
    
  } catch (error) {
    console.error('❌ Erro ao gerar números:', error);
    process.exit(1);
  }
}

generateExistingExpedienteNumbers();
