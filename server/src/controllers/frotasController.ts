import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import { sanitizeSolicitacaoFields, detectMaliciousPatterns } from '../utils/sanitize.js';

const WEBHOOK_URL = 'https://hook.eu2.make.com/vmglrak6t8op535e62b7rwo8cbbprrw8';

const formatDateToPortugueseWAT = (date: Date | string | null | undefined): string => {
  if (!date) {
    console.log('⚠️ formatDateToPortugueseWAT: date is null/undefined');
    return '';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      console.log('⚠️ formatDateToPortugueseWAT: Invalid date:', date);
      return '';
    }
    
    // Formatar para WAT (West Africa Time - UTC+1)
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Lagos', // WAT timezone
      hour12: false
    };
    
    const formatted = new Intl.DateTimeFormat('pt-PT', options).format(dateObj);
    const result = formatted.replace(',', '');
    console.log(`✅ formatDateToPortugueseWAT: ${date} -> ${result}`);
    return result;
  } catch (error) {
    console.error('❌ Error formatting date:', error, 'Date:', date);
    return '';
  }
};

const sendToWebhook = async (data: any) => {
  try {
    console.log('📤 Sending to webhook:', JSON.stringify(data, null, 2));
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ Webhook error:', response.status, response.statusText);
      console.error('Response body:', responseText);
    } else {
      console.log('✅ Webhook sent successfully');
      console.log('Response:', responseText);
    }
  } catch (error) {
    console.error('❌ Error sending to webhook:', error);
  }
};

export const getAllVeiculos = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        v.*,
        d.nome as departamento_nome,
        u.nome as condutor_nome
      FROM veiculos v
      LEFT JOIN departamentos d ON v.departamento_id = d.id
      LEFT JOIN usuarios u ON v.condutor_atual_id = u.id
      ORDER BY v.matricula
    `;
    const results = await executeQuery(query);
    return res.json(results);
  } catch (error) {
    console.error('Error fetching veiculos:', error);
    return res.status(500).json({ error: 'Erro ao buscar veículos' });
  }
};

export const getVeiculoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        v.*,
        d.nome as departamento_nome,
        u.nome as condutor_nome
      FROM veiculos v
      LEFT JOIN departamentos d ON v.departamento_id = d.id
      LEFT JOIN usuarios u ON v.condutor_atual_id = u.id
      WHERE v.id = @id
    `;
    const results = await executeQuery(query, { id });
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }
    
    return res.json(results[0]);
  } catch (error) {
    console.error('Error fetching veiculo:', error);
    return res.status(500).json({ error: 'Erro ao buscar veículo' });
  }
};

export const createVeiculo = async (req: Request, res: Response) => {
  try {
    const { 
      matricula, marca, modelo, ano, tipo, cor, numero_chassis,
      departamento_id, condutor_atual_id, quilometragem_atual,
      capacidade_tanque, consumo_medio, data_aquisicao, valor_aquisicao,
      status, observacoes
    } = req.body;
    
    if (!matricula || !marca || !modelo || !ano || !tipo) {
      return res.status(400).json({ error: 'Campos obrigatórios: matricula, marca, modelo, ano, tipo' });
    }

    const query = `
      INSERT INTO veiculos (
        matricula, marca, modelo, ano, tipo, cor, numero_chassis,
        departamento_id, condutor_atual_id, quilometragem_atual,
        capacidade_tanque, consumo_medio, data_aquisicao, valor_aquisicao,
        status, observacoes
      )
      OUTPUT INSERTED.*
      VALUES (
        @matricula, @marca, @modelo, @ano, @tipo, @cor, @numero_chassis,
        @departamento_id, @condutor_atual_id, @quilometragem_atual,
        @capacidade_tanque, @consumo_medio, @data_aquisicao, @valor_aquisicao,
        @status, @observacoes
      )
    `;
    const result = await executeQuery(query, { 
      matricula, marca, modelo, ano, tipo, cor, numero_chassis,
      departamento_id, condutor_atual_id, 
      quilometragem_atual: quilometragem_atual || 0,
      capacidade_tanque, consumo_medio, data_aquisicao, valor_aquisicao,
      status: status || 'ativo', observacoes
    });
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating veiculo:', error);
    return res.status(500).json({ error: 'Erro ao criar veículo' });
  }
};

