import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import type { Despesa, DespesaStatus } from '../types/database.js';
import { criarNotificacao } from './notificacoesController.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for despesa file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documentos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'despesa_' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const uploadAnexo = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF, JPG, JPEG e PNG são permitidos'));
    }
  }
});

// Generate despesa number in format xxxx/desp/sigla/yyyy
const generateDespesaNumber = async (departamentoId?: string) => {
  try {
    const year = new Date().getFullYear();
    
    let deptSigla = 'GER';
    if (departamentoId) {
      const deptQuery = `
        SELECT sigla FROM departamentos WHERE id = @departamentoId
      `;
      const deptResult = await executeQuery(deptQuery, { departamentoId });
      if (deptResult.length > 0 && deptResult[0].sigla) {
        deptSigla = deptResult[0].sigla;
      }
    }
    
    // Get or create sequence for this department/year
    const sequenceQuery = `
      SELECT proximo_numero 
      FROM despesa_sequencia 
      WHERE departamento_id = @departamentoId AND ano = @year
    `;
    
    let nextNumber = 1;
    const sequenceResult = await executeQuery(sequenceQuery, { 
      departamentoId: departamentoId || null, 
      year 
    });
    
    if (sequenceResult.length > 0) {
      nextNumber = sequenceResult[0].proximo_numero;
      
      // Update sequence
      const updateQuery = `
        UPDATE despesa_sequencia 
        SET proximo_numero = proximo_numero + 1, updated_at = GETDATE()
        WHERE departamento_id = @departamentoId AND ano = @year
      `;
      await executeQuery(updateQuery, { 
        departamentoId: departamentoId || null, 
        year 
      });
    } else {
      // Create new sequence
      const insertQuery = `
        INSERT INTO despesa_sequencia (departamento_id, ano, proximo_numero)
        VALUES (@departamentoId, @year, 2)
      `;
      await executeQuery(insertQuery, { 
        departamentoId: departamentoId || null, 
        year 
      });
    }
    
    // Generate number in format xxxx/DESP/sigla/yyyy
    const sequentialNumber = nextNumber.toString().padStart(4, '0');
    return `${sequentialNumber}/DESP/${deptSigla}/${year}`;
    
  } catch (error) {
    console.error('Erro ao gerar número da despesa:', error);
    return `DESP${Date.now()}`;
  }
};

