import { Router } from 'express';
import {
  getAllDespesas,
  getDespesaById,
  createDespesa,
  updateDespesa,
  deleteDespesa,
  uploadAnexo
} from '../controllers/despesasController.js';

const router = Router();

router.get('/', getAllDespesas);
router.get('/:id', getDespesaById);
router.post('/', createDespesa);
router.post('/upload-anexos', uploadAnexo.array('anexos', 3), (req, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }
    
    const files = req.files as Express.Multer.File[];
    const uploadedFiles = files.map(file => ({
      fileUrl: `/uploads/documentos/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));
    
    return res.json({ 
      success: true, 
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return res.status(500).json({ error: 'Erro ao fazer upload dos arquivos' });
  }
});

// Get attachments for a despesa
router.get('/:id/anexos', async (req, res) => {
  try {
    const { id } = req.params;
    const { executeQuery } = await import('../config/database');
    
    const query = `
      SELECT id, despesa_id, anexo_url, created_at
      FROM despesa_anexos
      WHERE despesa_id = @despesa_id
      ORDER BY created_at ASC
    `;
    
    const anexos = await executeQuery(query, { despesa_id: id });
    return res.json(anexos);
  } catch (error) {
    console.error('Error fetching anexos:', error);
    return res.status(500).json({ error: 'Erro ao buscar anexos' });
  }
});

router.put('/:id', updateDespesa);
router.delete('/:id', deleteDespesa);

export default router;
