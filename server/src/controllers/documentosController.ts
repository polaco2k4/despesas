import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import { createHistorico } from './historicoDocumentosController.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
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
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// Generate document number in format xxxx/sigla/yyyy
const generateDocumentNumber = async (departamentoId?: string) => {
  try {
    const year = new Date().getFullYear();
    
    let deptSigla = 'GER';
    if (departamentoId) {
      const deptQuery = `
        SELECT sigla FROM departamentos 
        WHERE id = @departamentoId
      `;
      const deptResult = await executeQuery(deptQuery, { departamentoId });
      deptSigla = deptResult[0]?.sigla || 'GER';
    }
    
    // Check if sequence exists for this department and year
    const sequenceQuery = `
      SELECT proximo_numero 
      FROM documento_sequencia 
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
        UPDATE documento_sequencia 
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
        INSERT INTO documento_sequencia (departamento_id, ano, proximo_numero)
        VALUES (@departamentoId, @year, 2)
      `;
      await executeQuery(insertQuery, { 
        departamentoId: departamentoId || null, 
        year 
      });
    }
    
    // Format: xxxx/sigla/yyyy
    const sequentialNumber = nextNumber.toString().padStart(4, '0');
    return `${sequentialNumber}/${deptSigla}/${year}`;
  } catch (error) {
    console.error('Erro ao gerar número do documento:', error);
    // Fallback to timestamp-based number
    return `${Date.now().toString().substring(0, 4)}/GER/${new Date().getFullYear()}`;
  }
};

export const getAllDocumentos = async (req: Request, res: Response) => {
  try {
    const { categoria, departamento_id, criado_por, publico, ativo = '1' } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;
    
    
    
    
    let whereConditions = ['d.ativo = @ativo', 'd.documento_pai_id IS NULL'];
    const params: any = { ativo: ativo === '1' };
    
    // Role-based access control
    if (userRole !== 'admin') {
      if (userRole === 'colaborador' || userRole === 'gestor') {
        // Colaborador e gestor: apenas documentos do seu departamento
        // E documentos privados apenas se for o criador
        whereConditions.push(`(
          (d.departamento_id = @userDepartmentId AND d.publico = 1) OR 
          (d.criado_por = @userId)
        )`);
        params.userDepartmentId = userDepartmentId;
        params.userId = userId;
      } else if (userRole === 'adm_area') {
        // ADM Área: documentos públicos dos departamentos associados + seus próprios documentos
        // Buscar departamentos associados ao usuário
        const departamentosQuery = `
          SELECT departamento_id 
          FROM usuarios_departamentos 
          WHERE usuario_id = @userId
        `;
        const departamentosResult = await executeQuery(departamentosQuery, { userId });
        const departamentoIds = departamentosResult.map((row: any) => row.departamento_id);
        
        if (departamentoIds.length > 0) {
          const placeholders = departamentoIds.map((_, index) => `@dept${index}`).join(', ');
          
          // ADM_AREA pode ver:
          // 1. Documentos públicos dos departamentos associados (criados por qualquer um)
          // 2. Seus próprios documentos (públicos ou privados)
          const condition = `(
            (d.departamento_id IN (${placeholders}) AND d.publico = 1) OR 
            (d.criado_por = @userId)
          )`;
          whereConditions.push(condition);
          
          // Adicionar parâmetros para cada departamento
          departamentoIds.forEach((deptId, index) => {
            params[`dept${index}`] = deptId;
          });
          params.userId = userId;
        } else {
          // Se não tem departamentos associados, só pode ver seus próprios documentos
          whereConditions.push('d.criado_por = @userId');
          params.userId = userId;
        }
      } else {
        // Outros roles: apenas documentos que criou
        whereConditions.push('d.criado_por = @userId');
        params.userId = userId;
      }
    }
    // Admin vê todos os documentos (sem filtro adicional)
    
    if (categoria) {
      whereConditions.push('d.categoria = @categoria');
      params.categoria = categoria;
    }
    
    if (departamento_id) {
      whereConditions.push('d.departamento_id = @departamento_id');
      params.departamento_id = departamento_id;
    }
    
    if (criado_por) {
      whereConditions.push('d.criado_por = @criado_por');
      params.criado_por = criado_por;
    }
    
    if (publico !== undefined) {
      whereConditions.push('d.publico = @publico');
      params.publico = publico === '1';
    }

    const query = `
      SELECT 
        d.id, d.nome, d.nome_original, d.descricao, d.tipo_arquivo, d.tamanho,
        d.caminho_arquivo, d.url_acesso, d.categoria, d.tags, d.criado_por,
        d.departamento_id, d.publico, d.ativo, d.versao, d.documento_pai_id,
        d.created_at, d.updated_at, d.numero_documento,
        u.id as 'criador.id', u.nome as 'criador.nome', u.email as 'criador.email',
        u.role as 'criador.role',
        dep.id as 'departamento.id', dep.nome as 'departamento.nome',
        dep.sigla as 'departamento.sigla'
      FROM documentos d
      LEFT JOIN usuarios u ON d.criado_por = u.id
      LEFT JOIN departamentos dep ON d.departamento_id = dep.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY d.created_at DESC
    `;
    
    const results = await executeQuery(query, params);
    
    const documentos = results.map((row: any) => ({
      id: row.id,
      nome: row.nome,
      nome_original: row.nome_original,
      descricao: row.descricao,
      tipo_arquivo: row.tipo_arquivo,
      tamanho: row.tamanho,
      caminho_arquivo: row.caminho_arquivo,
      url_acesso: row.url_acesso,
      categoria: row.categoria,
      tags: row.tags,
      criado_por: row.criado_por,
      departamento_id: row.departamento_id,
      publico: row.publico,
      ativo: row.ativo,
      versao: row.versao,
      documento_pai_id: row.documento_pai_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      numero_documento: row.numero_documento,
      criador: row['criador.id'] ? {
        id: row['criador.id'],
        nome: row['criador.nome'],
        email: row['criador.email'],
        role: row['criador.role']
      } : undefined,
      departamento: row['departamento.id'] ? {
        id: row['departamento.id'],
        nome: row['departamento.nome'],
        sigla: row['departamento.sigla']
      } : undefined
    }));
    
    // Disable cache for debugging
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(documentos);
  } catch (error) {
    console.error('Error fetching documentos:', error);
    res.status(500).json({ error: 'Erro ao buscar documentos' });
  }
};