export const updateVeiculo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    const allowedFields = [
      'matricula', 'marca', 'modelo', 'ano', 'tipo', 'cor', 'numero_chassis',
      'departamento_id', 'condutor_atual_id', 'quilometragem_atual',
      'capacidade_tanque', 'consumo_medio', 'data_aquisicao', 'valor_aquisicao',
      'status', 'observacoes'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = @${field}`);
        params[field] = updates[field];
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE veiculos
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating veiculo:', error);
    return res.status(500).json({ error: 'Erro ao atualizar veículo' });
  }
};

export const deleteVeiculo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `DELETE FROM veiculos WHERE id = @id`;
    await executeQuery(query, { id });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting veiculo:', error);
    res.status(500).json({ error: 'Erro ao deletar veículo' });
  }
};

export const getAllManutencoes = async (req: Request, res: Response) => {
  try {
    const { veiculo_id } = req.query;
    
    let query = `
      SELECT 
        m.*,
        v.matricula as veiculo_matricula,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        f.nome as fornecedor_nome,
        u.nome as responsavel_nome
      FROM manutencoes m
      LEFT JOIN veiculos v ON m.veiculo_id = v.id
      LEFT JOIN fornecedores f ON m.fornecedor_id = f.id
      LEFT JOIN usuarios u ON m.responsavel_id = u.id
    `;
    
    const params: any = {};
    if (veiculo_id) {
      query += ` WHERE m.veiculo_id = @veiculo_id`;
      params.veiculo_id = veiculo_id;
    }
    
    query += ` ORDER BY m.data_manutencao DESC`;
    
    const results = await executeQuery(query, params);
    res.json(results);
  } catch (error) {
    console.error('Error fetching manutencoes:', error);
    res.status(500).json({ error: 'Erro ao buscar manutenções' });
  }
};

export const createManutencao = async (req: Request, res: Response) => {
  try {
    const { 
      veiculo_id, tipo, descricao, data_manutencao, quilometragem,
      custo, fornecedor_id, proximo_servico_km, proximo_servico_data,
      status, responsavel_id, observacoes
    } = req.body;
    
    if (!veiculo_id || !tipo || !descricao || !data_manutencao || custo === undefined) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: veiculo_id, tipo, descricao, data_manutencao, custo' 
      });
    }

    const query = `
      INSERT INTO manutencoes (
        veiculo_id, tipo, descricao, data_manutencao, quilometragem,
        custo, fornecedor_id, proximo_servico_km, proximo_servico_data,
        status, responsavel_id, observacoes
      )
      OUTPUT INSERTED.*
      VALUES (
        @veiculo_id, @tipo, @descricao, @data_manutencao, @quilometragem,
        @custo, @fornecedor_id, @proximo_servico_km, @proximo_servico_data,
        @status, @responsavel_id, @observacoes
      )
    `;
    
    const result = await executeQuery(query, { 
      veiculo_id, 
      tipo, 
      descricao, 
      data_manutencao: data_manutencao ? new Date(data_manutencao) : new Date(),
      quilometragem: quilometragem ? parseFloat(quilometragem) : null,
      custo: parseFloat(custo), 
      fornecedor_id: fornecedor_id || null, 
      proximo_servico_km: proximo_servico_km ? parseFloat(proximo_servico_km) : null, 
      proximo_servico_data: proximo_servico_data ? new Date(proximo_servico_data) : null,
      status: status || 'concluida', 
      responsavel_id: responsavel_id || null, 
      observacoes: observacoes || null
    });
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating manutencao:', error);
    return res.status(500).json({ error: 'Erro ao criar manutenção', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateManutencao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    const allowedFields = [
      'tipo', 'descricao', 'data_manutencao', 'quilometragem',
      'custo', 'fornecedor_id', 'proximo_servico_km', 'proximo_servico_data',
      'status', 'responsavel_id', 'observacoes'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = @${field}`);
        
        // Convert data types properly
        if (field === 'data_manutencao' || field === 'proximo_servico_data') {
          params[field] = updates[field] ? new Date(updates[field]) : null;
        } else if (field === 'quilometragem' || field === 'custo' || field === 'proximo_servico_km') {
          params[field] = updates[field] ? parseFloat(updates[field]) : null;
        } else if (field === 'fornecedor_id' || field === 'responsavel_id' || field === 'observacoes') {
          params[field] = updates[field] || null;
        } else {
          params[field] = updates[field];
        }
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE manutencoes
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating manutencao:', error);
    return res.status(500).json({ error: 'Erro ao atualizar manutenção', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const deleteManutencao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `DELETE FROM manutencoes WHERE id = @id`;
    await executeQuery(query, { id });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting manutencao:', error);
    res.status(500).json({ error: 'Erro ao deletar manutenção' });
  }
};

