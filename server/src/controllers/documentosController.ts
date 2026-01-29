import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
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

export const getAllDocumentos = async (req: Request, res: Response) => {
  try {
    const { categoria, departamento_id, criado_por, publico, ativo = '1' } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userDepartmentId = req.headers['x-user-department-id'] as string;
    
    
    
    
    let whereConditions = ['d.ativo = @ativo'];
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
        d.created_at, d.updated_at,
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
      criado_por 
    } = req.body;
    
    if (!criado_por) {
      return res.status(400).json({ error: 'Usuário criador é obrigatório' });
    }
    
    const documentoNome = nome || file.originalname;
    const caminhoArquivo = file.path;
    const urlAcesso = `/api/documentos/${file.filename}/download`;
    
    const query = `
      INSERT INTO documentos (
        nome, nome_original, descricao, tipo_arquivo, tamanho, caminho_arquivo,
        url_acesso, categoria, tags, criado_por, departamento_id, publico
      )
      OUTPUT INSERTED.id
      VALUES (
        @nome, @nome_original, @descricao, @tipo_arquivo, @tamanho, @caminho_arquivo,
        @url_acesso, @categoria, @tags, @criado_por, @departamento_id, @publico
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
      publico: publico === 'true' || publico === true
    });
    
    const documento = await getDocumentoByIdInternal(result[0].id);
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
    
    console.log('🔍 Debug updateDocumento - ID:', id);
    console.log('🔍 Debug updateDocumento - req.body:', updates);
    console.log('🔍 Debug updateDocumento - Content-Type:', req.headers['content-type']);
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Dados de atualização não fornecidos' });
    }
    
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (updates.nome !== undefined) {
      fields.push('nome = @nome');
      params.nome = updates.nome;
    }
    if (updates.descricao !== undefined) {
      fields.push('descricao = @descricao');
      params.descricao = updates.descricao;
    }
    if (updates.categoria !== undefined) {
      fields.push('categoria = @categoria');
      params.categoria = updates.categoria;
    }
    if (updates.tags !== undefined) {
      fields.push('tags = @tags');
      params.tags = updates.tags;
    }
    if (updates.publico !== undefined) {
      fields.push('publico = @publico');
      params.publico = updates.publico;
    }
    if (updates.departamento_id !== undefined) {
      fields.push('departamento_id = @departamento_id');
      params.departamento_id = updates.departamento_id;
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
    
    const query = `
      SELECT caminho_arquivo, nome_original, tipo_arquivo
      FROM documentos
      WHERE caminho_arquivo LIKE '%' + @filename + '%' AND ativo = 1
    `;
    
    const results = await executeQuery(query, { filename });
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    const documento = results[0];
    const filePath = documento.caminho_arquivo;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo físico não encontrado' });
    }
    
    res.setHeader('Content-Type', documento.tipo_arquivo);
    res.setHeader('Content-Disposition', `attachment; filename="${documento.nome_original}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading documento:', error);
    res.status(500).json({ error: 'Erro ao baixar documento' });
  }
};

async function getDocumentoByIdInternal(id: string) {
  const query = `
    SELECT 
      d.id, d.nome, d.nome_original, d.descricao, d.tipo_arquivo, d.tamanho,
      d.caminho_arquivo, d.url_acesso, d.categoria, d.tags, d.criado_por,
      d.departamento_id, d.publico, d.ativo, d.versao, d.documento_pai_id,
      d.created_at, d.updated_at,
      u.id as 'criador.id', u.nome as 'criador.nome', u.email as 'criador.email',
      u.role as 'criador.role',
      dep.id as 'departamento.id', dep.nome as 'departamento.nome',
      dep.sigla as 'departamento.sigla'
    FROM documentos d
    LEFT JOIN usuarios u ON d.criado_por = u.id
    LEFT JOIN departamentos dep ON d.departamento_id = dep.id
    WHERE d.id = @id
  `;
  
  const results = await executeQuery(query, { id });
  const row = results[0];
  
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
  };
}