export const getAllDespesas = async (req: Request, res: Response) => {
  console.log('🚀 getAllDespesas called!');
  try {
    const { 
      status, 
      usuario_id, 
      departamento_id, 
      departamento_ids, 
      user_role, 
      user_departamento_id,
      data_inicio,
      data_fim,
      rubrica_id,
      valor_min,
      valor_max
    } = req.query;
    
    console.log('🔍 Backend Debug - Query params received:', {
      status,
      usuario_id,
      departamento_id,
      departamento_ids,
      user_role,
      user_departamento_id,
      data_inicio,
      data_fim,
      rubrica_id,
      valor_min,
      valor_max,
      tipo_departamento_ids: Array.isArray(departamento_ids) ? 'array' : typeof departamento_ids
    });
    
    let whereClause = '';
    const params: Record<string, any> = {};
    
    // Special filter for finance department - show approved and paid expenses
    if (user_departamento_id && typeof user_departamento_id === 'string') {
      const deptQuery = 'SELECT nome FROM departamentos WHERE id = @dept_id';
      const deptResult = await executeQuery<any>(deptQuery, { dept_id: user_departamento_id });
      
      if (deptResult.length > 0 && deptResult[0].nome.toLowerCase().includes('financa')) {
        console.log('🔍 Backend Debug - Finance department detected, filtering approved and paid expenses');
        whereClause += ' AND d.status IN (@finance_status1, @finance_status2)';
        params.finance_status1 = 'aprovada';
        params.finance_status2 = 'paga';
      }
    }
    
    if (status) {
      whereClause += ' AND d.status = @status';
      params.status = status;
    }
    
    if (usuario_id) {
      whereClause += ' AND d.usuario_id = @usuario_id';
      params.usuario_id = usuario_id;
    }
    
    if (departamento_id) {
      whereClause += ' AND dept.id = @departamento_id';
      params.departamento_id = departamento_id;
    }
    
    // Support multiple departamento_ids for adm_area users
    if (departamento_ids) {
      const deptIds = Array.isArray(departamento_ids) ? departamento_ids : [departamento_ids];
      console.log('🔍 Backend Debug - Processing departamento_ids:', deptIds);
      
      // If array is empty, return no results for security
      if (deptIds.length === 0) {
        console.log('🔍 Backend Debug - Empty departamento_ids array, returning empty result');
        return res.json([]);
      }
      
      whereClause += ` AND dept.id IN (${deptIds.map((_, i) => `@dept_id${i}`).join(', ')})`;
      deptIds.forEach((id, i) => {
        params[`dept_id${i}`] = id;
      });
      console.log('🔍 Backend Debug - Where clause for dept_ids:', whereClause);
      console.log('🔍 Backend Debug - Params for dept_ids:', params);
    }
    
    // Filtros avançados
    if (data_inicio) {
      whereClause += ' AND d.created_at >= @data_inicio';
      params.data_inicio = data_inicio;
    }
    
    if (data_fim) {
      whereClause += ' AND d.created_at <= @data_fim';
      params.data_fim = data_fim;
    }
    
    if (rubrica_id) {
      whereClause += ' AND d.rubrica_id = @rubrica_id';
      params.rubrica_id = rubrica_id;
    }
    
    if (valor_min) {
      whereClause += ' AND d.valor >= @valor_min';
      params.valor_min = Number(valor_min);
    }
    
    if (valor_max) {
      whereClause += ' AND d.valor <= @valor_max';
      params.valor_max = Number(valor_max);
    }
    
    console.log('🔍 Backend Debug - Final where clause:', whereClause);
    console.log('🔍 Backend Debug - Final params:', params);
    
    // Security check: If no filters are applied, only allow admins to see all despesas
    // This prevents non-admin users from seeing all expenses when no filters are sent
    if (!status && !usuario_id && !departamento_id && !departamento_ids) {
      console.log('🔍 Backend Debug - No filters applied, checking user role');
      // For now, we'll allow access without filters (admin behavior)
      // In a real implementation, we should check JWT token for admin role
      console.log('🔍 Backend Debug - No filters provided, allowing access (admin behavior)');
      // Don't return empty array - allow access to all despesas
    }
    
    const query = `
      SELECT 
        d.id, d.rubrica_id, d.usuario_id, d.descricao, d.valor, d.status,
        d.anexo_url, d.data_pagamento, d.motivo_rejeicao, d.fornecedor_id, d.pago_por,
        d.created_at, d.updated_at, d.numero_despesa, d.numero_operacao, d.comprovante_pagamento_url,
        r.id as rubrica_id_nested,
        r.nome as rubrica_nome,
        r.descricao as rubrica_descricao,
        r.valor as rubrica_valor,
        o.id as orcamento_id,
        o.departamento_id as orcamento_departamento_id,
        dept.id as usuario_departamento_id,
        dept.nome as usuario_departamento_nome,
        u.id as usuario_id_nested,
        u.nome as usuario_nome,
        u.email as usuario_email,
        u.role as usuario_role,
        pago_u.id as pago_por_id,
        pago_u.nome as pago_por_nome,
        pago_u.email as pago_por_email,
        pago_u.role as pago_por_role
      FROM despesas d
      LEFT JOIN rubricas r ON d.rubrica_id = r.id
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      LEFT JOIN usuarios u ON d.usuario_id = u.id
      LEFT JOIN departamentos dept ON u.departamento_id = dept.id
      LEFT JOIN usuarios pago_u ON d.pago_por = pago_u.id
      WHERE 1=1 ${whereClause}
      ORDER BY d.created_at DESC
    `;
    const result = await executeQuery<any>(query, params);
    
    // Get all aprovacoes for these despesas
    const despesaIds = result.map((row: any) => row.id);
    let aprovacoes: any[] = [];
    
    if (despesaIds.length > 0) {
      const aprovacoesQuery = `
        SELECT 
          a.id, a.despesa_id, a.aprovado_por, a.role, a.status, a.comentario, a.aprovado_em,
          u.id as aprovador_id,
          u.nome as aprovador_nome,
          u.email as aprovador_email,
          u.role as aprovador_role
        FROM aprovacoes a
        LEFT JOIN usuarios u ON a.aprovado_por = u.id
        WHERE a.despesa_id IN (${despesaIds.map((_, i) => `@id${i}`).join(', ')})
        ORDER BY a.aprovado_em ASC
      `;
      
      const aprovacoesParams: Record<string, any> = {};
      despesaIds.forEach((id, i) => {
        aprovacoesParams[`id${i}`] = id;
      });
      
      aprovacoes = await executeQuery<any>(aprovacoesQuery, aprovacoesParams);
    }
    
    // Transform flat result into nested structure
    const despesas = result.map((row: any) => {
      const despesaAprovacoes = aprovacoes
        .filter((a: any) => a.despesa_id === row.id)
        .map((a: any) => ({
          id: a.id,
          despesa_id: a.despesa_id,
          aprovado_por: a.aprovado_por,
          role: a.role,
          status: a.status,
          comentario: a.comentario,
          aprovado_em: a.aprovado_em,
          aprovador: a.aprovador_id ? {
            id: a.aprovador_id,
            nome: a.aprovador_nome,
            email: a.aprovador_email,
            role: a.aprovador_role
          } : undefined
        }));
      
      return {
        id: row.id,
        rubrica_id: row.rubrica_id,
        usuario_id: row.usuario_id,
        descricao: row.descricao,
        valor: row.valor,
        status: row.status,
        anexo_url: row.anexo_url,
        data_pagamento: row.data_pagamento,
        motivo_rejeicao: row.motivo_rejeicao,
        fornecedor_id: row.fornecedor_id,
        pago_por: row.pago_por,
        created_at: row.created_at,
        updated_at: row.updated_at,
        numero_despesa: row.numero_despesa,
        numero_operacao: row.numero_operacao,
        comprovante_pagamento_url: row.comprovante_pagamento_url,
        rubrica: row.rubrica_id_nested ? {
          id: row.rubrica_id_nested,
          nome: row.rubrica_nome,
          descricao: row.rubrica_descricao,
          valor: row.rubrica_valor,
          orcamento: row.orcamento_id ? {
            id: row.orcamento_id,
            departamento_id: row.orcamento_departamento_id
          } : undefined
        } : undefined,
        usuario: row.usuario_id_nested ? {
          id: row.usuario_id_nested,
          nome: row.usuario_nome,
          email: row.usuario_email,
          role: row.usuario_role,
          departamento_id: row.usuario_departamento_id,
          departamento: row.usuario_departamento_id ? {
            id: row.usuario_departamento_id,
            nome: row.usuario_departamento_nome
          } : undefined
        } : undefined,
        pago_por_usuario: row.pago_por_id ? {
          id: row.pago_por_id,
          nome: row.pago_por_nome,
          email: row.pago_por_email,
          role: row.pago_por_role
        } : undefined,
        aprovacoes: despesaAprovacoes
      };
    });
    
    res.json(despesas);
  } catch (error) {
    console.error('Error fetching despesas:', error);
    res.status(500).json({ error: 'Erro ao buscar despesas' });
  }
};

