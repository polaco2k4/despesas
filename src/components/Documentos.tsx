import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { documentosAPI, departamentosAPI } from '../lib/backendApi';
import { 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  Upload, 
  Download, 
  Filter, 
  X, 
  Check, 
  AlertCircle, 
  Pencil, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  XCircle, 
  FileText,
  FolderOpen
} from 'lucide-react';
import { AlertDialog } from './ui/AlertDialog';
import type { Documento, Departamento } from '../types/database';

const Documentos: React.FC = () => {
  const { userProfile } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error' as const,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [keepCurrentFile, setKeepCurrentFile] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);
  const [documentHistory, setDocumentHistory] = useState<any[]>([]);
  const [documentComments, setDocumentComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [uploadForm, setUploadForm] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    tags: '',
    publico: false,
    departamento_id: ''
  });
  const [editForm, setEditForm] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    tags: '',
    publico: false,
    departamento_id: ''
  });
  const [filters, setFilters] = useState({
    categoria: '',
    publico: '',
    criado_por: '',
    departamento_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchDocumentos();
  }, [filters]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchDocumentos(),
        fetchDepartamentos()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const fetchDocumentos = async () => {
    try {
      setLoading(true);
      const filterParams = {
        categoria: filters.categoria || undefined,
        publico: filters.publico ? filters.publico === 'true' : undefined,
        criado_por: filters.criado_por || undefined,
        departamento_id: filters.departamento_id || undefined
      };
      const data = await documentosAPI.getAll(filterParams);
      setDocumentos(data);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartamentos = async () => {
    try {
      const data = await departamentosAPI.getAll();
      setDepartamentos(data);
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
    }
  };

  const fetchDocumentHistory = async (documentoId: string) => {
    try {
      const data = await documentosAPI.getHistorico(documentoId);
      setDocumentHistory(data);
    } catch (error) {
      console.error('Erro ao buscar histórico do documento:', error);
      setDocumentHistory([]);
    }
  };

  const handleViewDetails = async (documento: Documento) => {
    setSelectedDocument(documento);
    setShowDetailsModal(true);
    await Promise.all([
      fetchDocumentHistory(documento.id),
      fetchDocumentComments(documento.id)
    ]);
  };

  const fetchDocumentComments = async (documentoId: string) => {
    try {
      const data = await documentosAPI.getComentarios(documentoId);
      setDocumentComments(data);
    } catch (error) {
      console.error('Erro ao buscar comentários do documento:', error);
      setDocumentComments([]);
    }
  };

  const handleCreateComment = async () => {
    if (!selectedDocument || !newComment.trim()) return;

    try {
      const novoComentario = await documentosAPI.createComentario(selectedDocument.id, newComment.trim());
      setDocumentComments(prev => [novoComentario, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao criar comentário',
        type: 'error'
      });
    }
  };

  const handleEditComment = (comentario: any) => {
    setEditingComment(comentario.id);
    setEditCommentText(comentario.comentario);
  };

  const handleUpdateComment = async (comentarioId: string) => {
    if (!editCommentText.trim()) return;

    try {
      const comentarioAtualizado = await documentosAPI.updateComentario(comentarioId, editCommentText.trim());
      setDocumentComments(prev => 
        prev.map(c => c.id === comentarioId ? comentarioAtualizado : c)
      );
      setEditingComment(null);
      setEditCommentText('');
    } catch (error) {
      console.error('Erro ao atualizar comentário:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao atualizar comentário',
        type: 'error'
      });
    }
  };

  const handleDeleteComment = async (comentarioId: string) => {
    try {
      await documentosAPI.deleteComentario(comentarioId);
      setDocumentComments(prev => prev.filter(c => c.id !== comentarioId));
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao deletar comentário',
        type: 'error'
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 3 - selectedFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      setAlertDialog({
        isOpen: true,
        title: 'Aviso',
        message: `Você pode adicionar no máximo 3 arquivos. Apenas os primeiros ${remainingSlots} foram adicionados.`,
        type: 'error'
      });
    }
    
    setSelectedFiles(prev => [...prev, ...filesToAdd]);
    if (selectedFiles.length === 0 && filesToAdd.length > 0) {
      setUploadForm(prev => ({
        ...prev,
        nome: prev.nome || filesToAdd[0].name
      }));
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !userProfile) return;

    try {
      setUploading(true);
      
      // Fazer upload de cada arquivo
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('nome', uploadForm.nome || file.name);
        formData.append('descricao', uploadForm.descricao);
        formData.append('categoria', uploadForm.categoria);
        formData.append('tags', uploadForm.tags);
        formData.append('publico', uploadForm.publico.toString());
        formData.append('criado_por', userProfile.id);
        if (uploadForm.departamento_id) {
          formData.append('departamento_id', uploadForm.departamento_id);
        }

        await documentosAPI.create(formData);
      }
      
      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadForm({
        nome: '',
        descricao: '',
        categoria: '',
        tags: '',
        publico: false,
        departamento_id: ''
      });
      await fetchDocumentos();
      
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: `${selectedFiles.length} documento(s) enviado(s) com sucesso!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao fazer upload do documento',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (documento: Documento) => {
    setSelectedDocument(documento);
    setEditFiles([]);
    setKeepCurrentFile(true);
    setEditForm({
      nome: documento.nome,
      descricao: documento.descricao || '',
      categoria: documento.categoria || '',
      tags: documento.tags || '',
      publico: documento.publico || false,
      departamento_id: documento.departamento_id || ''
    });
    setShowEditModal(true);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 3 - editFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      setAlertDialog({
        isOpen: true,
        title: 'Aviso',
        message: `Você pode adicionar no máximo 3 arquivos. Apenas os primeiros ${remainingSlots} foram adicionados.`,
        type: 'error'
      });
    }
    
    setEditFiles(prev => [...prev, ...filesToAdd]);
  };

  const removeEditFile = (index: number) => {
    setEditFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument) return;

    console.log('🔍 Estado do formulário:', {
      editForm,
      keepCurrentFile,
      editFiles: editFiles.length,
      selectedDocument: selectedDocument.id
    });

    // Validar se há arquivo quando o atual foi removido
    if (!keepCurrentFile && editFiles.length === 0) {
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Você removeu o arquivo atual. Por favor, selecione um novo arquivo.',
        type: 'error'
      });
      return;
    }

    try {
      // Se houver novos arquivos, fazer upload completo
      if (editFiles.length > 0) {
        console.log('📁 Atualizando com novo arquivo');
        const formData = new FormData();
        formData.append('file', editFiles[0]); // Apenas o primeiro arquivo substitui
        formData.append('nome', editForm.nome);
        formData.append('descricao', editForm.descricao);
        formData.append('categoria', editForm.categoria);
        formData.append('tags', editForm.tags);
        formData.append('publico', editForm.publico.toString());
        if (editForm.departamento_id) {
          formData.append('departamento_id', editForm.departamento_id);
        }
        
        // Atualizar com novo arquivo
        await documentosAPI.update(selectedDocument.id, formData);
      } else if (keepCurrentFile) {
        console.log('📝 Atualizando apenas metadados');
        // Atualizar apenas metadados (mantém arquivo atual)
        const updateData: Record<string, any> = {
          nome: editForm.nome,
          descricao: editForm.descricao || '',
          categoria: editForm.categoria || '',
          tags: editForm.tags || '',
          publico: editForm.publico
        };
        
        if (editForm.departamento_id) {
          updateData.departamento_id = editForm.departamento_id;
        }
        
        console.log('📤 Enviando updateData:', updateData);
        console.log('📊 Número de campos:', Object.keys(updateData).length);
        console.log('📋 Tipo de dados:', typeof updateData);
        console.log('🔑 Chaves:', Object.keys(updateData));
        
        await documentosAPI.update(selectedDocument.id, updateData);
      } else {
        console.error('❌ Nenhuma condição de atualização satisfeita!');
      }
      
      setShowEditModal(false);
      setSelectedDocument(null);
      setEditFiles([]);
      setKeepCurrentFile(true);
      await fetchDocumentos();
      
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Documento atualizado com sucesso!',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao atualizar documento',
        type: 'error'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await documentosAPI.delete(id);
      await fetchDocumentos();
      
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Documento excluído com sucesso!',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao excluir documento',
        type: 'error'
      });
    }
  };

  const handleDownload = async (documento: any) => {
    try {
      if (documento.id) {
        // Use downloadById for more reliability
        await documentosAPI.downloadById(documento.id);
      } else {
        // Fallback to filename method
        const filenameFromPath = documento.caminho_arquivo?.split('\\').pop()?.split('/').pop() || documento.nome;
        await documentosAPI.download(filenameFromPath);
      }
    } catch (error) {
      console.error('Download error:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro no Download',
        message: 'Erro ao baixar o arquivo. Verifique se o arquivo existe.',
        type: 'error'
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getFieldDisplayName = (fieldName: string) => {
    const fieldNames: { [key: string]: string } = {
      'departamento_id': 'Departamento',
      'nome': 'Nome',
      'descricao': 'Descrição',
      'categoria': 'Categoria',
      'tags': 'Tags',
      'publico': 'Visibilidade'
    };
    return fieldNames[fieldName] || fieldName;
  };

  const getCategoryColor = (categoria?: string) => {
    switch (categoria) {
      case 'contrato': return 'bg-blue-100 text-blue-800';
      case 'fatura': return 'bg-green-100 text-green-800';
      case 'relatorio': return 'bg-purple-100 text-purple-800';
      case 'ata': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDocumentos = documentos.filter(doc =>
    doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.criador?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestão Documental</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Novo Documento
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <select
            value={filters.categoria}
            onChange={(e) => setFilters(prev => ({ ...prev, categoria: e.target.value }))}
            className="border rounded px-3 py-2"
          >
            <option value="">Todas as categorias</option>
            <option value="contrato">Contratos</option>
            <option value="fatura">Faturas</option>
            <option value="relatorio">Relatórios</option>
            <option value="ata">Atas</option>
            <option value="outros">Outros</option>
          </select>
          <select
            value={filters.publico}
            onChange={(e) => setFilters(prev => ({ ...prev, publico: e.target.value }))}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos os documentos</option>
            <option value="true">Públicos</option>
            <option value="false">Privados</option>
          </select>
          <select
            value={filters.departamento_id}
            onChange={(e) => setFilters(prev => ({ ...prev, departamento_id: e.target.value }))}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos os departamentos</option>
            {departamentos.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.nome}</option>
            ))}
          </select>
          <select
            value={filters.criado_por}
            onChange={(e) => setFilters(prev => ({ ...prev, criado_por: e.target.value }))}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos os criadores</option>
            <option value={userProfile?.id || ''}>Meus documentos</option>
          </select>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
                Documento
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
                Categoria
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
                Criador
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
                Departamento
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Tamanho
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Data
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDocumentos.map((documento) => (
              <tr key={documento.id} className="hover:bg-gray-50">
                <td className="px-3 py-4">
                  <div 
                    className="flex items-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => handleViewDetails(documento)}
                  >
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {documento.tipo_arquivo.split('/')[1]?.substring(0, 3).toUpperCase() || 'DOC'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">{documento.nome}</div>
                      {documento.numero_documento && (
                        <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block mt-1">
                          {documento.numero_documento}
                        </div>
                      )}
                      {documento.descricao && (
                        <div className="text-sm text-gray-500 mt-1">{documento.descricao}</div>
                      )}
                      <div className="flex items-center mt-1">
                        {documento.publico ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Público
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Privado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4">
                  {documento.categoria && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(documento.categoria)}`}>
                      {documento.categoria}
                    </span>
                  )}
                </td>
                <td className="px-3 py-4">
                  <div className="text-sm text-gray-900">{documento.criador?.nome}</div>
                  <div className="text-sm text-gray-500">{documento.criador?.email}</div>
                </td>
                <td className="px-3 py-4">
                  <div className="text-sm text-gray-900">
                    {documento.departamento?.nome || '-'}
                  </div>
                </td>
                <td className="px-3 py-4 text-sm text-gray-500">
                  {formatFileSize(documento.tamanho)}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500">
                  {formatDate(documento.created_at)}
                </td>
                <td className="px-3 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => handleDownload(documento)}
                      className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-colors"
                      title="Download"
                    >
                      <Eye size={16} />
                    </button>
                    {(userProfile?.role === 'admin' || documento.criado_por === userProfile?.id) && (
                      <button
                        onClick={() => handleEdit(documento)}
                        className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-full transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {(userProfile?.role === 'admin' || documento.criado_por === userProfile?.id) && (
                      <button
                        onClick={() => handleDelete(documento.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDocumentos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum documento encontrado
          </div>
        )}
      </div>

      {/* Modal de Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Novo Documento</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Arquivos (máx. 3) *
                    </label>
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <div className="flex items-center space-x-2">
                            <FileText size={16} className="text-blue-600" />
                            <span className="text-sm text-gray-700">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(index)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                      {selectedFiles.length < 3 && (
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                      <p className="text-xs text-gray-500">
                        {selectedFiles.length === 0 
                          ? 'Selecione até 3 arquivos' 
                          : `${selectedFiles.length}/3 arquivo(s) selecionado(s)`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Documento
                    </label>
                    <input
                      type="text"
                      value={uploadForm.nome}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome do documento"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={uploadForm.descricao}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, descricao: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="Descrição do documento"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={uploadForm.categoria}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, categoria: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecionar categoria</option>
                      <option value="contrato">Contrato</option>
                      <option value="fatura">Fatura</option>
                      <option value="relatorio">Relatório</option>
                      <option value="ata">Ata</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departamento
                    </label>
                    <select
                      value={uploadForm.departamento_id}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, departamento_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecionar departamento</option>
                      {departamentos.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tags separadas por vírgula"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={uploadForm.publico}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, publico: e.target.checked }))}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Documento público</span>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={selectedFiles.length === 0 || uploading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Enviando...' : `Enviar ${selectedFiles.length} Documento(s)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Documento</h3>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keepCurrentFile && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arquivo Atual
                      </label>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-300">
                        <div className="flex items-center space-x-2">
                          <FileText size={20} className="text-blue-600" />
                          <span className="text-sm text-gray-700">{selectedDocument?.nome}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(selectedDocument)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                          >
                            Visualizar
                          </button>
                          <button
                            type="button"
                            onClick={() => setKeepCurrentFile(false)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-100 transition-colors"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {keepCurrentFile ? 'Adicionar Novos Arquivos (opcional, máx. 3)' : 'Novos Arquivos (máx. 3) *'}
                    </label>
                    <div className="space-y-2">
                      {editFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <div className="flex items-center space-x-2">
                            <FileText size={16} className="text-blue-600" />
                            <span className="text-sm text-gray-700">Novo: {file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEditFile(index)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                      {editFiles.length < 3 && (
                        <input
                          type="file"
                          multiple
                          onChange={handleEditFileSelect}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                      <p className="text-xs text-gray-500">
                        {editFiles.length === 0 
                          ? (keepCurrentFile ? 'Adicione novos arquivos ou mantenha o atual' : 'Selecione até 3 arquivos') 
                          : `${editFiles.length}/3 arquivo(s) selecionado(s)`}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Documento
                    </label>
                    <input
                      type="text"
                      value={editForm.nome}
                      onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome do documento"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={editForm.descricao}
                      onChange={(e) => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="Descrição do documento"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={editForm.categoria}
                      onChange={(e) => setEditForm(prev => ({ ...prev, categoria: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecionar categoria</option>
                      <option value="contrato">Contrato</option>
                      <option value="fatura">Fatura</option>
                      <option value="relatorio">Relatório</option>
                      <option value="ata">Ata</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departamento
                    </label>
                    <select
                      value={editForm.departamento_id}
                      onChange={(e) => setEditForm(prev => ({ ...prev, departamento_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecionar departamento</option>
                      {departamentos.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tags separadas por vírgula"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.publico}
                        onChange={(e) => setEditForm(prev => ({ ...prev, publico: e.target.checked }))}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Documento público</span>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
                  >
                    Atualizar Documento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedDocument(null);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Documento */}
      {showDetailsModal && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium text-gray-900">Detalhes do Documento</h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedDocument(null);
                    setDocumentHistory([]);
                    setDocumentComments([]);
                    setNewComment('');
                    setEditingComment(null);
                    setEditCommentText('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Informações do Documento */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Informações Gerais</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nome</label>
                        <p className="text-sm text-gray-900">{selectedDocument.nome}</p>
                      </div>
                      
                      {selectedDocument.numero_documento && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Número do Documento</label>
                          <p className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-md inline-block">{selectedDocument.numero_documento}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nome Original</label>
                        <p className="text-sm text-gray-900">{selectedDocument.nome_original}</p>
                      </div>
                      
                      {selectedDocument.descricao && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Descrição</label>
                          <p className="text-sm text-gray-900">{selectedDocument.descricao}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo de Arquivo</label>
                        <p className="text-sm text-gray-900">{selectedDocument.tipo_arquivo}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tamanho</label>
                        <p className="text-sm text-gray-900">{formatFileSize(selectedDocument.tamanho)}</p>
                      </div>
                      
                      {selectedDocument.categoria && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Categoria</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(selectedDocument.categoria)}`}>
                            {selectedDocument.categoria}
                          </span>
                        </div>
                      )}
                      
                      {selectedDocument.tags && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Tags</label>
                          <p className="text-sm text-gray-900">{selectedDocument.tags}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Visibilidade</label>
                        {selectedDocument.publico ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Público
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Privado
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Criado por</label>
                        <p className="text-sm text-gray-900">{selectedDocument.criador?.nome}</p>
                        <p className="text-xs text-gray-500">{selectedDocument.criador?.email}</p>
                      </div>
                      
                      {selectedDocument.departamento && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Departamento</label>
                          <p className="text-sm text-gray-900">{selectedDocument.departamento.nome}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Data de Criação</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedDocument.created_at)}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Última Atualização</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedDocument.updated_at)}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleDownload(selectedDocument)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center"
                      >
                        <Download size={16} className="mr-2" />
                        Baixar Documento
                      </button>
                    </div>
                  </div>
                </div>

                {/* Histórico de Alterações */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Alterações</h4>
                    
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {documentHistory.length > 0 ? (
                        documentHistory.map((historico, index) => (
                          <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    historico.tipo_alteracao === 'criacao' ? 'bg-blue-100 text-blue-800' :
                                    historico.tipo_alteracao === 'edicao' ? 'bg-yellow-100 text-yellow-800' :
                                    historico.tipo_alteracao === 'visualizacao' ? 'bg-green-100 text-green-800' :
                                    historico.tipo_alteracao === 'download' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {historico.tipo_alteracao}
                                  </span>
                                  {historico.campo_alterado && (
                                    <span className="text-xs text-gray-500">
                                      {getFieldDisplayName(historico.campo_alterado)}
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-900 mb-1">
                                  {historico.descricao_alteracao}
                                </p>
                                
                                {historico.valor_antigo && historico.valor_novo && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    <span className="font-medium">De:</span> {historico.valor_antigo} → 
                                    <span className="font-medium"> Para:</span> {historico.valor_novo}
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                  <span>
                                    Por: <span className="font-medium">{historico.usuario?.nome}</span>
                                  </span>
                                  <span>
                                    {formatDate(historico.data_alteracao)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileText size={48} className="mx-auto mb-2 text-gray-300" />
                          <p>Nenhum histórico encontrado</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comentários */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Comentários</h4>
                    
                    {/* Formulário para novo comentário */}
                    <div className="mb-4">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Adicionar um comentário..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                        rows={3}
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={handleCreateComment}
                          disabled={!newComment.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Comentar
                        </button>
                      </div>
                    </div>

                    {/* Lista de comentários */}
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {documentComments.length > 0 ? (
                        documentComments.map((comentario) => (
                          <div key={comentario.id} className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-medium text-sm">
                                    {comentario.usuario?.nome?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {comentario.usuario?.nome}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(comentario.created_at)}
                                    {comentario.updated_at !== comentario.created_at && (
                                      <span className="ml-1">(editado)</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              
                              {(userProfile?.role === 'admin' || comentario.usuario_id === userProfile?.id) && (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleEditComment(comentario)}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                    title="Editar"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comentario.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                                    title="Excluir"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {editingComment === comentario.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none text-sm"
                                  rows={3}
                                />
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => {
                                      setEditingComment(null);
                                      setEditCommentText('');
                                    }}
                                    className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleUpdateComment(comentario.id)}
                                    disabled={!editCommentText.trim()}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {comentario.comentario}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileText size={48} className="mx-auto mb-2 text-gray-300" />
                          <p>Nenhum comentário ainda</p>
                          <p className="text-xs mt-1">Seja o primeiro a comentar!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </div>
  );
};

export default Documentos;
