import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for fornecedor document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documentos', 'fornecedores');
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

export const uploadDocumento = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|txt|jpg|jpeg|png|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de ficheiro não permitido'));
    }
  }
});

export const getAllFornecedores = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT f.id, f.nome, f.nif, f.telefone, f.email, f.endereco, f.categoria, f.status, f.created_at, f.updated_at,
        (SELECT d.id, d.nome, d.nome_ficheiro, d.tipo, d.tamanho, d.data_upload
         FROM documentos_fornecedores d WHERE d.fornecedor_id = f.id
         FOR JSON PATH) as documentos_json
      FROM fornecedores f
      ORDER BY f.nome
    `;
    const results = await executeQuery(query);
    
    const fornecedores = results.map((row: any) => {
      const { documentos_json, ...rest } = row;
      let documentos: any[] = [];
      if (documentos_json) {
        try {
          documentos = JSON.parse(documentos_json).map((doc: any) => ({
            ...doc,
            url: `/api/fornecedores/${rest.id}/documentos/${doc.id}/download`
          }));
        } catch (e) {
          documentos = [];
        }
      }
      return { ...rest, documentos };
    });
    
    res.json(fornecedores);
  } catch (error) {
    console.error('Error fetching fornecedores:', error);
    res.status(500).json({ error: 'Erro ao buscar fornecedores' });
  }
};

export const createFornecedor = async (req: Request, res: Response) => {
  try {
    const { nome, nif, telefone, email, endereco, categoria, status } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Check for duplicate nome
    const nomeCheck = await executeQuery(
      `SELECT id FROM fornecedores WHERE LOWER(nome) = LOWER(@nome)`,
      { nome }
    );
    
    if (nomeCheck.length > 0) {
      return res.status(400).json({ 
        error: 'Já existe um fornecedor com este nome' 
      });
    }

    // Check for duplicate nif (if provided)
    if (nif && nif.trim() !== '') {
      const nifCheck = await executeQuery(
        `SELECT id FROM fornecedores WHERE nif = @nif`,
        { nif }
      );
      
      if (nifCheck.length > 0) {
        return res.status(400).json({ 
          error: 'Já existe um fornecedor com este NIF' 
        });
      }
    }

    const query = `
      INSERT INTO fornecedores (nome, nif, telefone, email, endereco, categoria, status)
      OUTPUT INSERTED.*
      VALUES (@nome, @nif, @telefone, @email, @endereco, @categoria, @status)
    `;
    const result = await executeQuery(query, { 
      nome, 
      nif, 
      telefone, 
      email, 
      endereco, 
      categoria: categoria || 'Geral',
      status: status || 'ativo'
    });
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating fornecedor:', error);
    res.status(500).json({ error: 'Erro ao criar fornecedor' });
  }
};

export const updateFornecedor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check for duplicate nome (if being updated)
    if (updates.nome !== undefined) {
      const nomeCheck = await executeQuery(
        `SELECT id FROM fornecedores WHERE LOWER(nome) = LOWER(@nome) AND id != @id`,
        { nome: updates.nome, id }
      );
      
      if (nomeCheck.length > 0) {
        return res.status(400).json({ 
          error: 'Já existe um fornecedor com este nome' 
        });
      }
    }

    // Check for duplicate nif (if being updated and not empty)
    if (updates.nif !== undefined && updates.nif && updates.nif.trim() !== '') {
      const nifCheck = await executeQuery(
        `SELECT id FROM fornecedores WHERE nif = @nif AND id != @id`,
        { nif: updates.nif, id }
      );
      
      if (nifCheck.length > 0) {
        return res.status(400).json({ 
          error: 'Já existe um fornecedor com este NIF' 
        });
      }
    }
    
    const fields = [];
    const params: Record<string, any> = { id };
    
    if (updates.nome !== undefined) {
      fields.push('nome = @nome');
      params.nome = updates.nome;
    }
    if (updates.nif !== undefined) {
      fields.push('nif = @nif');
      params.nif = updates.nif;
    }
    if (updates.telefone !== undefined) {
      fields.push('telefone = @telefone');
      params.telefone = updates.telefone;
    }
    if (updates.email !== undefined) {
      fields.push('email = @email');
      params.email = updates.email;
    }
    if (updates.endereco !== undefined) {
      fields.push('endereco = @endereco');
      params.endereco = updates.endereco;
    }
    if (updates.categoria !== undefined) {
      fields.push('categoria = @categoria');
      params.categoria = updates.categoria;
    }
    if (updates.status !== undefined) {
      fields.push('status = @status');
      params.status = updates.status;
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const query = `
      UPDATE fornecedores
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating fornecedor:', error);
    res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
  }
};