export const getAllAbastecimentos = async (req: Request, res: Response) => {
  try {
    const { veiculo_id } = req.query;
    
    let query = `
      SELECT 
        a.*,
        v.matricula as veiculo_matricula,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        u.nome as condutor_nome
      FROM abastecimentos a
      LEFT JOIN veiculos v ON a.veiculo_id = v.id
      LEFT JOIN usuarios u ON a.condutor_id = u.id
    `;
    
    const params: any = {};
    if (veiculo_id) {
      query += ` WHERE a.veiculo_id = @veiculo_id`;
      params.veiculo_id = veiculo_id;
    }
    
    query += ` ORDER BY a.data_abastecimento DESC`;
    
    const results = await executeQuery(query, params);
    res.json(results);
  } catch (error) {
    console.error('Error fetching abastecimentos:', error);
    res.status(500).json({ error: 'Erro ao buscar abastecimentos' });
  }
};

export const createAbastecimento = async (req: Request, res: Response) => {
  try {
    const { 
      veiculo_id, data_abastecimento, quilometragem, litros, preco_litro,
      valor_total, tipo_combustivel, posto, condutor_id, tanque_cheio, observacoes
    } = req.body;
    
    if (!veiculo_id || quilometragem === undefined || !litros || !preco_litro || !valor_total || !tipo_combustivel) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: veiculo_id, quilometragem, litros, preco_litro, valor_total, tipo_combustivel' 
      });
    }

    const query = `
      INSERT INTO abastecimentos (
        veiculo_id, data_abastecimento, quilometragem, litros, preco_litro,
        valor_total, tipo_combustivel, posto, condutor_id, tanque_cheio, observacoes
      )
      OUTPUT INSERTED.*
      VALUES (
        @veiculo_id, @data_abastecimento, @quilometragem, @litros, @preco_litro,
        @valor_total, @tipo_combustivel, @posto, @condutor_id, @tanque_cheio, @observacoes
      )
    `;
    
    // Format data_abastecimento properly
    let dataFormatted = data_abastecimento ? new Date(data_abastecimento) : new Date();
    
    const result = await executeQuery(query, { 
      veiculo_id, 
      data_abastecimento: dataFormatted,
      quilometragem: parseFloat(quilometragem), 
      litros: parseFloat(litros), 
      preco_litro: parseFloat(preco_litro),
      valor_total: parseFloat(valor_total), 
      tipo_combustivel, 
      posto: posto || null, 
      condutor_id: condutor_id || null, 
      tanque_cheio: tanque_cheio === true || tanque_cheio === 1 ? 1 : 0, 
      observacoes: observacoes || null
    });

    // Update vehicle mileage
    await executeQuery(
      `UPDATE veiculos SET quilometragem_atual = @quilometragem WHERE id = @veiculo_id`,
      { quilometragem: parseFloat(quilometragem), veiculo_id }
    );
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating abastecimento:', error);
    return res.status(500).json({ error: 'Erro ao criar abastecimento', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateAbastecimento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    const allowedFields = [
      'data_abastecimento', 'quilometragem', 'litros', 'preco_litro',
      'valor_total', 'tipo_combustivel', 'posto', 'condutor_id', 'tanque_cheio', 'observacoes'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = @${field}`);
        
        // Convert data types properly
        if (field === 'data_abastecimento') {
          params[field] = new Date(updates[field]);
        } else if (field === 'quilometragem' || field === 'litros' || field === 'preco_litro' || field === 'valor_total') {
          params[field] = parseFloat(updates[field]);
        } else if (field === 'tanque_cheio') {
          params[field] = updates[field] === true || updates[field] === 1 ? 1 : 0;
        } else if (field === 'posto' || field === 'condutor_id' || field === 'observacoes') {
          params[field] = updates[field] || null;
        } else {
          params[field] = updates[field];
        }
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE abastecimentos
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Abastecimento não encontrado' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating abastecimento:', error);
    return res.status(500).json({ error: 'Erro ao atualizar abastecimento', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const deleteAbastecimento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `DELETE FROM abastecimentos WHERE id = @id`;
    await executeQuery(query, { id });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting abastecimento:', error);
    res.status(500).json({ error: 'Erro ao deletar abastecimento' });
  }
};

export const getAllAtribuicoes = async (req: Request, res: Response) => {
  try {
    const { veiculo_id, condutor_id } = req.query;
    
    let query = `
      SELECT 
        a.*,
        v.matricula as veiculo_matricula,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        u.nome as condutor_nome
      FROM atribuicoes_veiculos a
      LEFT JOIN veiculos v ON a.veiculo_id = v.id
      LEFT JOIN usuarios u ON a.condutor_id = u.id
      WHERE 1=1
    `;
    
    const params: any = {};
    if (veiculo_id) {
      query += ` AND a.veiculo_id = @veiculo_id`;
      params.veiculo_id = veiculo_id;
    }
    if (condutor_id) {
      query += ` AND a.condutor_id = @condutor_id`;
      params.condutor_id = condutor_id;
    }
    
    query += ` ORDER BY a.data_inicio DESC`;
    
    const results = await executeQuery(query, params);
    res.json(results);
  } catch (error) {
    console.error('Error fetching atribuicoes:', error);
    res.status(500).json({ error: 'Erro ao buscar atribuições' });
  }
};

export const createAtribuicao = async (req: Request, res: Response) => {
  try {
    const { 
      veiculo_id, condutor_id, data_inicio, data_fim,
      quilometragem_inicio, quilometragem_fim, motivo, status
    } = req.body;
    
    if (!veiculo_id || !condutor_id || !data_inicio) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: veiculo_id, condutor_id, data_inicio' 
      });
    }

    const query = `
      INSERT INTO atribuicoes_veiculos (
        veiculo_id, condutor_id, data_inicio, data_fim,
        quilometragem_inicio, quilometragem_fim, motivo, status
      )
      OUTPUT INSERTED.*
      VALUES (
        @veiculo_id, @condutor_id, @data_inicio, @data_fim,
        @quilometragem_inicio, @quilometragem_fim, @motivo, @status
      )
    `;
    const result = await executeQuery(query, { 
      veiculo_id, condutor_id, data_inicio, data_fim,
      quilometragem_inicio, quilometragem_fim, motivo, 
      status: status || 'ativa'
    });

    await executeQuery(
      `UPDATE veiculos SET condutor_atual_id = @condutor_id WHERE id = @veiculo_id`,
      { condutor_id, veiculo_id }
    );
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating atribuicao:', error);
    return res.status(500).json({ error: 'Erro ao criar atribuição' });
  }
};

export const updateAtribuicao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    const allowedFields = [
      'data_fim', 'quilometragem_inicio', 'quilometragem_fim', 'motivo', 'status'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = @${field}`);
        params[field] = updates[field];
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE atribuicoes_veiculos
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Atribuição não encontrada' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating atribuicao:', error);
    return res.status(500).json({ error: 'Erro ao atualizar atribuição' });
  }
};

