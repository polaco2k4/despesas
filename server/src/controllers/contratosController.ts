import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'contratos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = /pdf|doc|docx|xls|xlsx|txt|jpg|jpeg|png|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de ficheiro não permitido'));
    }
  }
});

export const getAllContratos = async (req: Request, res: Response) => {
  try {
    const { status, tipo, departamento_id, fornecedor_id } = req.query;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const userDeptId = req.headers['x-user-department-id'] as string;

    let query = `
      SELECT 
        c.*,
        f.nome as fornecedor_nome,
        d.nome as departamento_nome,
        u.nome as responsavel_nome,
        u2.nome as criado_por_nome
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN departamentos d ON c.departamento_id = d.id
      LEFT JOIN usuarios u ON c.responsavel_id = u.id
      LEFT JOIN usuarios u2 ON c.criado_por = u2.id
      WHERE 1=1
    `;

    const params: Record<string, any> = {};

    if (userRole === 'colaborador' && userId) {
      query += ` AND (c.responsavel_id = @user_id OR c.criado_por = @user_id)`;
      params.user_id = userId;
    } else if (userRole === 'adm_area' && userDeptId) {
      query += ` AND c.departamento_id = @user_dept_id`;
      params.user_dept_id = userDeptId;
    }

    if (status) {
      query += ` AND c.status = @status`;
      params.status = status;
    }
    if (tipo) {
      query += ` AND c.tipo = @tipo`;
      params.tipo = tipo;
    }
    if (departamento_id) {
      query += ` AND c.departamento_id = @departamento_id`;
      params.departamento_id = departamento_id;
    }
    if (fornecedor_id) {
      query += ` AND c.fornecedor_id = @fornecedor_id`;
      params.fornecedor_id = fornecedor_id;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await executeQuery(query, Object.keys(params).length > 0 ? params : undefined);
    return res.json(result);
  } catch (error) {
    console.error('Error fetching contratos:', error);
    return res.status(500).json({ error: 'Erro ao buscar contratos' });
  }
};

export const getContratoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        c.*,
        f.nome as fornecedor_nome,
        f.nif as fornecedor_nif,
        f.email as fornecedor_email,
        f.telefone as fornecedor_telefone,
        d.nome as departamento_nome,
        u.nome as responsavel_nome,
        u.email as responsavel_email,
        u2.nome as criado_por_nome
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN departamentos d ON c.departamento_id = d.id
      LEFT JOIN usuarios u ON c.responsavel_id = u.id
      LEFT JOIN usuarios u2 ON c.criado_por = u2.id
      WHERE c.id = @id
    `;
    const results = await executeQuery(query, { id });

    if (results.length === 0) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    return res.json(results[0]);
  } catch (error) {
    console.error('Error fetching contrato:', error);
    return res.status(500).json({ error: 'Erro ao buscar contrato' });
  }
};

export const createContrato = async (req: Request, res: Response) => {
  try {
    const {
      numero_contrato, titulo, descricao, tipo, fornecedor_id, departamento_id,
      responsavel_id, valor_total, moeda, data_inicio, data_fim, data_assinatura,
      status, prioridade, termos, observacoes, anexo_url,
      renovacao_automatica, periodo_renovacao, dias_alerta_vencimento
    } = req.body;
    const criado_por = req.headers['x-user-id'] as string;

    if (!numero_contrato || !titulo || !data_inicio) {
      return res.status(400).json({ error: 'Campos obrigatórios: numero_contrato, titulo, data_inicio' });
    }

    const query = `
      INSERT INTO contratos (
        numero_contrato, titulo, descricao, tipo, fornecedor_id, departamento_id,
        responsavel_id, valor_total, moeda, data_inicio, data_fim, data_assinatura,
        status, prioridade, termos, observacoes, anexo_url, criado_por,
        renovacao_automatica, periodo_renovacao, dias_alerta_vencimento
      )
      OUTPUT INSERTED.*
      VALUES (
        @numero_contrato, @titulo, @descricao, @tipo, @fornecedor_id, @departamento_id,
        @responsavel_id, @valor_total, @moeda, @data_inicio, @data_fim, @data_assinatura,
        @status, @prioridade, @termos, @observacoes, @anexo_url, @criado_por,
        @renovacao_automatica, @periodo_renovacao, @dias_alerta_vencimento
      )
    `;
    const result = await executeQuery(query, {
      numero_contrato, titulo, descricao, tipo: tipo || 'servico',
      fornecedor_id: fornecedor_id || null, departamento_id: departamento_id || null,
      responsavel_id: responsavel_id || null, valor_total: valor_total || 0,
      moeda: moeda || 'AOA', data_inicio, data_fim: data_fim || null,
      data_assinatura: data_assinatura || null, status: status || 'rascunho',
      prioridade: prioridade || 'media', termos: termos || null,
      observacoes: observacoes || null, anexo_url: anexo_url || null, criado_por,
      renovacao_automatica: renovacao_automatica || 0,
      periodo_renovacao: periodo_renovacao || null,
      dias_alerta_vencimento: dias_alerta_vencimento || 30
    });

    return res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Error creating contrato:', error);
    if (error?.message?.includes('IX_contratos_numero')) {
      return res.status(400).json({ error: 'Já existe um contrato com este número' });
    }
    return res.status(500).json({ error: 'Erro ao criar contrato' });
  }
};

export const updateContrato = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields: string[] = [];
    const params: Record<string, any> = { id };

    const allowedFields = [
      'numero_contrato', 'titulo', 'descricao', 'tipo', 'fornecedor_id',
      'departamento_id', 'responsavel_id', 'valor_total', 'moeda',
      'data_inicio', 'data_fim', 'data_assinatura', 'status', 'prioridade',
      'termos', 'observacoes', 'anexo_url',
      'renovacao_automatica', 'periodo_renovacao', 'dias_alerta_vencimento'
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
      UPDATE contratos
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery(query, params);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating contrato:', error);
    return res.status(500).json({ error: 'Erro ao atualizar contrato' });
  }
};

export const deleteContrato = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await executeQuery(`DELETE FROM contratos WHERE id = @id`, { id });
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting contrato:', error);
    return res.status(500).json({ error: 'Erro ao deletar contrato' });
  }
};

export const getContratosStats = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as ativos,
        SUM(CASE WHEN status = 'expirado' OR (status = 'ativo' AND data_fim < GETDATE()) THEN 1 ELSE 0 END) as expirados,
        SUM(CASE WHEN status = 'ativo' AND data_fim BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE()) THEN 1 ELSE 0 END) as expirando_em_breve,
        SUM(CASE WHEN status = 'rascunho' THEN 1 ELSE 0 END) as rascunhos,
        SUM(CASE WHEN status = 'ativo' THEN valor_total ELSE 0 END) as valor_total_ativos
      FROM contratos
    `;
    const result = await executeQuery(query);
    return res.json(result[0]);
  } catch (error) {
    console.error('Error fetching contratos stats:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

export const uploadAnexo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado' });
    }

    const anexo_url = `/uploads/contratos/${req.file.filename}`;
    
    const query = `
      UPDATE contratos
      SET anexo_url = @anexo_url, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    const result = await executeQuery(query, { id, anexo_url });
    
    if (result.length === 0) {
      // Delete uploaded file if contract not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    return res.json({
      message: 'Ficheiro enviado com sucesso',
      anexo_url,
      contrato: result[0]
    });
  } catch (error) {
    console.error('Error uploading anexo:', error);
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    return res.status(500).json({ error: 'Erro ao enviar ficheiro' });
  }
};

export const downloadAnexo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `SELECT anexo_url, numero_contrato FROM contratos WHERE id = @id`;
    const result = await executeQuery(query, { id });
    
    if (result.length === 0 || !result[0].anexo_url) {
      return res.status(404).json({ error: 'Ficheiro não encontrado' });
    }

    const filePath = path.join(process.cwd(), result[0].anexo_url);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Ficheiro não existe no servidor' });
    }

    const fileName = `Contrato_${result[0].numero_contrato}${path.extname(filePath)}`;
    res.download(filePath, fileName);
  } catch (error) {
    console.error('Error downloading anexo:', error);
    return res.status(500).json({ error: 'Erro ao baixar ficheiro' });
  }
};

export const deleteAnexo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `SELECT anexo_url FROM contratos WHERE id = @id`;
    const result = await executeQuery(query, { id });
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    if (result[0].anexo_url) {
      const filePath = path.join(process.cwd(), result[0].anexo_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const updateQuery = `
      UPDATE contratos
      SET anexo_url = NULL, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    const updateResult = await executeQuery(updateQuery, { id });
    
    return res.json({
      message: 'Ficheiro removido com sucesso',
      contrato: updateResult[0]
    });
  } catch (error) {
    console.error('Error deleting anexo:', error);
    return res.status(500).json({ error: 'Erro ao remover ficheiro' });
  }
};

