import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { expedientesAPI, departamentosAPI, usuariosAPI, documentosAPI } from '../lib/backendApi';
import { 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  Filter, 
  X, 
  Check, 
  AlertCircle, 
  Pencil, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Folder,
  Download
} from 'lucide-react';
import { AlertDialog } from './ui/AlertDialog';
import type { Expediente, Departamento, Usuario } from '../types/database';

const Expedientes: React.FC = () => {
  const { userProfile } = useAuth();
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error' as 'error' | 'success',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedExpediente, setSelectedExpediente] = useState<Expediente | null>(null);
  
  // Autocomplete states for responsável
  const [createResponsavelSearch, setCreateResponsavelSearch] = useState('');
  const [createResponsavelOpen, setCreateResponsavelOpen] = useState(false);
  const [editResponsavelSearch, setEditResponsavelSearch] = useState('');
  const [editResponsavelOpen, setEditResponsavelOpen] = useState(false);
  
  // Document management states
  const [expedienteDocumentos, setExpedienteDocumentos] = useState<any[]>([]);
  const [availableDocumentos, setAvailableDocumentos] = useState<any[]>([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  
  const [createForm, setCreateForm] = useState({
    titulo: '',
    descricao: '',
    tipo: 'administrativo',
    prioridade: 'media',
    data_prazo: '',
    responsavel_id: '',
    departamento_id: '',
    observacoes: '',
    publico: false
  });
  
  const [editForm, setEditForm] = useState({
    titulo: '',
    descricao: '',
    tipo: 'administrativo',
    status: 'aberto',
    prioridade: 'media',
    data_prazo: '',
    data_fechamento: '',
    responsavel_id: '',
    departamento_id: '',
    observacoes: '',
    publico: false
  });
  
  const [filters, setFilters] = useState({
    tipo: '',
    status: '',
    prioridade: '',
    departamento_id: '',
    criado_por: '',
    responsavel_id: '',
    publico: '',
    data_inicio: '',
    data_fim: ''
  });

  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchExpedientes();
  }, [filters]);

  // Close autocomplete dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setCreateResponsavelOpen(false);
        setEditResponsavelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchExpedientes(),
        fetchDepartamentos(),
        fetchUsuarios()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const fetchExpedientes = async () => {
    try {
      setLoading(true);
      const filterParams = {
        tipo: filters.tipo || undefined,
        status: filters.status || undefined,
        prioridade: filters.prioridade || undefined,
        departamento_id: filters.departamento_id || undefined,
        criado_por: filters.criado_por || undefined,
        responsavel_id: filters.responsavel_id || undefined,
        publico: filters.publico ? filters.publico === 'true' : undefined,
        data_inicio: filters.data_inicio || undefined,
        data_fim: filters.data_fim || undefined
      };
      const data = await expedientesAPI.getAll(filterParams);
      setExpedientes(data);
    } catch (error) {
      console.error('Erro ao buscar expedientes:', error);
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

  const fetchUsuarios = async () => {
    try {
      const data = await usuariosAPI.getAll();
      setUsuarios(data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleCreateExpediente = async () => {
    try {
      if (!createForm.titulo || !createForm.tipo) {
        setAlertDialog({
          isOpen: true,
          title: 'Erro',
          message: 'Título e tipo são obrigatórios',
          type: 'error'
        });
        return;
      }

      await expedientesAPI.create({
        ...createForm,
        data_prazo: createForm.data_prazo || undefined
      });
      
      setShowCreateModal(false);
      setCreateForm({
        titulo: '',
        descricao: '',
        tipo: 'administrativo',
        prioridade: 'media',
        data_prazo: '',
        responsavel_id: '',
        departamento_id: '',
        observacoes: '',
        publico: false
      });
      
      await fetchExpedientes();
      
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Expediente criado com sucesso',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao criar expediente:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao criar expediente',
        type: 'error'
      });
    }
  };

  const handleEditExpediente = async () => {
    if (!selectedExpediente) return;

    try {
      await expedientesAPI.update(selectedExpediente.id, {
        ...editForm,
        data_prazo: editForm.data_prazo || undefined,
        data_fechamento: editForm.data_fechamento || undefined
      });
      
      setShowEditModal(false);
      setSelectedExpediente(null);
      await fetchExpedientes();
      
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Expediente atualizado com sucesso',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao atualizar expediente:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao atualizar expediente',
        type: 'error'
      });
    }
  };

  const handleDeleteExpediente = async (expediente: Expediente) => {
    if (!confirm('Tem certeza que deseja excluir este expediente?')) return;

    try {
      await expedientesAPI.delete(expediente.id);
      await fetchExpedientes();
      
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Expediente excluído com sucesso',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao excluir expediente:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao excluir expediente',
        type: 'error'
      });
    }
  };

  const openEditModal = (expediente: Expediente) => {
    setSelectedExpediente(expediente);
    setEditForm({
      titulo: expediente.titulo,
      descricao: expediente.descricao || '',
      tipo: expediente.tipo,
      status: expediente.status,
      prioridade: expediente.prioridade,
      data_prazo: expediente.data_prazo ? expediente.data_prazo.split('T')[0] : '',
      data_fechamento: expediente.data_fechamento ? expediente.data_fechamento.split('T')[0] : '',
      responsavel_id: expediente.responsavel_id || '',
      departamento_id: expediente.departamento_id || '',
      observacoes: expediente.observacoes || '',
      publico: expediente.publico
    });
    // Initialize responsável search with current responsável name
    const currentResponsavel = expediente.responsavel_id ? getSelectedUser(expediente.responsavel_id) : null;
    setEditResponsavelSearch(currentResponsavel?.nome || '');
    setEditResponsavelOpen(false);
    setShowEditModal(true);
  };

  const openDetailsModal = (expediente: Expediente) => {
    setSelectedExpediente(expediente);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'text-blue-600 bg-blue-100';
      case 'em_andamento': return 'text-yellow-600 bg-yellow-100';
      case 'suspenso': return 'text-red-600 bg-red-100';
      case 'fechado': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'text-green-600 bg-green-100';
      case 'media': return 'text-yellow-600 bg-yellow-100';
      case 'alta': return 'text-orange-600 bg-orange-100';
      case 'urgente': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aberto': return <FileText className="w-4 h-4" />;
      case 'em_andamento': return <Clock className="w-4 h-4" />;
      case 'suspenso': return <XCircle className="w-4 h-4" />;
      case 'fechado': return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Filter expedientes based on search term
  const filteredExpedientes = expedientes.filter(expediente =>
    expediente.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expediente.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expediente.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expediente.criador?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredExpedientes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExpedientes = filteredExpedientes.slice(startIndex, endIndex);

  const canEdit = (expediente: Expediente) => {
    if (!userProfile) return false;
    return userProfile.role === 'admin' || 
           expediente.criado_por === userProfile.id ||
           expediente.responsavel_id === userProfile.id ||
           (userProfile.role === 'gestor' && expediente.departamento_id === userProfile.departamento_id);
  };

  const canDelete = (expediente: Expediente) => {
    if (!userProfile) return false;
    return userProfile.role === 'admin' || 
           expediente.criado_por === userProfile.id ||
           (userProfile.role === 'gestor' && expediente.departamento_id === userProfile.departamento_id);
  };

  // Helper functions for autocomplete
  const getFilteredUsers = (searchTerm: string) => {
    if (!searchTerm) return usuarios.slice(0, 10); // Show first 10 users when no search
    return usuarios.filter(user => 
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit to 10 results
  };

  const getSelectedUser = (userId: string) => {
    return usuarios.find(user => user.id === userId);
  };

  const handleCreateResponsavelSelect = (user: Usuario) => {
    setCreateForm(prev => ({ ...prev, responsavel_id: user.id }));
    setCreateResponsavelSearch(user.nome);
    setCreateResponsavelOpen(false);
  };

  const handleEditResponsavelSelect = (user: Usuario) => {
    setEditForm(prev => ({ ...prev, responsavel_id: user.id }));
    setEditResponsavelSearch(user.nome);
    setEditResponsavelOpen(false);
  };

  const clearCreateResponsavel = () => {
    setCreateForm(prev => ({ ...prev, responsavel_id: '' }));
    setCreateResponsavelSearch('');
    setCreateResponsavelOpen(false);
  };

  const clearEditResponsavel = () => {
    setEditForm(prev => ({ ...prev, responsavel_id: '' }));
    setEditResponsavelSearch('');
    setEditResponsavelOpen(false);
  };

  // Document management functions
  const fetchExpedienteDocumentos = async (expedienteId: string) => {
    try {
      setLoadingDocuments(true);
      const data = await expedientesAPI.getDocumentos(expedienteId);
      setExpedienteDocumentos(data);
    } catch (error) {
      console.error('Erro ao buscar documentos do expediente:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchAvailableDocumentos = async () => {
    try {
      const data = await documentosAPI.getAll();
      setAvailableDocumentos(data);
    } catch (error) {
      console.error('Erro ao buscar documentos disponíveis:', error);
    }
  };

  const handleAddDocumento = async (documentoId: string) => {
    if (!selectedExpediente) return;
    
    try {
      await expedientesAPI.addDocumento(selectedExpediente.id, {
        documento_id: documentoId,
        observacoes: ''
      });
      
      await fetchExpedienteDocumentos(selectedExpediente.id);
      await fetchExpedientes(); // Refresh to update document count
      
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Documento adicionado ao expediente',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao adicionar documento:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao adicionar documento ao expediente',
        type: 'error'
      });
    }
  };

  const handleRemoveDocumento = async (documentoId: string) => {
    if (!selectedExpediente) return;
    
    if (!confirm('Tem certeza que deseja remover este documento do expediente?')) return;
    
    try {
      await expedientesAPI.removeDocumento(selectedExpediente.id, documentoId);
      
      await fetchExpedienteDocumentos(selectedExpediente.id);
      await fetchExpedientes(); // Refresh to update document count
      
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Documento removido do expediente',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao remover documento:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao remover documento do expediente',
        type: 'error'
      });
    }
  };

  const openDocumentModal = async (expediente: Expediente) => {
    setSelectedExpediente(expediente);
    await Promise.all([
      fetchExpedienteDocumentos(expediente.id),
      fetchAvailableDocumentos()
    ]);
    setShowDocumentModal(true);
  };

  const getFilteredAvailableDocumentos = () => {
    const expedienteDocIds = expedienteDocumentos.map(ed => ed.documento_id);
    const available = availableDocumentos.filter(doc => !expedienteDocIds.includes(doc.id));
    
    if (!documentSearch) return available.slice(0, 10);
    
    return available.filter(doc =>
      doc.nome.toLowerCase().includes(documentSearch.toLowerCase()) ||
      doc.descricao?.toLowerCase().includes(documentSearch.toLowerCase())
    ).slice(0, 10);
  };

  const handleDownloadDocument = async (documento: any) => {
    try {
      if (!documento || !documento.id) {
        throw new Error('Documento ou ID do documento não encontrado');
      }
      
      await documentosAPI.downloadById(documento.id);
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao baixar documento. Verifique se o arquivo existe.',
        type: 'error'
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expedientes</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Expediente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar expedientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os tipos</option>
              <option value="administrativo">Administrativo</option>
              <option value="juridico">Jurídico</option>
              <option value="financeiro">Financeiro</option>
              <option value="rh">RH</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="aberto">Aberto</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="suspenso">Suspenso</option>
              <option value="fechado">Fechado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
            <select
              value={filters.prioridade}
              onChange={(e) => setFilters(prev => ({ ...prev, prioridade: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas as prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expedientes List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expediente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prioridade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsável
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documentos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentExpedientes.map((expediente) => (
                    <tr key={expediente.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {expediente.titulo}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{expediente.numero}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(expediente.data_abertura).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {expediente.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${getStatusColor(expediente.status)}`}>
                          {getStatusIcon(expediente.status)}
                          {expediente.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(expediente.prioridade)}`}>
                          {expediente.prioridade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {expediente.responsavel?.nome || 'Não atribuído'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Folder className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {expediente.total_documentos || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetailsModal(expediente)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit(expediente) && (
                            <button
                              onClick={() => openEditModal(expediente)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete(expediente) && (
                            <button
                              onClick={() => handleDeleteExpediente(expediente)}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredExpedientes.length)}</span> de{' '}
                      <span className="font-medium">{filteredExpedientes.length}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Novo Expediente</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={createForm.titulo}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite o título do expediente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={createForm.descricao}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descrição do expediente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={createForm.tipo}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="administrativo">Administrativo</option>
                  <option value="juridico">Jurídico</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="rh">RH</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  value={createForm.prioridade}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, prioridade: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Prazo
                </label>
                <input
                  type="date"
                  value={createForm.data_prazo}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, data_prazo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={createForm.departamento_id}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, departamento_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecionar departamento</option>
                  {departamentos.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsável
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={createResponsavelSearch}
                    onChange={(e) => {
                      setCreateResponsavelSearch(e.target.value);
                      setCreateResponsavelOpen(true);
                    }}
                    onFocus={() => setCreateResponsavelOpen(true)}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Buscar responsável..."
                  />
                  {createForm.responsavel_id && (
                    <button
                      type="button"
                      onClick={clearCreateResponsavel}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {createResponsavelOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {getFilteredUsers(createResponsavelSearch).length > 0 ? (
                      getFilteredUsers(createResponsavelSearch).map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleCreateResponsavelSelect(user)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{user.nome}</div>
                          {user.email && (
                            <div className="text-sm text-gray-500">{user.email}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        Nenhum usuário encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={createForm.observacoes}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observações adicionais"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="publico"
                  checked={createForm.publico}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, publico: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="publico" className="ml-2 block text-sm text-gray-700">
                  Expediente público
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateExpediente}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Criar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedExpediente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Editar Expediente</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={editForm.titulo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={editForm.descricao}
                  onChange={(e) => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={editForm.tipo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="administrativo">Administrativo</option>
                  <option value="juridico">Jurídico</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="rh">RH</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="aberto">Aberto</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="fechado">Fechado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  value={editForm.prioridade}
                  onChange={(e) => setEditForm(prev => ({ ...prev, prioridade: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Prazo
                </label>
                <input
                  type="date"
                  value={editForm.data_prazo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, data_prazo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {editForm.status === 'fechado' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fechamento
                  </label>
                  <input
                    type="date"
                    value={editForm.data_fechamento}
                    onChange={(e) => setEditForm(prev => ({ ...prev, data_fechamento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={editForm.departamento_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, departamento_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecionar departamento</option>
                  {departamentos.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsável
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editResponsavelSearch}
                    onChange={(e) => {
                      setEditResponsavelSearch(e.target.value);
                      setEditResponsavelOpen(true);
                    }}
                    onFocus={() => setEditResponsavelOpen(true)}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Buscar responsável..."
                  />
                  {editForm.responsavel_id && (
                    <button
                      type="button"
                      onClick={clearEditResponsavel}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {editResponsavelOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {getFilteredUsers(editResponsavelSearch).length > 0 ? (
                      getFilteredUsers(editResponsavelSearch).map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleEditResponsavelSelect(user)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{user.nome}</div>
                          {user.email && (
                            <div className="text-sm text-gray-500">{user.email}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        Nenhum usuário encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={editForm.observacoes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editPublico"
                  checked={editForm.publico}
                  onChange={(e) => setEditForm(prev => ({ ...prev, publico: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="editPublico" className="ml-2 block text-sm text-gray-700">
                  Expediente público
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditExpediente}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedExpediente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes do Expediente</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número</label>
                  <p className="text-sm text-gray-900 mt-1">#{selectedExpediente.numero}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{selectedExpediente.tipo}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedExpediente.status)}`}>
                    {getStatusIcon(selectedExpediente.status)}
                    <span className="ml-1">{selectedExpediente.status.replace('_', ' ')}</span>
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prioridade</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedExpediente.prioridade)}`}>
                    {selectedExpediente.prioridade}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Título</label>
                <p className="text-sm text-gray-900 mt-1">{selectedExpediente.titulo}</p>
              </div>

              {selectedExpediente.descricao && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descrição</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedExpediente.descricao}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Abertura</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(selectedExpediente.data_abertura).toLocaleDateString('pt-PT')}
                  </p>
                </div>
                {selectedExpediente.data_prazo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data Prazo</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(selectedExpediente.data_prazo).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                )}
                {selectedExpediente.data_fechamento && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data Fechamento</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(selectedExpediente.data_fechamento).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Criado por</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedExpediente.criador?.nome || 'N/A'}</p>
                </div>
                {selectedExpediente.responsavel && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Responsável</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedExpediente.responsavel.nome}</p>
                  </div>
                )}
                {selectedExpediente.departamento && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Departamento</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedExpediente.departamento.nome}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Visibilidade</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedExpediente.publico ? 'Público' : 'Privado'}</p>
                </div>
              </div>

              {selectedExpediente.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Observações</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedExpediente.observacoes}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Documentos Associados</label>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {selectedExpediente.total_documentos || 0} documento(s)
                    </span>
                  </div>
                  <button
                    onClick={() => openDocumentModal(selectedExpediente)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Gerir Documentos
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Management Modal */}
      {showDocumentModal && selectedExpediente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Gerir Documentos - {selectedExpediente.titulo}
              </h3>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Documents */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Documentos do Expediente</h4>
                {loadingDocuments ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {expedienteDocumentos.length > 0 ? (
                      expedienteDocumentos.map((expedienteDoc) => (
                        <div
                          key={expedienteDoc.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {expedienteDoc.documento?.nome}
                            </div>
                            <div className="text-xs text-gray-500">
                              Adicionado em: {new Date(expedienteDoc.data_adicao).toLocaleDateString('pt-PT')}
                            </div>
                            {expedienteDoc.observacoes && (
                              <div className="text-xs text-gray-600 mt-1">
                                {expedienteDoc.observacoes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadDocument(expedienteDoc.documento)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Baixar documento"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveDocumento(expedienteDoc.documento_id)}
                              className="text-red-600 hover:text-red-800"
                              title="Remover documento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Nenhum documento associado
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Available Documents */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Adicionar Documentos</h4>
                
                {/* Search */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar documentos..."
                      value={documentSearch}
                      onChange={(e) => setDocumentSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {getFilteredAvailableDocumentos().length > 0 ? (
                    getFilteredAvailableDocumentos().map((documento) => (
                      <div
                        key={documento.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {documento.nome}
                          </div>
                          {documento.descricao && (
                            <div className="text-xs text-gray-500">
                              {documento.descricao}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            {documento.categoria} • {new Date(documento.created_at).toLocaleDateString('pt-PT')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddDocumento(documento.id)}
                          className="text-blue-600 hover:text-blue-800 ml-2"
                          title="Adicionar documento"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {documentSearch ? 'Nenhum documento encontrado' : 'Todos os documentos já estão associados'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDocumentModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Dialog */}
      {alertDialog.isOpen && (
        <AlertDialog
          isOpen={alertDialog.isOpen}
          onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
          title={alertDialog.title}
          message={alertDialog.message}
          type={alertDialog.type}
        />
      )}
    </div>
  );
};

export default Expedientes;