export const deleteAtribuicao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `DELETE FROM atribuicoes_veiculos WHERE id = @id`;
    await executeQuery(query, { id });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting atribuicao:', error);
    res.status(500).json({ error: 'Erro ao deletar atribuição' });
  }
};

export const getVeiculoStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM manutencoes WHERE veiculo_id = @id) as total_manutencoes,
        (SELECT SUM(custo) FROM manutencoes WHERE veiculo_id = @id) as custo_total_manutencoes,
        (SELECT COUNT(*) FROM abastecimentos WHERE veiculo_id = @id) as total_abastecimentos,
        (SELECT SUM(valor_total) FROM abastecimentos WHERE veiculo_id = @id) as custo_total_abastecimentos,
        (SELECT SUM(litros) FROM abastecimentos WHERE veiculo_id = @id) as total_litros,
        (SELECT AVG(preco_litro) FROM abastecimentos WHERE veiculo_id = @id) as preco_medio_litro
    `;
    
    const stats = await executeQuery(statsQuery, { id });
    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching veiculo stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas do veículo' });
  }
};

export const getAllSolicitacoes = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        s.*,
        u.nome as solicitante_nome,
        v.matricula as veiculo_matricula,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        c.nome as condutor_nome
      FROM solicitacoes_viatura s
      LEFT JOIN usuarios u ON s.solicitante_id = u.id
      LEFT JOIN veiculos v ON s.veiculo_atribuido_id = v.id
      LEFT JOIN usuarios c ON s.condutor_atribuido_id = c.id
      ORDER BY s.created_at DESC
    `;
    const results = await executeQuery(query);
    return res.json(results);
  } catch (error) {
    console.error('Error fetching solicitacoes:', error);
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    // Detectar padrões maliciosos nos campos de texto
    const textFields = [req.body.destino, req.body.motivo, req.body.observacoes, req.body.tipo_viatura];
    for (const field of textFields) {
      if (field && detectMaliciousPatterns(field)) {
        return res.status(400).json({ error: 'Conteúdo inválido detectado. Por favor, remova caracteres especiais ou código.' });
      }
    }
    
    // Sanitizar dados de entrada
    const sanitizedData = sanitizeSolicitacaoFields(req.body);
    const { destino, data_inicio, data_fim, numero_passageiros, tipo_viatura, motivo, observacoes } = sanitizedData;
    
    if (!destino || !data_inicio || !data_fim || !numero_passageiros || !motivo) {
      return res.status(400).json({ error: 'Campos obrigatórios: destino, data_inicio, data_fim, numero_passageiros, motivo' });
    }

    // Validar se a data de início não é anterior à data atual
    const dataInicioObj = new Date(data_inicio);
    const dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0); // Resetar horas para comparar apenas a data
    
    if (dataInicioObj < dataAtual) {
      return res.status(400).json({ error: 'A data de início não pode ser anterior à data atual' });
    }

    // Validar se a data de fim não é anterior à data de início
    const dataFimObj = new Date(data_fim);
    if (dataFimObj < dataInicioObj) {
      return res.status(400).json({ error: 'A data de fim não pode ser anterior à data de início' });
    }

    const query = `
      INSERT INTO solicitacoes_viatura (
        solicitante_id, destino, data_inicio, data_fim, numero_passageiros, 
        tipo_viatura, motivo, observacoes, status
      )
      OUTPUT INSERTED.*
      VALUES (@solicitante_id, @destino, @data_inicio, @data_fim, @numero_passageiros, 
              @tipo_viatura, @motivo, @observacoes, @status)
    `;
    
    const result = await executeQuery(query, {
      solicitante_id: req.body.solicitante_id || null,
      destino,
      data_inicio: new Date(data_inicio),
      data_fim: new Date(data_fim),
      numero_passageiros: parseInt(numero_passageiros),
      tipo_viatura: tipo_viatura || null,
      motivo,
      observacoes: observacoes || null,
      status: 'pendente'
    });
    
    const solicitacao = result[0];
    
    // Buscar dados completos incluindo nome do solicitante e email do condutor
    let webhookData = { ...solicitacao };
    
    // Buscar nome do solicitante
    if (solicitacao.solicitante_id) {
      const solicitanteQuery = `SELECT nome, email FROM usuarios WHERE id = @solicitante_id`;
      const solicitanteResult = await executeQuery(solicitanteQuery, { solicitante_id: solicitacao.solicitante_id });
      if (solicitanteResult.length > 0) {
        webhookData.solicitante_nome = solicitanteResult[0].nome;
        webhookData.solicitante_email = solicitanteResult[0].email;
      }
    }
    
    // Buscar dados do veículo atribuído se existir
    if (solicitacao.veiculo_atribuido_id) {
      const veiculoQuery = `SELECT matricula, marca, modelo FROM veiculos WHERE id = @veiculo_id`;
      const veiculoResult = await executeQuery(veiculoQuery, { veiculo_id: solicitacao.veiculo_atribuido_id });
      if (veiculoResult.length > 0) {
        webhookData.veiculo_matricula = veiculoResult[0].matricula;
        webhookData.veiculo_marca = veiculoResult[0].marca;
        webhookData.veiculo_modelo = veiculoResult[0].modelo;
      }
    }
    
    // Buscar email do condutor se atribuído
    if (solicitacao.condutor_atribuido_id) {
      const condutorQuery = `SELECT nome, email FROM usuarios WHERE id = @condutor_id`;
      const condutorResult = await executeQuery(condutorQuery, { condutor_id: solicitacao.condutor_atribuido_id });
      if (condutorResult.length > 0) {
        webhookData.condutor_nome = condutorResult[0].nome;
        webhookData.condutor_email = condutorResult[0].email;
      }
    }
    
    // Formatar datas para português WAT
    console.log('🔍 Datas originais:', {
      data_inicio: solicitacao.data_inicio,
      data_fim: solicitacao.data_fim,
      created_at: solicitacao.created_at,
      updated_at: solicitacao.updated_at
    });
    
    webhookData.data_inicio_formatada = formatDateToPortugueseWAT(solicitacao.data_inicio);
    webhookData.data_fim_formatada = formatDateToPortugueseWAT(solicitacao.data_fim);
    webhookData.created_at_formatada = formatDateToPortugueseWAT(solicitacao.created_at);
    webhookData.updated_at_formatada = formatDateToPortugueseWAT(solicitacao.updated_at);
    
    console.log('🔍 Datas formatadas:', {
      data_inicio_formatada: webhookData.data_inicio_formatada,
      data_fim_formatada: webhookData.data_fim_formatada,
      created_at_formatada: webhookData.created_at_formatada,
      updated_at_formatada: webhookData.updated_at_formatada
    });
    
    await sendToWebhook({
      action: 'create',
      type: 'solicitacao_viatura',
      data: webhookData
    });
    
    return res.status(201).json(solicitacao);
  } catch (error) {
    console.error('Error creating solicitacao:', error);
    return res.status(500).json({ error: 'Erro ao criar solicitação', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateSolicitacao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Detectar padrões maliciosos nos campos de texto
    const textFields = [req.body.destino, req.body.motivo, req.body.observacoes, req.body.tipo_viatura];
    for (const field of textFields) {
      if (field && detectMaliciousPatterns(field)) {
        return res.status(400).json({ error: 'Conteúdo inválido detectado. Por favor, remova caracteres especiais ou código.' });
      }
    }
    
    // Sanitizar dados de entrada
    const updates = sanitizeSolicitacaoFields(req.body);
    
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    const allowedFields = [
      'destino', 'data_inicio', 'data_fim', 'numero_passageiros',
      'tipo_viatura', 'motivo', 'observacoes', 'status', 'veiculo_atribuido_id', 'condutor_atribuido_id'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = @${field}`);
        
        if (field === 'data_inicio' || field === 'data_fim') {
          params[field] = updates[field] ? new Date(updates[field]) : null;
        } else if (field === 'numero_passageiros') {
          params[field] = parseInt(updates[field]);
        } else if (field === 'tipo_viatura' || field === 'observacoes' || field === 'veiculo_atribuido_id' || field === 'condutor_atribuido_id') {
          params[field] = updates[field] || null;
        } else {
          params[field] = updates[field];
        }
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    // Validar datas se estiverem sendo atualizadas
    if (updates.data_inicio) {
      const dataInicioObj = new Date(updates.data_inicio);
      const dataAtual = new Date();
      dataAtual.setHours(0, 0, 0, 0);
      
      if (dataInicioObj < dataAtual) {
        return res.status(400).json({ error: 'A data de início não pode ser anterior à data atual' });
      }
    }
    
    if (updates.data_inicio && updates.data_fim) {
      const dataInicioObj = new Date(updates.data_inicio);
      const dataFimObj = new Date(updates.data_fim);
      
      if (dataFimObj < dataInicioObj) {
        return res.status(400).json({ error: 'A data de fim não pode ser anterior à data de início' });
      }
    }
    
    const query = `
      UPDATE solicitacoes_viatura
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    const solicitacao = result[0];
    
    // Buscar dados completos incluindo nome do solicitante e email do condutor
    let webhookData = { ...solicitacao };
    
    // Buscar nome do solicitante
    if (solicitacao.solicitante_id) {
      const solicitanteQuery = `SELECT nome, email FROM usuarios WHERE id = @solicitante_id`;
      const solicitanteResult = await executeQuery(solicitanteQuery, { solicitante_id: solicitacao.solicitante_id });
      if (solicitanteResult.length > 0) {
        webhookData.solicitante_nome = solicitanteResult[0].nome;
        webhookData.solicitante_email = solicitanteResult[0].email;
      }
    }
    
    // Buscar dados do veículo atribuído se existir
    if (solicitacao.veiculo_atribuido_id) {
      const veiculoQuery = `SELECT matricula, marca, modelo FROM veiculos WHERE id = @veiculo_id`;
      const veiculoResult = await executeQuery(veiculoQuery, { veiculo_id: solicitacao.veiculo_atribuido_id });
      if (veiculoResult.length > 0) {
        webhookData.veiculo_matricula = veiculoResult[0].matricula;
        webhookData.veiculo_marca = veiculoResult[0].marca;
        webhookData.veiculo_modelo = veiculoResult[0].modelo;
      }
    }
    
    // Buscar email do condutor se atribuído
    if (solicitacao.condutor_atribuido_id) {
      const condutorQuery = `SELECT nome, email FROM usuarios WHERE id = @condutor_id`;
      const condutorResult = await executeQuery(condutorQuery, { condutor_id: solicitacao.condutor_atribuido_id });
      if (condutorResult.length > 0) {
        webhookData.condutor_nome = condutorResult[0].nome;
        webhookData.condutor_email = condutorResult[0].email;
      }
    }
    
    // Formatar datas para português WAT
    console.log('🔍 Datas originais:', {
      data_inicio: solicitacao.data_inicio,
      data_fim: solicitacao.data_fim,
      created_at: solicitacao.created_at,
      updated_at: solicitacao.updated_at
    });
    
    webhookData.data_inicio_formatada = formatDateToPortugueseWAT(solicitacao.data_inicio);
    webhookData.data_fim_formatada = formatDateToPortugueseWAT(solicitacao.data_fim);
    webhookData.created_at_formatada = formatDateToPortugueseWAT(solicitacao.created_at);
    webhookData.updated_at_formatada = formatDateToPortugueseWAT(solicitacao.updated_at);
    
    console.log('🔍 Datas formatadas:', {
      data_inicio_formatada: webhookData.data_inicio_formatada,
      data_fim_formatada: webhookData.data_fim_formatada,
      created_at_formatada: webhookData.created_at_formatada,
      updated_at_formatada: webhookData.updated_at_formatada
    });
    
    await sendToWebhook({
      action: 'update',
      type: 'solicitacao_viatura',
      data: webhookData
    });
    
    return res.json(solicitacao);
  } catch (error) {
    console.error('Error updating solicitacao:', error);
    return res.status(500).json({ error: 'Erro ao atualizar solicitação', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const deleteSolicitacao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `DELETE FROM solicitacoes_viatura WHERE id = @id`;
    await executeQuery(query, { id });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting solicitacao:', error);
    res.status(500).json({ error: 'Erro ao deletar solicitação' });
  }
};