export const getDocumentoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;
    
    const documento = await getDocumentoByIdInternal(id);
    
    if (!documento) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    // Role-based access control
    if (userRole !== 'admin') {
      // Se não é admin, verificar permissões
      if (documento.criado_por !== userId) {
        // Se não é o criador, verificar outras regras
        if (userRole === 'colaborador' || userRole === 'gestor') {
          // Colaborador/gestor: só pode ver se for do mesmo departamento E público
          if (documento.departamento_id !== userDepartmentId || !documento.publico) {
            return res.status(403).json({ error: 'Acesso negado ao documento' });
          }
        } else if (userRole === 'adm_area') {
          // ADM Área: pode ver documentos públicos dos departamentos associados (criados por qualquer role)
          const departamentosQuery = `
            SELECT departamento_id 
            FROM usuarios_departamentos 
            WHERE usuario_id = @userId
          `;
          const departamentosResult = await executeQuery(departamentosQuery, { userId });
          const departamentoIds = departamentosResult.map((row: any) => row.departamento_id);
          
          // Verificar se o documento é público e pertence a um dos departamentos associados
          if (!documento.publico || !departamentoIds.includes(documento.departamento_id)) {
            return res.status(403).json({ error: 'Acesso negado ao documento' });
          }
        } else {
          // Outros roles: acesso negado se não for o criador
          return res.status(403).json({ error: 'Acesso negado ao documento' });
        }
      }
    }
    
    res.json(documento);
  } catch (error) {
    console.error('Error getting documento by ID:', error);
    res.status(500).json({ error: 'Erro ao buscar documento' });
  }
};