export const deleteFornecedor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check for related contracts
    const contratosCheck = await executeQuery(
      `SELECT COUNT(*) as count FROM contratos WHERE fornecedor_id = @id`,
      { id }
    );
    
    if (contratosCheck[0].count > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar este fornecedor pois existem contratos associados a ele' 
      });
    }

    // Check for related despesas
    const despesasCheck = await executeQuery(
      `SELECT COUNT(*) as count FROM despesas WHERE fornecedor_id = @id`,
      { id }
    );
    
    if (despesasCheck[0].count > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar este fornecedor pois existem despesas associadas a ele' 
      });
    }

    // Check for related manutencoes (if table exists)
    try {
      const manutencoesCheck = await executeQuery(
        `SELECT COUNT(*) as count FROM manutencoes WHERE fornecedor_id = @id`,
        { id }
      );
      
      if (manutencoesCheck[0].count > 0) {
        return res.status(400).json({ 
          error: 'Não é possível deletar este fornecedor pois existem manutenções associadas a ele' 
        });
      }
    } catch (err) {
      // Table might not exist, continue
    }

    const query = `DELETE FROM fornecedores WHERE id = @id`;
    await executeQuery(query, { id });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting fornecedor:', error);
    res.status(500).json({ error: 'Erro ao deletar fornecedor' });
  }
};

// Document endpoints
export const addDocumentoFornecedor = async (req: Request, res: Response) => {
  try {
    const { fornecedorId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado' });
    }

    const query = `
      INSERT INTO documentos_fornecedores (fornecedor_id, nome, nome_ficheiro, tipo, tamanho)
      OUTPUT INSERTED.*
      VALUES (@fornecedorId, @nome, @nomeFicheiro, @tipo, @tamanho)
    `;
    const result = await executeQuery(query, {
      fornecedorId,
      nome: file.originalname,
      nomeFicheiro: file.filename,
      tipo: file.mimetype || 'application/octet-stream',
      tamanho: file.size
    });

    const doc = result[0];
    res.status(201).json({
      ...doc,
      url: `/api/fornecedores/${fornecedorId}/documentos/${doc.id}/download`
    });
  } catch (error) {
    console.error('Error adding documento to fornecedor:', error);
    res.status(500).json({ error: 'Erro ao adicionar documento' });
  }
};

export const downloadDocumentoFornecedor = async (req: Request, res: Response) => {
  try {
    const { documentoId } = req.params;

    const result = await executeQuery(
      `SELECT nome, nome_ficheiro, tipo FROM documentos_fornecedores WHERE id = @documentoId`,
      { documentoId }
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const doc = result[0];
    const filePath = path.join(process.cwd(), 'uploads', 'documentos', 'fornecedores', doc.nome_ficheiro);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Ficheiro não encontrado no servidor' });
    }

    res.setHeader('Content-Type', doc.tipo);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.nome)}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading documento:', error);
    res.status(500).json({ error: 'Erro ao transferir documento' });
  }
};

export const removeDocumentoFornecedor = async (req: Request, res: Response) => {
  try {
    const { documentoId } = req.params;

    const result = await executeQuery(
      `SELECT nome_ficheiro FROM documentos_fornecedores WHERE id = @documentoId`,
      { documentoId }
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'documentos', 'fornecedores', result[0].nome_ficheiro);
    
    await executeQuery(`DELETE FROM documentos_fornecedores WHERE id = @documentoId`, { documentoId });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error removing documento:', error);
    res.status(500).json({ error: 'Erro ao remover documento' });
  }
};
