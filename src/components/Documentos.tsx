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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadForm(prev => ({
        ...prev,
        nome: prev.nome || file.name
      }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !userProfile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('nome', uploadForm.nome);
      formData.append('descricao', uploadForm.descricao);
      formData.append('categoria', uploadForm.categoria);
      formData.append('tags', uploadForm.tags);
      formData.append('publico', uploadForm.publico.toString());
      formData.append('criado_por', userProfile.id);
      if (uploadForm.departamento_id) {
        formData.append('departamento_id', uploadForm.departamento_id);
      }

      await documentosAPI.create(formData);
      setShowUploadModal(false);
      setSelectedFile(null);
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
        message: 'Documento enviado com sucesso!',
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument) return;

    try {
      await documentosAPI.update(selectedDocument.id, editForm);
      setShowEditModal(false);
      setSelectedDocument(null);
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

  const handleDownload = (filename: string) => {
    const filenameFromPath = filename.split('\\').pop()?.split('/').pop() || filename;
    documentosAPI.download(filenameFromPath);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {documento.tipo_arquivo.split('/')[1]?.substring(0, 3).toUpperCase() || 'DOC'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{documento.nome}</div>
                      {documento.descricao && (
                        <div className="text-sm text-gray-500">{documento.descricao}</div>
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
                      onClick={() => handleDownload(documento.caminho_arquivo)}
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Novo Documento</h3>
              <form onSubmit={handleUpload}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arquivo *
                  </label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Documento
                  </label>
                  <input
                    type="text"
                    value={uploadForm.nome}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Nome do documento"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={uploadForm.descricao}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Descrição do documento"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={uploadForm.categoria}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, categoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecionar categoria</option>
                    <option value="contrato">Contrato</option>
                    <option value="fatura">Fatura</option>
                    <option value="relatorio">Relatório</option>
                    <option value="ata">Ata</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento
                  </label>
                  <select
                    value={uploadForm.departamento_id}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, departamento_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecionar departamento</option>
                    {departamentos.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Tags separadas por vírgula"
                  />
                </div>

                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={uploadForm.publico}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, publico: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Documento público</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Enviando...' : 'Enviar Documento'}
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Documento</h3>
              <form onSubmit={handleUpdate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Documento
                  </label>
                  <input
                    type="text"
                    value={editForm.nome}
                    onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Nome do documento"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={editForm.descricao}
                    onChange={(e) => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Descrição do documento"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={editForm.categoria}
                    onChange={(e) => setEditForm(prev => ({ ...prev, categoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecionar categoria</option>
                    <option value="contrato">Contrato</option>
                    <option value="fatura">Fatura</option>
                    <option value="relatorio">Relatório</option>
                    <option value="ata">Ata</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento
                  </label>
                  <select
                    value={editForm.departamento_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, departamento_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecionar departamento</option>
                    {departamentos.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Tags separadas por vírgula"
                  />
                </div>

                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.publico}
                      onChange={(e) => setEditForm(prev => ({ ...prev, publico: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Documento público</span>
                  </label>
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

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </div>
  );
};

export default Documentos;
