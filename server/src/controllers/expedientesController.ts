import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import { createHistorico } from './historicoExpedientesController.js';

// Ensure tables exist
const ensureExpedientesTable = async () => {
  try {
    const { createExpedientesTable, createExpedientesDocumentosTable } = await import('../scripts/createExpedientesTable.js');
    await createExpedientesTable();
    await createExpedientesDocumentosTable();
  } catch (error) {
    console.error('Erro ao criar tabelas expedientes:', error);
  }
};

// Generate expediente number in format xxxx/EXP/sigla/yyyy
const generateExpedienteNumber = async (departamentoId?: string) => {
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
      FROM expediente_sequencia 
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
        UPDATE expediente_sequencia 
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
        INSERT INTO expediente_sequencia (departamento_id, ano, proximo_numero)
        VALUES (@departamentoId, @year, 2)
      `;
      await executeQuery(insertQuery, { 
        departamentoId: departamentoId || null, 
        year 
      });
    }
    
    // Generate number in format xxxx/EXP/sigla/yyyy
    const sequentialNumber = nextNumber.toString().padStart(4, '0');
    return `${sequentialNumber}/EXP/${deptSigla}/${year}`;
    
  } catch (error) {
    console.error('Erro ao gerar número do expediente:', error);
    return `EXP${Date.now()}`;
  }
};

export const getAllExpedientes = async (req: Request, res: Response) => {
  try {
    await ensureExpedientesTable();
    
    const { 
      tipo, status, prioridade, departamento_id, criado_por, responsavel_id, 
      publico, data_inicio, data_fim, ativo = '1' 
    } = req.query;
    
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;
    
    let whereConditions = ['e.ativo = @ativo'];
    const params: any = { ativo: ativo === '1' };
    
    // Role-based access control
    if (userRole !== 'admin') {
      if (userRole === 'colaborador' || userRole === 'gestor') {
        whereConditions.push(`(
          (e.departamento_id = @userDepartmentId AND e.publico = 1) OR 
          (e.criado_por = @userId) OR
          (e.responsavel_id = @userId)
        )`);
        params.userDepartmentId = userDepartmentId;
        params.userId = userId;
      } else if (userRole === 'adm_area') {
        const departamentosQuery = `
          SELECT departamento_id 
          FROM usuarios_departamentos 
          WHERE usuario_id = @userId
        `;
        const departamentosResult = await executeQuery(departamentosQuery, { userId });
        const departamentoIds = departamentosResult.map((row: any) => row.departamento_id);
        
        if (departamentoIds.length > 0) {
          const placeholders = departamentoIds.map((_, index) => `@dept${index}`).join(', ');
          const condition = `(
            (e.departamento_id IN (${placeholders}) AND e.publico = 1) OR 
            (e.criado_por = @userId) OR
            (e.responsavel_id = @userId)
          )`;
          whereConditions.push(condition);
          
          departamentoIds.forEach((deptId, index) => {
            params[`dept${index}`] = deptId;
          });
          params.userId = userId;
        } else {
          whereConditions.push('(e.criado_por = @userId OR e.responsavel_id = @userId)');
          params.userId = userId;
        }
      }
    }
    
    // Apply filters
    if (tipo) {
      whereConditions.push('e.tipo = @tipo');
      params.tipo = tipo;
    }
    
    if (status) {
      whereConditions.push('e.status = @status');
      params.status = status;
    }
    
    if (prioridade) {
      whereConditions.push('e.prioridade = @prioridade');
      params.prioridade = prioridade;
    }
    
    if (departamento_id) {
      whereConditions.push('e.departamento_id = @departamento_id');
      params.departamento_id = departamento_id;
    }
    
    if (criado_por) {
      whereConditions.push('e.criado_por = @criado_por');
      params.criado_por = criado_por;
    }
    
    if (responsavel_id) {
      whereConditions.push('e.responsavel_id = @responsavel_id');
      params.responsavel_id = responsavel_id;
    }
    
    if (publico !== undefined) {
      whereConditions.push('e.publico = @publico');
      params.publico = publico === '1';
    }
    
    if (data_inicio) {
      whereConditions.push('e.data_abertura >= @data_inicio');
      params.data_inicio = data_inicio;
    }
    
    if (data_fim) {
      whereConditions.push('e.data_abertura <= @data_fim');
      params.data_fim = data_fim;
    }

    const query = `
      SELECT 
        e.id, e.numero, e.numero_expediente, e.titulo, e.descricao, e.tipo, e.status, e.prioridade,
        e.data_abertura, e.data_prazo, e.data_fechamento, e.criado_por,
        e.responsavel_id, e.departamento_id, e.observacoes, e.publico, e.ativo,
        e.created_at, e.updated_at,
        c.id as 'criador.id', c.nome as 'criador.nome', c.email as 'criador.email',
        c.role as 'criador.role',
        r.id as 'responsavel.id', r.nome as 'responsavel.nome', r.email as 'responsavel.email',
        r.role as 'responsavel.role',
        d.id as 'departamento.id', d.nome as 'departamento.nome', d.sigla as 'departamento.sigla',
        (SELECT COUNT(*) FROM expedientes_documentos ed WHERE ed.expediente_id = e.id) as total_documentos
      FROM expedientes e
      LEFT JOIN usuarios c ON e.criado_por = c.id
      LEFT JOIN usuarios r ON e.responsavel_id = r.id
      LEFT JOIN departamentos d ON e.departamento_id = d.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY e.created_at DESC
    `;
    
    const results = await executeQuery(query, params);
    
    const expedientes = results.map((row: any) => ({
      id: row.id,
      numero: row.numero,
      numero_expediente: row.numero_expediente,
      titulo: row.titulo,
      descricao: row.descricao,
      tipo: row.tipo,
      status: row.status,
      prioridade: row.prioridade,
      data_abertura: row.data_abertura,
      data_prazo: row.data_prazo,
      data_fechamento: row.data_fechamento,
      criado_por: row.criado_por,
      responsavel_id: row.responsavel_id,
      departamento_id: row.departamento_id,
      observacoes: row.observacoes,
      publico: row.publico,
      ativo: row.ativo,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_documentos: row.total_documentos || 0,
      criador: row['criador.id'] ? {
        id: row['criador.id'],
        nome: row['criador.nome'],
        email: row['criador.email'],
        role: row['criador.role']
      } : undefined,
      responsavel: row['responsavel.id'] ? {
        id: row['responsavel.id'],
        nome: row['responsavel.nome'],
        email: row['responsavel.email'],
        role: row['responsavel.role']
      } : undefined,
      departamento: row['departamento.id'] ? {
        id: row['departamento.id'],
        nome: row['departamento.nome'],
        sigla: row['departamento.sigla']
      } : undefined
    }));
    
    res.json(expedientes);
  } catch (error) {
    console.error('Error fetching expedientes:', error);
    res.status(500).json({ error: 'Erro ao buscar expedientes' });
  }
};

export const getExpedienteById = async (req: Request, res: Response) => {
  try {
    await ensureExpedientesTable();
    
    const { id } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;
    
    // Check access permissions
    let accessQuery = '';
    let accessParams: any = { id, userId };
    
    if (userRole === 'admin') {
      accessQuery = 'SELECT COUNT(*) as count FROM expedientes WHERE id = @id AND ativo = 1';
    } else if (userRole === 'adm_area') {
      accessQuery = `
        SELECT COUNT(*) as count
        FROM expedientes e
        LEFT JOIN usuarios_departamentos ud ON ud.usuario_id = @userId
        WHERE e.id = @id AND e.ativo = 1
          AND ((e.departamento_id IN (SELECT departamento_id FROM usuarios_departamentos WHERE usuario_id = @userId) AND e.publico = 1) 
               OR e.criado_por = @userId OR e.responsavel_id = @userId)
      `;
    } else {
      accessQuery = `
        SELECT COUNT(*) as count
        FROM expedientes e
        WHERE e.id = @id AND e.ativo = 1
          AND ((e.departamento_id = @userDepartmentId AND e.publico = 1) 
               OR e.criado_por = @userId OR e.responsavel_id = @userId)
      `;
      accessParams.userDepartmentId = userDepartmentId;
    }
    
    const accessResult = await executeQuery(accessQuery, accessParams);
    if (accessResult[0]?.count === 0) {
      return res.status(403).json({ error: 'Acesso negado ao expediente' });
    }
    
    // Get expediente with related data
    const query = `
      SELECT 
        e.id, e.numero, e.titulo, e.descricao, e.tipo, e.status, e.prioridade,
        e.data_abertura, e.data_prazo, e.data_fechamento, e.criado_por,
        e.responsavel_id, e.departamento_id, e.observacoes, e.publico, e.ativo,
        e.created_at, e.updated_at,
        c.id as 'criador.id', c.nome as 'criador.nome', c.email as 'criador.email',
        c.role as 'criador.role',
        r.id as 'responsavel.id', r.nome as 'responsavel.nome', r.email as 'responsavel.email',
        r.role as 'responsavel.role',
        d.id as 'departamento.id', d.nome as 'departamento.nome', d.sigla as 'departamento.sigla'
      FROM expedientes e
      LEFT JOIN usuarios c ON e.criado_por = c.id
      LEFT JOIN usuarios r ON e.responsavel_id = r.id
      LEFT JOIN departamentos d ON e.departamento_id = d.id
      WHERE e.id = @id
    `;
    
    const results = await executeQuery(query, { id });
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Expediente não encontrado' });
    }
    
    const row = results[0];
    const expediente = {
      id: row.id,
      numero: row.numero,
      titulo: row.titulo,
      descricao: row.descricao,
      tipo: row.tipo,
      status: row.status,
      prioridade: row.prioridade,
      data_abertura: row.data_abertura,
      data_prazo: row.data_prazo,
      data_fechamento: row.data_fechamento,
      criado_por: row.criado_por,
      responsavel_id: row.responsavel_id,
      departamento_id: row.departamento_id,
      observacoes: row.observacoes,
      publico: row.publico,
      ativo: row.ativo,
      created_at: row.created_at,
      updated_at: row.updated_at,
      criador: row['criador.id'] ? {
        id: row['criador.id'],
        nome: row['criador.nome'],
        email: row['criador.email'],
        role: row['criador.role']
      } : undefined,
      responsavel: row['responsavel.id'] ? {
        id: row['responsavel.id'],
        nome: row['responsavel.nome'],
        email: row['responsavel.email'],
        role: row['responsavel.role']
      } : undefined,
      departamento: row['departamento.id'] ? {
        id: row['departamento.id'],
        nome: row['departamento.nome'],
        sigla: row['departamento.sigla']
      } : undefined
    };
    
    res.json(expediente);
  } catch (error) {
    console.error('Error fetching expediente:', error);
    res.status(500).json({ error: 'Erro ao buscar expediente' });
  }
};

export const createExpediente = async (req: Request, res: Response) => {
  try {
    await ensureExpedientesTable();
    
    const {
      titulo, descricao, tipo, prioridade = 'media', data_prazo,
      responsavel_id, departamento_id, observacoes, publico = false
    } = req.body;
    
    const userId = req.headers['x-user-id'] as string;
    
    if (!titulo || !tipo) {
      return res.status(400).json({ error: 'Título e tipo são obrigatórios' });
    }
    
    // Generate expediente number
    const numero_expediente = await generateExpedienteNumber(departamento_id);
    
    const query = `
      INSERT INTO expedientes (
        numero, numero_expediente, titulo, descricao, tipo, prioridade, data_prazo,
        criado_por, responsavel_id, departamento_id, observacoes, publico
      )
      OUTPUT INSERTED.id
      VALUES (
        @numero, @numero_expediente, @titulo, @descricao, @tipo, @prioridade, @data_prazo,
        @criado_por, @responsavel_id, @departamento_id, @observacoes, @publico
      )
    `;
    
    // Generate old format numero for backward compatibility
    const year = new Date().getFullYear();
    const tipoPrefix = tipo.substring(0, 3).toUpperCase();
    const countQuery = `SELECT COUNT(*) as count FROM expedientes WHERE YEAR(created_at) = @year AND tipo = @tipo`;
    const countResult = await executeQuery(countQuery, { year, tipo });
    const nextNumber = (countResult[0]?.count || 0) + 1;
    const numero = `${tipoPrefix}${year}${nextNumber.toString().padStart(4, '0')}`;
    
    const results = await executeQuery(query, {
      numero,
      numero_expediente,
      titulo,
      descricao: descricao || null,
      tipo,
      prioridade,
      data_prazo: data_prazo || null,
      criado_por: userId,
      responsavel_id: responsavel_id || null,
      departamento_id: departamento_id || null,
      observacoes: observacoes || null,
      publico: publico || false
    });
    
    const expedienteId = results[0].id;
    
    // Registrar histórico de criação
    await createHistorico(
      expedienteId,
      userId,
      'criacao',
      undefined,
      undefined,
      undefined,
      `Expediente "${titulo}" foi criado`,
      req.ip
    );
    
    // Return created expediente
    const createdExpediente = await executeQuery(`
      SELECT 
        e.id, e.numero, e.titulo, e.descricao, e.tipo, e.status, e.prioridade,
        e.data_abertura, e.data_prazo, e.data_fechamento, e.criado_por,
        e.responsavel_id, e.departamento_id, e.observacoes, e.publico, e.ativo,
        e.created_at, e.updated_at,
        c.nome as 'criador.nome', c.email as 'criador.email'
      FROM expedientes e
      LEFT JOIN usuarios c ON e.criado_por = c.id
      WHERE e.id = @expedienteId
    `, { expedienteId });
    
    res.status(201).json(createdExpediente[0]);
  } catch (error) {
    console.error('Error creating expediente:', error);
    res.status(500).json({ error: 'Erro ao criar expediente' });
  }
};

export const updateExpediente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      titulo, descricao, tipo, status, prioridade, data_prazo, data_fechamento,
      responsavel_id, departamento_id, observacoes, publico
    } = req.body;
    
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Get current expediente data for comparison
    const currentQuery = `
      SELECT * FROM expedientes 
      WHERE id = @id AND ativo = 1
    `;
    const currentResult = await executeQuery(currentQuery, { id });
    
    if (currentResult.length === 0) {
      return res.status(404).json({ error: 'Expediente não encontrado' });
    }
    
    const currentExpediente = currentResult[0];
    
    // Check if expediente is closed and user is not admin
    if (currentExpediente.status === 'fechado' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Expedientes fechados só podem ser editados por administradores' });
    }
    
    const canEdit = userRole === 'admin' || 
                   currentExpediente.criado_por === userId || 
                   currentExpediente.responsavel_id === userId ||
                   (userRole === 'gestor' && currentExpediente.departamento_id === req.headers['x-user-department-id']);
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Sem permissão para editar este expediente' });
    }
    
    const updateFields = [];
    const params: any = { id };
    
    // Track changes and create history entries
    if (titulo !== undefined && currentExpediente.titulo !== titulo) {
      updateFields.push('titulo = @titulo');
      params.titulo = titulo;
      await createHistorico(
        id,
        userId,
        'edicao',
        'titulo',
        currentExpediente.titulo,
        titulo,
        `Título alterado de "${currentExpediente.titulo}" para "${titulo}"`,
        req.ip
      );
    }
    
    if (descricao !== undefined && currentExpediente.descricao !== descricao) {
      updateFields.push('descricao = @descricao');
      params.descricao = descricao;
      await createHistorico(
        id,
        userId,
        'edicao',
        'descricao',
        currentExpediente.descricao || '',
        descricao,
        `Descrição alterada`,
        req.ip
      );
    }
    
    if (tipo !== undefined && currentExpediente.tipo !== tipo) {
      updateFields.push('tipo = @tipo');
      params.tipo = tipo;
      await createHistorico(
        id,
        userId,
        'edicao',
        'tipo',
        currentExpediente.tipo,
        tipo,
        `Tipo alterado de "${currentExpediente.tipo}" para "${tipo}"`,
        req.ip
      );
    }
    
    if (status !== undefined && currentExpediente.status !== status) {
      updateFields.push('status = @status');
      params.status = status;
      await createHistorico(
        id,
        userId,
        'status',
        'status',
        currentExpediente.status,
        status,
        `Status alterado de "${currentExpediente.status}" para "${status}"`,
        req.ip
      );
      
      // Auto-set data_fechamento when status changes to 'fechado'
      if (status === 'fechado' && !data_fechamento) {
        updateFields.push('data_fechamento = GETDATE()');
      }
    }
    
    if (prioridade !== undefined && currentExpediente.prioridade !== prioridade) {
      updateFields.push('prioridade = @prioridade');
      params.prioridade = prioridade;
      await createHistorico(
        id,
        userId,
        'edicao',
        'prioridade',
        currentExpediente.prioridade,
        prioridade,
        `Prioridade alterada de "${currentExpediente.prioridade}" para "${prioridade}"`,
        req.ip
      );
    }
    
    if (data_prazo !== undefined && currentExpediente.data_prazo !== data_prazo) {
      updateFields.push('data_prazo = @data_prazo');
      params.data_prazo = data_prazo;
      await createHistorico(
        id,
        userId,
        'edicao',
        'data_prazo',
        currentExpediente.data_prazo ? currentExpediente.data_prazo.toISOString() : '',
        data_prazo || '',
        `Data de prazo alterada`,
        req.ip
      );
    }
    
    if (data_fechamento !== undefined && currentExpediente.data_fechamento !== data_fechamento) {
      updateFields.push('data_fechamento = @data_fechamento');
      params.data_fechamento = data_fechamento;
      await createHistorico(
        id,
        userId,
        'edicao',
        'data_fechamento',
        currentExpediente.data_fechamento ? currentExpediente.data_fechamento.toISOString() : '',
        data_fechamento || '',
        `Data de fechamento alterada`,
        req.ip
      );
    }
    
    if (responsavel_id !== undefined && currentExpediente.responsavel_id !== responsavel_id) {
      updateFields.push('responsavel_id = @responsavel_id');
      params.responsavel_id = responsavel_id;
      await createHistorico(
        id,
        userId,
        'responsavel',
        'responsavel_id',
        currentExpediente.responsavel_id || '',
        responsavel_id || '',
        `Responsável alterado`,
        req.ip
      );
    }
    
    if (departamento_id !== undefined && currentExpediente.departamento_id !== departamento_id) {
      updateFields.push('departamento_id = @departamento_id');
      params.departamento_id = departamento_id;
      await createHistorico(
        id,
        userId,
        'edicao',
        'departamento_id',
        currentExpediente.departamento_id || '',
        departamento_id || '',
        `Departamento alterado`,
        req.ip
      );
    }
    
    if (observacoes !== undefined && currentExpediente.observacoes !== observacoes) {
      updateFields.push('observacoes = @observacoes');
      params.observacoes = observacoes;
      await createHistorico(
        id,
        userId,
        'edicao',
        'observacoes',
        currentExpediente.observacoes || '',
        observacoes || '',
        `Observações alteradas`,
        req.ip
      );
    }
    
    if (publico !== undefined && currentExpediente.publico !== publico) {
      updateFields.push('publico = @publico');
      params.publico = publico;
      await createHistorico(
        id,
        userId,
        'edicao',
        'publico',
        currentExpediente.publico ? 'Público' : 'Privado',
        publico ? 'Público' : 'Privado',
        `Visibilidade alterada para ${publico ? 'Público' : 'Privado'}`,
        req.ip
      );
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    updateFields.push('updated_at = GETDATE()');
    
    const query = `
      UPDATE expedientes 
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `;
    
    await executeQuery(query, params);
    
    // Return updated expediente
    const updatedExpediente = await executeQuery(`
      SELECT 
        e.id, e.numero, e.titulo, e.descricao, e.tipo, e.status, e.prioridade,
        e.data_abertura, e.data_prazo, e.data_fechamento, e.criado_por,
        e.responsavel_id, e.departamento_id, e.observacoes, e.publico, e.ativo,
        e.created_at, e.updated_at
      FROM expedientes e
      WHERE e.id = @id
    `, { id });
    
    res.json(updatedExpediente[0]);
  } catch (error) {
    console.error('Error updating expediente:', error);
    res.status(500).json({ error: 'Erro ao atualizar expediente' });
  }
};

export const deleteExpediente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions
    const checkQuery = `
      SELECT criado_por, departamento_id, status 
      FROM expedientes 
      WHERE id = @id AND ativo = 1
    `;
    const checkResult = await executeQuery(checkQuery, { id });
    
    if (checkResult.length === 0) {
      return res.status(404).json({ error: 'Expediente não encontrado' });
    }
    
    const expediente = checkResult[0];
    
    // Check if expediente is closed and user is not admin
    if (expediente.status === 'fechado' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Expedientes fechados só podem ser excluídos por administradores' });
    }
    
    const canDelete = userRole === 'admin' || 
                     expediente.criado_por === userId ||
                     (userRole === 'gestor' && expediente.departamento_id === req.headers['x-user-department-id']);
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Sem permissão para excluir este expediente' });
    }
    
    // Soft delete
    await executeQuery(`
      UPDATE expedientes 
      SET ativo = 0, updated_at = GETDATE()
      WHERE id = @id
    `, { id });
    
    res.json({ message: 'Expediente excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting expediente:', error);
    res.status(500).json({ error: 'Erro ao excluir expediente' });
  }
};

// Document management for expedientes
export const getExpedienteDocumentos = async (req: Request, res: Response) => {
  try {
    const { expedienteId } = req.params;
    
    const query = `
      SELECT 
        ed.id, ed.expediente_id, ed.documento_id, ed.adicionado_por, ed.data_adicao, ed.observacoes,
        d.nome, d.nome_original, d.tipo_arquivo, d.tamanho, d.categoria, d.created_at as documento_created_at,
        u.nome as adicionado_por_nome, u.email as adicionado_por_email
      FROM expedientes_documentos ed
      LEFT JOIN documentos d ON ed.documento_id = d.id
      LEFT JOIN usuarios u ON ed.adicionado_por = u.id
      WHERE ed.expediente_id = @expedienteId
      ORDER BY ed.data_adicao DESC
    `;
    
    const results = await executeQuery(query, { expedienteId });
    
    const documentos = results.map((row: any) => ({
      id: row.id,
      expediente_id: row.expediente_id,
      documento_id: row.documento_id,
      adicionado_por: row.adicionado_por,
      data_adicao: row.data_adicao,
      observacoes: row.observacoes,
      documento: {
        id: row.documento_id,
        nome: row.nome,
        nome_original: row.nome_original,
        tipo_arquivo: row.tipo_arquivo,
        tamanho: row.tamanho,
        categoria: row.categoria,
        created_at: row.documento_created_at
      },
      adicionado_por_usuario: {
        nome: row.adicionado_por_nome,
        email: row.adicionado_por_email
      }
    }));
    
    res.json(documentos);
  } catch (error) {
    console.error('Error fetching expediente documentos:', error);
    res.status(500).json({ error: 'Erro ao buscar documentos do expediente' });
  }
};

export const addDocumentoToExpediente = async (req: Request, res: Response) => {
  try {
    const { expedienteId } = req.params;
    const { documento_id, observacoes } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!documento_id) {
      return res.status(400).json({ error: 'ID do documento é obrigatório' });
    }
    
    // Check if document is already linked
    const existingQuery = `
      SELECT COUNT(*) as count 
      FROM expedientes_documentos 
      WHERE expediente_id = @expedienteId AND documento_id = @documento_id
    `;
    const existingResult = await executeQuery(existingQuery, { expedienteId, documento_id });
    
    if (existingResult[0]?.count > 0) {
      return res.status(400).json({ error: 'Documento já está vinculado a este expediente' });
    }
    
    const query = `
      INSERT INTO expedientes_documentos (expediente_id, documento_id, adicionado_por, observacoes)
      OUTPUT INSERTED.id
      VALUES (@expedienteId, @documento_id, @userId, @observacoes)
    `;
    
    const results = await executeQuery(query, {
      expedienteId,
      documento_id,
      userId,
      observacoes: observacoes || null
    });
    
    res.status(201).json({ id: results[0].id, message: 'Documento adicionado ao expediente com sucesso' });
  } catch (error) {
    console.error('Error adding documento to expediente:', error);
    res.status(500).json({ error: 'Erro ao adicionar documento ao expediente' });
  }
};

export const removeDocumentoFromExpediente = async (req: Request, res: Response) => {
  try {
    const { expedienteId, documentoId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Check if user can remove document (admin, creator of expediente, or who added the document)
    const checkQuery = `
      SELECT ed.adicionado_por, e.criado_por
      FROM expedientes_documentos ed
      LEFT JOIN expedientes e ON ed.expediente_id = e.id
      WHERE ed.expediente_id = @expedienteId AND ed.documento_id = @documentoId
    `;
    const checkResult = await executeQuery(checkQuery, { expedienteId, documentoId });
    
    if (checkResult.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado no expediente' });
    }
    
    const canRemove = userRole === 'admin' || 
                     checkResult[0].adicionado_por === userId ||
                     checkResult[0].criado_por === userId;
    
    if (!canRemove) {
      return res.status(403).json({ error: 'Sem permissão para remover este documento' });
    }
    
    await executeQuery(`
      DELETE FROM expedientes_documentos 
      WHERE expediente_id = @expedienteId AND documento_id = @documentoId
    `, { expedienteId, documentoId });
    
    res.json({ message: 'Documento removido do expediente com sucesso' });
  } catch (error) {
    console.error('Error removing documento from expediente:', error);
    res.status(500).json({ error: 'Erro ao remover documento do expediente' });
  }
};