export const createDocumento = async (req: Request, res: Response) => {
  try {
    console.log('🔍 Debug createDocumento - req.file:', req.file);
    console.log('🔍 Debug createDocumento - req.body:', req.body);
    console.log('🔍 Debug createDocumento - Content-Type:', req.headers['content-type']);
    
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Arquivo é obrigatório' });
    }
    
    const {
      nome,
      descricao,
      categoria,
      tags,
      publico = false,
      departamento_id,
      criado_por,
      documento_pai_id
    } = req.body;

    if (!criado_por) {
      return res.status(400).json({ error: 'Usuário criador é obrigatório' });
    }

    // Generate document number
    const numeroDocumento = await generateDocumentNumber(departamento_id);

    const documentoNome = nome || file.originalname;
    const caminhoArquivo = file.path;
    const urlAcesso = `/api/documentos/${file.filename}/download`;

    const query = `
      INSERT INTO documentos (
        nome, nome_original, descricao, tipo_arquivo, tamanho, caminho_arquivo,
        url_acesso, categoria, tags, criado_por, departamento_id, publico, numero_documento, documento_pai_id
      )
      OUTPUT INSERTED.id
      VALUES (
        @nome, @nome_original, @descricao, @tipo_arquivo, @tamanho, @caminho_arquivo,
        @url_acesso, @categoria, @tags, @criado_por, @departamento_id, @publico, @numero_documento, @documento_pai_id
      )
    `;

    const result = await executeQuery(query, {
      nome: documentoNome,
      nome_original: file.originalname,
      descricao: descricao || null,
      tipo_arquivo: file.mimetype,
      tamanho: file.size,
      caminho_arquivo: caminhoArquivo,
      url_acesso: urlAcesso,
      categoria: categoria || null,
      tags: tags || null,
      criado_por,
      departamento_id: departamento_id || null,
      publico: publico === 'true' || publico === true,
      numero_documento: numeroDocumento,
      documento_pai_id: documento_pai_id || null
    });
    
    const documento = await getDocumentoByIdInternal(result[0].id);
    
    // Registrar histórico de criação
    await createHistorico(
      result[0].id,
      criado_por,
      'criacao',
      undefined,
      undefined,
      undefined,
      `Documento "${documentoNome}" foi criado com número ${numeroDocumento}`,
      req.ip
    );
    
    res.status(201).json(documento);
  } catch (error) {
    console.error('Error creating documento:', error);
    res.status(500).json({ error: 'Erro ao criar documento' });
  }
};

