import { executeQuery } from '../config/database.js';

async function generateExistingDespesaNumbers() {
  try {
    console.log('🔄 Gerando números para despesas existentes...');
    
    // Limpar tabela de sequência
    await executeQuery('DELETE FROM despesa_sequencia');
    console.log('✅ Tabela de sequência limpa!');
    
    // Buscar todas as despesas que não têm número
    const despesasQuery = `
      SELECT d.id, d.created_at, o.departamento_id, dep.sigla
      FROM despesas d
      LEFT JOIN rubricas r ON d.rubrica_id = r.id
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      LEFT JOIN departamentos dep ON o.departamento_id = dep.id
      WHERE d.numero_despesa IS NULL OR d.numero_despesa = ''
      ORDER BY d.created_at
    `;
    
    const despesas = await executeQuery(despesasQuery);
    console.log(`📄 Encontradas ${despesas.length} despesas sem número`);
    
    for (const despesa of despesas) {
      const year = new Date(despesa.created_at).getFullYear();
      const deptSigla = despesa.sigla || 'GER';
      
      // Verificar sequência para este departamento/ano
      const sequenceQuery = `
        SELECT proximo_numero 
        FROM despesa_sequencia 
        WHERE departamento_id = @departamentoId AND ano = @year
      `;
      
      let nextNumber = 1;
      const sequenceResult = await executeQuery(sequenceQuery, { 
        departamentoId: despesa.departamento_id || null, 
        year 
      });
      
      if (sequenceResult.length > 0) {
        nextNumber = sequenceResult[0].proximo_numero;
        
        // Atualizar sequência
        const updateQuery = `
          UPDATE despesa_sequencia 
          SET proximo_numero = proximo_numero + 1, updated_at = GETDATE()
          WHERE departamento_id = @departamentoId AND ano = @year
        `;
        await executeQuery(updateQuery, { 
          departamentoId: despesa.departamento_id || null, 
          year 
        });
      } else {
        // Criar nova sequência
        const insertQuery = `
          INSERT INTO despesa_sequencia (departamento_id, ano, proximo_numero)
          VALUES (@departamentoId, @year, 2)
        `;
        await executeQuery(insertQuery, { 
          departamentoId: despesa.departamento_id || null, 
          year 
        });
      }
      
      // Gerar número no formato xxxx/DESP/sigla/yyyy
      const sequentialNumber = nextNumber.toString().padStart(4, '0');
      const numeroDespesa = `${sequentialNumber}/DESP/${deptSigla}/${year}`;
      
      // Atualizar despesa
      const updateDespesaQuery = `
        UPDATE despesas 
        SET numero_despesa = @numeroDespesa
        WHERE id = @id
      `;
      
      await executeQuery(updateDespesaQuery, {
        numeroDespesa,
        id: despesa.id
      });
      
      console.log(`✅ Despesa ${despesa.id} atualizada: ${numeroDespesa}`);
    }
    
    console.log('🎉 Numeração gerada para todas as despesas existentes!');
    
  } catch (error) {
    console.error('❌ Erro ao gerar números:', error);
    process.exit(1);
  }
}

generateExistingDespesaNumbers();