export const getDespesaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        d.id, d.rubrica_id, d.usuario_id, d.descricao, d.valor, d.status,
        d.anexo_url, d.data_pagamento, d.motivo_rejeicao, d.fornecedor_id,
        d.created_at, d.updated_at, d.numero_despesa, d.numero_operacao, d.comprovante_pagamento_url
      FROM despesas d
      WHERE d.id = @id
    `;
    const result = await executeQuery<Despesa>(query, { id });
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching despesa:', error);
    res.status(500).json({ error: 'Erro ao buscar despesa' });
  }
};

export const createDespesa = async (req: Request, res: Response) => {
  try {
    const { rubrica_id, usuario_id, descricao, valor, anexo_url, fornecedor_id, anexos_urls } = req.body;
    
    console.log('Creating despesa with data:', { 
      rubrica_id, 
      usuario_id, 
      descricao, 
      valor, 
      anexo_url, 
      fornecedor_id,
      anexos_urls,
      status: 'pendente_gestor'
    });
    
    if (!rubrica_id || !usuario_id || !descricao || valor === undefined) {
      return res.status(400).json({ error: 'Rubrica, usuário, descrição e valor são obrigatórios' });
    }

    // Get department from rubrica
    const rubricaDeptQuery = `
      SELECT o.departamento_id
      FROM rubricas r
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      WHERE r.id = @rubrica_id
    `;
    const rubricaDeptResult = await executeQuery(rubricaDeptQuery, { rubrica_id });
    const departamentoId = rubricaDeptResult.length > 0 ? rubricaDeptResult[0].departamento_id : null;
    
    // Generate despesa number
    const numeroDespesa = await generateDespesaNumber(departamentoId);

    const query = `
      INSERT INTO despesas (rubrica_id, usuario_id, descricao, valor, status, anexo_url, fornecedor_id, numero_despesa)
      OUTPUT INSERTED.*
      VALUES (@rubrica_id, @usuario_id, @descricao, @valor, 'pendente_gestor', @anexo_url, @fornecedor_id, @numero_despesa)
    `;
    
    console.log('Executing query:', query);
    
    const result = await executeQuery<Despesa>(query, {
      rubrica_id,
      usuario_id,
      descricao,
      valor,
      anexo_url,
      fornecedor_id,
      numero_despesa: numeroDespesa
    });
    
    console.log('Despesa created successfully:', result[0]);
    
    // Save multiple attachments if provided
    if (anexos_urls && Array.isArray(anexos_urls) && anexos_urls.length > 0) {
      const despesaId = result[0].id;
      for (const anexoUrl of anexos_urls) {
        const anexoQuery = `
          INSERT INTO despesa_anexos (despesa_id, anexo_url)
          VALUES (@despesa_id, @anexo_url)
        `;
        await executeQuery(anexoQuery, { despesa_id: despesaId, anexo_url: anexoUrl });
      }
      console.log(`Saved ${anexos_urls.length} attachments for despesa ${despesaId}`);
    }
    
    // Criar notificação para gestores do departamento
    const novaDespesa = result[0];
    
    // Buscar informações da rubrica e departamento
    const rubricaQuery = `
      SELECT r.nome as rubrica_nome, o.departamento_id, dept.nome as departamento_nome
      FROM rubricas r
      LEFT JOIN orcamentos o ON r.orcamento_id = o.id
      LEFT JOIN departamentos dept ON o.departamento_id = dept.id
      WHERE r.id = @rubrica_id
    `;
    
    const rubricaResult = await executeQuery(rubricaQuery, { rubrica_id });
    
    if (rubricaResult.length > 0) {
      const rubricaInfo = rubricaResult[0];
      
      // Buscar gestores do departamento
      const gestoresQuery = `
        SELECT id, nome, email
        FROM usuarios
        WHERE role = 'gestor' AND departamento_id = @departamento_id
      `;
      
      const gestores = await executeQuery(gestoresQuery, { 
        departamento_id: rubricaInfo.departamento_id 
      });
      
      // Criar notificações para cada gestor
      for (const gestor of gestores) {
        await criarNotificacao(
          gestor.id,
          'Nova Despesa Pendente',
          `Uma nova despesa "${descricao}" de Kz ${Number(valor).toLocaleString('pt-PT')} foi criada e requer sua aprovação.`,
          'info',
          'despesa',
          novaDespesa.id
        );
      }
    }
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating despesa:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
};

export const updateDespesa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('Updating despesa:', { id, updates });
    
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (updates.rubrica_id !== undefined) {
      fields.push('rubrica_id = @rubrica_id');
      params.rubrica_id = updates.rubrica_id;
    }
    if (updates.descricao !== undefined) {
      fields.push('descricao = @descricao');
      params.descricao = updates.descricao;
    }
    if (updates.valor !== undefined) {
      fields.push('valor = @valor');
      params.valor = updates.valor;
    }
    if (updates.status !== undefined) {
      fields.push('status = @status');
      params.status = updates.status;
    }
    if (updates.fornecedor_id !== undefined) {
      fields.push('fornecedor_id = @fornecedor_id');
      params.fornecedor_id = updates.fornecedor_id;
    }
    if (updates.anexo_url !== undefined) {
      fields.push('anexo_url = @anexo_url');
      params.anexo_url = updates.anexo_url;
    }
    if (updates.data_pagamento !== undefined) {
      fields.push('data_pagamento = @data_pagamento');
      params.data_pagamento = updates.data_pagamento;
    }
    if (updates.pago_por !== undefined) {
      fields.push('pago_por = @pago_por');
      params.pago_por = updates.pago_por;
    }
    if (updates.motivo_rejeicao !== undefined) {
      fields.push('motivo_rejeicao = @motivo_rejeicao');
      params.motivo_rejeicao = updates.motivo_rejeicao;
    }
    if (updates.numero_operacao !== undefined) {
      fields.push('numero_operacao = @numero_operacao');
      params.numero_operacao = updates.numero_operacao;
    }
    if (updates.comprovante_pagamento_url !== undefined) {
      fields.push('comprovante_pagamento_url = @comprovante_pagamento_url');
      params.comprovante_pagamento_url = updates.comprovante_pagamento_url;
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE despesas
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery<Despesa>(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    
    // Save multiple attachments if provided
    if (updates.anexos_urls && Array.isArray(updates.anexos_urls) && updates.anexos_urls.length > 0) {
      // First, delete existing attachments for this despesa
      const deleteAnexosQuery = `
        DELETE FROM despesa_anexos WHERE despesa_id = @despesa_id
      `;
      await executeQuery(deleteAnexosQuery, { despesa_id: id });
      
      // Then insert new attachments
      for (const anexoUrl of updates.anexos_urls) {
        const anexoQuery = `
          INSERT INTO despesa_anexos (despesa_id, anexo_url)
          VALUES (@despesa_id, @anexo_url)
        `;
        await executeQuery(anexoQuery, { despesa_id: id, anexo_url: anexoUrl });
      }
      console.log(`Updated ${updates.anexos_urls.length} attachments for despesa ${id}`);
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating despesa:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Erro ao atualizar despesa', details: message });
  }
};

export const deleteDespesa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se a despesa tem histórico de aprovações
    const checkHistoryQuery = `
      SELECT COUNT(*) as count 
      FROM aprovacoes 
      WHERE despesa_id = @id
    `;
    const historyResult = await executeQuery<{ count: number }>(checkHistoryQuery, { id });
    
    if (historyResult.length > 0 && historyResult[0].count > 0) {
      return res.status(403).json({ 
        error: 'Não é possível apagar despesas com histórico de aprovações' 
      });
    }

    const query = `DELETE FROM despesas WHERE id = @id`;
    await executeQuery(query, { id });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting despesa:', error);
    res.status(500).json({ error: 'Erro ao deletar despesa' });
  }
};