export const updateDocumento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.headers['x-user-id'] as string;
    const newFile = req.file;

    if ((!updates || Object.keys(updates).length === 0) && !newFile) {
      return res.status(400).json({ error: 'Dados de atualização não fornecidos' });
    }
    
    // Buscar documento atual para comparar valores
    const documentoAtual = await getDocumentoByIdInternal(id);
    if (!documentoAtual) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (updates.nome !== undefined) {
      fields.push('nome = @nome');
      params.nome = updates.nome;
      if (documentoAtual.nome !== updates.nome) {
        await createHistorico(
          id,
          userId,
          'edicao',
          'nome',
          documentoAtual.nome,
          updates.nome,
          `Nome alterado de "${documentoAtual.nome}" para "${updates.nome}"`,
          req.ip
        );
      }
    }
    if (updates.descricao !== undefined) {
      fields.push('descricao = @descricao');
      params.descricao = updates.descricao;
      if (documentoAtual.descricao !== updates.descricao) {
        await createHistorico(
          id,
          userId,
          'edicao',
          'descricao',
          documentoAtual.descricao || '',
          updates.descricao,
          `Descrição alterada`,
          req.ip
        );
      }
    }
    if (updates.categoria !== undefined) {
      fields.push('categoria = @categoria');
      params.categoria = updates.categoria;
      if (documentoAtual.categoria !== updates.categoria) {
        await createHistorico(
          id,
          userId,
          'edicao',
          'categoria',
          documentoAtual.categoria || '',
          updates.categoria,
          `Categoria alterada de "${documentoAtual.categoria || 'Nenhuma'}" para "${updates.categoria}"`,
          req.ip
        );
      }
    }
    if (updates.tags !== undefined) {
      fields.push('tags = @tags');
      params.tags = updates.tags;
      if (documentoAtual.tags !== updates.tags) {
        await createHistorico(
          id,
          userId,
          'edicao',
          'tags',
          documentoAtual.tags || '',
          updates.tags,
          `Tags alteradas`,
          req.ip
        );
      }
    }
    if (updates.publico !== undefined) {
      fields.push('publico = @publico');
      params.publico = updates.publico;
      if (documentoAtual.publico !== updates.publico) {
        await createHistorico(
          id,
          userId,
          'edicao',
          'publico',
          documentoAtual.publico ? 'Público' : 'Privado',
          updates.publico ? 'Público' : 'Privado',
          `Visibilidade alterada para ${updates.publico ? 'Público' : 'Privado'}`,
          req.ip
        );
      }
    }
    if (updates.departamento_id !== undefined) {
      fields.push('departamento_id = @departamento_id');
      params.departamento_id = updates.departamento_id;
      if (documentoAtual.departamento_id !== updates.departamento_id) {
        await createHistorico(
          id,
          userId,
          'edicao',
          'departamento_id',
          documentoAtual.departamento_id || '',
          updates.departamento_id,
          `Departamento alterado`,
          req.ip
        );
      }
    }

    // Handle file replacement
    if (newFile) {
      fields.push('nome_original = @nome_original');
      fields.push('tipo_arquivo = @tipo_arquivo');
      fields.push('tamanho = @tamanho');
      fields.push('caminho_arquivo = @caminho_arquivo');
      fields.push('url_acesso = @url_acesso');
      params.nome_original = newFile.originalname;
      params.tipo_arquivo = newFile.mimetype;
      params.tamanho = newFile.size;
      params.caminho_arquivo = newFile.path;
      params.url_acesso = `/api/documentos/${newFile.filename}/download`;
      await createHistorico(
        id,
        userId,
        'edicao',
        'arquivo',
        documentoAtual.nome_original || '',
        newFile.originalname,
        `Arquivo substituído por "${newFile.originalname}"`,
        req.ip
      );
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE documentos
      SET ${fields.join(', ')}, updated_at = GETDATE()
      WHERE id = @id AND ativo = 1
    `;
    
    await executeQuery(query, params);
    
    const documento = await getDocumentoByIdInternal(id);
    res.json(documento);
  } catch (error) {
    console.error('Error updating documento:', error);
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
};

export const deleteDocumento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Soft delete
    const query = `
      UPDATE documentos
      SET ativo = 0, updated_at = GETDATE()
      WHERE id = @id
    `;
    
    await executeQuery(query, { id });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting documento:', error);
    res.status(500).json({ error: 'Erro ao deletar documento' });
  }
};

export const downloadDocumento = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    console.log('Download by filename requested:', filename);
    
    // Download by filename - try multiple approaches
    const searchParam = filename;
    let results = [];
    
    // Try multiple query approaches to find the document
    let query = `
      SELECT caminho_arquivo, nome_original, tipo_arquivo, nome
      FROM documentos
      WHERE caminho_arquivo LIKE '%' + @searchParam AND ativo = 1
    `;
    
    results = await executeQuery(query, { searchParam });
    console.log('First query results:', results.length);
    
    // If no results, try with different path separators
    if (results.length === 0) {
      query = `
        SELECT caminho_arquivo, nome_original, tipo_arquivo, nome
        FROM documentos
        WHERE caminho_arquivo LIKE '%/' + @searchParam AND ativo = 1
      `;
      results = await executeQuery(query, { searchParam });
      console.log('Second query results:', results.length);
    }
    
    // If still no results, try partial match
    if (results.length === 0) {
      query = `
        SELECT caminho_arquivo, nome_original, tipo_arquivo, nome
        FROM documentos
        WHERE caminho_arquivo LIKE '%' + @searchParam + '%' AND ativo = 1
      `;
      results = await executeQuery(query, { searchParam });
      console.log('Third query results:', results.length);
    }
    
    // If still no results, try matching by nome field
    if (results.length === 0) {
      query = `
        SELECT caminho_arquivo, nome_original, tipo_arquivo, nome
        FROM documentos
        WHERE nome = @searchParam AND ativo = 1
      `;
      results = await executeQuery(query, { searchParam });
      console.log('Fourth query results:', results.length);
    }
    
    if (results.length === 0) {
      console.log('No document found for filename:', filename);
      // Debug: show all documents to understand the data structure
      const debugQuery = `SELECT TOP 5 id, caminho_arquivo, nome, nome_original FROM documentos WHERE ativo = 1`;
      const debugResults = await executeQuery(debugQuery, {});
      console.log('Sample documents in database:', debugResults);
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    const documento = results[0];
    const filePath = documento.caminho_arquivo;
    console.log('Found document with path:', filePath);
    console.log('Document details:', documento);
    
    if (!fs.existsSync(filePath)) {
      console.log('Physical file not found at path:', filePath);
      return res.status(404).json({ error: 'Arquivo físico não encontrado' });
    }
    
    res.setHeader('Content-Type', documento.tipo_arquivo || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${documento.nome_original}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading documento:', error);
    res.status(500).json({ error: 'Erro ao baixar documento' });
  }
};

export const downloadDocumentoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Download by ID requested:', id);
    
    // Download by document ID - more reliable
    const query = `
      SELECT caminho_arquivo, nome_original, tipo_arquivo, nome
      FROM documentos
      WHERE id = @id AND ativo = 1
    `;
    
    const results = await executeQuery(query, { id });
    console.log('Download by ID results:', results.length);
    
    if (results.length === 0) {
      console.log('No document found for ID:', id);
      // Debug: show all documents to understand the data structure
      const debugQuery = `SELECT TOP 5 id, caminho_arquivo, nome, nome_original FROM documentos WHERE ativo = 1`;
      const debugResults = await executeQuery(debugQuery, {});
      console.log('Sample documents in database:', debugResults);
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    const documento = results[0];
    const filePath = documento.caminho_arquivo;
    console.log('Found document with path:', filePath);
    console.log('Document details:', documento);
    
    if (!fs.existsSync(filePath)) {
      console.log('Physical file not found at path:', filePath);
      return res.status(404).json({ error: 'Arquivo físico não encontrado' });
    }
    
    res.setHeader('Content-Type', documento.tipo_arquivo || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${documento.nome_original}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading documento by ID:', error);
    res.status(500).json({ error: 'Erro ao baixar documento' });
  }
};

async function getDocumentoByIdInternal(id: string) {
  const query = `
    SELECT 
      d.id, d.nome, d.nome_original, d.descricao, d.tipo_arquivo, d.tamanho,
      d.caminho_arquivo, d.url_acesso, d.categoria, d.tags, d.criado_por,
      d.departamento_id, d.publico, d.ativo, d.versao, d.documento_pai_id,
      d.created_at, d.updated_at, d.numero_documento,
      u.id as 'criador.id', u.nome as 'criador.nome', u.email as 'criador.email',
      u.role as 'criador.role',
      dep.id as 'departamento.id', dep.nome as 'departamento.nome',
      dep.sigla as 'departamento.sigla'
    FROM documentos d
    LEFT JOIN usuarios u ON d.criado_por = u.id
    LEFT JOIN departamentos dep ON d.departamento_id = dep.id
    WHERE d.id = @id AND d.ativo = 1
  `;
  
  const results = await executeQuery(query, { id });

  if (!results || results.length === 0) {
    return null;
  }

  const row = results[0];

  // Buscar arquivos filhos (documentos vinculados via documento_pai_id)
  const versoesQuery = `
    SELECT id, nome, nome_original, tipo_arquivo, tamanho, caminho_arquivo, url_acesso, created_at
    FROM documentos
    WHERE documento_pai_id = @id AND ativo = 1
    ORDER BY created_at ASC
  `;
  const versoesRows = await executeQuery(versoesQuery, { id });

  return {
    id: row.id,
    nome: row.nome,
    nome_original: row.nome_original,
    descricao: row.descricao,
    tipo_arquivo: row.tipo_arquivo,
    tamanho: row.tamanho,
    caminho_arquivo: row.caminho_arquivo,
    url_acesso: row.url_acesso,
    categoria: row.categoria,
    tags: row.tags,
    criado_por: row.criado_por,
    departamento_id: row.departamento_id,
    publico: row.publico,
    ativo: row.ativo,
    versao: row.versao,
    documento_pai_id: row.documento_pai_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    numero_documento: row.numero_documento,
    criador: row['criador.id'] ? {
      id: row['criador.id'],
      nome: row['criador.nome'],
      email: row['criador.email'],
      role: row['criador.role']
    } : undefined,
    departamento: row['departamento.id'] ? {
      id: row['departamento.id'],
      nome: row['departamento.nome'],
      sigla: row['departamento.sigla']
    } : undefined,
    versoes: versoesRows.map((v: any) => ({
      id: v.id,
      nome: v.nome,
      nome_original: v.nome_original,
      tipo_arquivo: v.tipo_arquivo,
      tamanho: v.tamanho,
      caminho_arquivo: v.caminho_arquivo,
      url_acesso: v.url_acesso,
      created_at: v.created_at
    }))
  };
}