// Verificar contratos a vencer e enviar alertas
export const verificarContratosVencimento = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        c.*,
        f.nome as fornecedor_nome,
        r.nome as responsavel_nome,
        DATEDIFF(day, GETDATE(), c.data_fim) as dias_restantes
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN usuarios r ON c.responsavel_id = r.id
      WHERE c.status = 'ativo'
        AND c.data_fim IS NOT NULL
        AND DATEDIFF(day, GETDATE(), c.data_fim) <= c.dias_alerta_vencimento
        AND DATEDIFF(day, GETDATE(), c.data_fim) >= 0
        AND (c.data_ultimo_alerta IS NULL OR DATEDIFF(day, c.data_ultimo_alerta, GETDATE()) >= 7)
      ORDER BY c.data_fim ASC
    `;

    const contratos = await executeQuery(query);

    // Atualizar data do último alerta
    if (contratos.length > 0) {
      const ids = contratos.map((c: any) => `'${c.id}'`).join(',');
      await executeQuery(`
        UPDATE contratos 
        SET data_ultimo_alerta = GETDATE() 
        WHERE id IN (${ids})
      `);
    }

    return res.json({
      total: contratos.length,
      contratos: contratos.map((c: any) => ({
        id: c.id,
        numero_contrato: c.numero_contrato,
        titulo: c.titulo,
        fornecedor_nome: c.fornecedor_nome,
        responsavel_nome: c.responsavel_nome,
        data_fim: c.data_fim,
        dias_restantes: c.dias_restantes,
        renovacao_automatica: c.renovacao_automatica,
        periodo_renovacao: c.periodo_renovacao
      }))
    });
  } catch (error) {
    console.error('Error verificando contratos:', error);
    return res.status(500).json({ error: 'Erro ao verificar contratos a vencer' });
  }
};

// Processar renovação automática de contratos
export const processarRenovacaoAutomatica = async (req: Request, res: Response) => {
  try {
    // Buscar contratos que devem ser renovados automaticamente
    const query = `
      SELECT *
      FROM contratos
      WHERE status = 'ativo'
        AND renovacao_automatica = 1
        AND data_fim IS NOT NULL
        AND DATEDIFF(day, GETDATE(), data_fim) <= 0
        AND periodo_renovacao IS NOT NULL
    `;

    const contratosParaRenovar = await executeQuery(query);
    const renovados = [];

    for (const contrato of contratosParaRenovar) {
      try {
        // Atualizar status do contrato original para concluído
        await executeQuery(`
          UPDATE contratos 
          SET status = 'concluido', updated_at = GETDATE()
          WHERE id = @id
        `, { id: contrato.id });

        // Criar novo contrato renovado
        const novaDataInicio = new Date(contrato.data_fim);
        novaDataInicio.setDate(novaDataInicio.getDate() + 1);
        
        const novaDataFim = new Date(novaDataInicio);
        novaDataFim.setMonth(novaDataFim.getMonth() + contrato.periodo_renovacao);

        const novoNumero = `${contrato.numero_contrato}-R${contrato.numero_renovacoes + 1}`;

        const insertQuery = `
          INSERT INTO contratos (
            numero_contrato, titulo, descricao, tipo, fornecedor_id, departamento_id,
            responsavel_id, valor_total, moeda, data_inicio, data_fim, status,
            prioridade, termos, observacoes, renovacao_automatica, periodo_renovacao,
            dias_alerta_vencimento, numero_renovacoes, contrato_original_id, criado_por
          )
          OUTPUT INSERTED.*
          VALUES (
            @numero_contrato, @titulo, @descricao, @tipo, @fornecedor_id, @departamento_id,
            @responsavel_id, @valor_total, @moeda, @data_inicio, @data_fim, 'ativo',
            @prioridade, @termos, @observacoes, @renovacao_automatica, @periodo_renovacao,
            @dias_alerta_vencimento, @numero_renovacoes, @contrato_original_id, @criado_por
          )
        `;

        const novoContrato = await executeQuery(insertQuery, {
          numero_contrato: novoNumero,
          titulo: contrato.titulo,
          descricao: `Renovação automática do contrato ${contrato.numero_contrato}`,
          tipo: contrato.tipo,
          fornecedor_id: contrato.fornecedor_id,
          departamento_id: contrato.departamento_id,
          responsavel_id: contrato.responsavel_id,
          valor_total: contrato.valor_total,
          moeda: contrato.moeda,
          data_inicio: novaDataInicio.toISOString().split('T')[0],
          data_fim: novaDataFim.toISOString().split('T')[0],
          prioridade: contrato.prioridade,
          termos: contrato.termos,
          observacoes: contrato.observacoes,
          renovacao_automatica: contrato.renovacao_automatica,
          periodo_renovacao: contrato.periodo_renovacao,
          dias_alerta_vencimento: contrato.dias_alerta_vencimento,
          numero_renovacoes: contrato.numero_renovacoes + 1,
          contrato_original_id: contrato.contrato_original_id || contrato.id,
          criado_por: contrato.criado_por
        });

        renovados.push({
          contrato_original: contrato.numero_contrato,
          novo_contrato: novoNumero,
          data_inicio: novaDataInicio,
          data_fim: novaDataFim
        });
      } catch (error) {
        console.error(`Erro ao renovar contrato ${contrato.numero_contrato}:`, error);
      }
    }

    return res.json({
      message: `${renovados.length} contrato(s) renovado(s) automaticamente`,
      renovados
    });
  } catch (error) {
    console.error('Error processando renovação:', error);
    return res.status(500).json({ error: 'Erro ao processar renovação automática' });
  }
};

// Renovar contrato manualmente
export const renovarContrato = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { periodo_meses, manter_valores } = req.body;
    const userId = req.headers['x-user-id'] as string;

    // Buscar contrato original
    const contratoQuery = `SELECT * FROM contratos WHERE id = @id`;
    const contratos = await executeQuery(contratoQuery, { id });

    if (contratos.length === 0) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    const contrato = contratos[0];

    // Calcular novas datas
    const novaDataInicio = contrato.data_fim 
      ? new Date(new Date(contrato.data_fim).getTime() + 86400000) // +1 dia
      : new Date();
    
    const novaDataFim = new Date(novaDataInicio);
    novaDataFim.setMonth(novaDataFim.getMonth() + (periodo_meses || contrato.periodo_renovacao || 12));

    const novoNumero = `${contrato.numero_contrato}-R${contrato.numero_renovacoes + 1}`;

    // Criar novo contrato
    const insertQuery = `
      INSERT INTO contratos (
        numero_contrato, titulo, descricao, tipo, fornecedor_id, departamento_id,
        responsavel_id, valor_total, moeda, data_inicio, data_fim, status,
        prioridade, termos, observacoes, renovacao_automatica, periodo_renovacao,
        dias_alerta_vencimento, numero_renovacoes, contrato_original_id, criado_por
      )
      OUTPUT INSERTED.*
      VALUES (
        @numero_contrato, @titulo, @descricao, @tipo, @fornecedor_id, @departamento_id,
        @responsavel_id, @valor_total, @moeda, @data_inicio, @data_fim, 'ativo',
        @prioridade, @termos, @observacoes, @renovacao_automatica, @periodo_renovacao,
        @dias_alerta_vencimento, @numero_renovacoes, @contrato_original_id, @criado_por
      )
    `;

    const novoContrato = await executeQuery(insertQuery, {
      numero_contrato: novoNumero,
      titulo: contrato.titulo,
      descricao: `Renovação manual do contrato ${contrato.numero_contrato}`,
      tipo: contrato.tipo,
      fornecedor_id: contrato.fornecedor_id,
      departamento_id: contrato.departamento_id,
      responsavel_id: contrato.responsavel_id,
      valor_total: manter_valores ? contrato.valor_total : req.body.valor_total || contrato.valor_total,
      moeda: contrato.moeda,
      data_inicio: novaDataInicio.toISOString().split('T')[0],
      data_fim: novaDataFim.toISOString().split('T')[0],
      prioridade: contrato.prioridade,
      termos: contrato.termos,
      observacoes: contrato.observacoes,
      renovacao_automatica: contrato.renovacao_automatica,
      periodo_renovacao: periodo_meses || contrato.periodo_renovacao,
      dias_alerta_vencimento: contrato.dias_alerta_vencimento,
      numero_renovacoes: contrato.numero_renovacoes + 1,
      contrato_original_id: contrato.contrato_original_id || contrato.id,
      criado_por: userId
    });

    // Atualizar contrato original para concluído
    await executeQuery(`
      UPDATE contratos 
      SET status = 'concluido', updated_at = GETDATE()
      WHERE id = @id
    `, { id });

    return res.json({
      message: 'Contrato renovado com sucesso',
      contrato_original: contrato.numero_contrato,
      novo_contrato: novoContrato[0]
    });
  } catch (error) {
    console.error('Error renovando contrato:', error);
    return res.status(500).json({ error: 'Erro ao renovar contrato' });
  }
};
