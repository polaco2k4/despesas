import React, { useEffect, useState } from 'react';
import { useFeedback } from '../contexts/FeedbackContext';
import { useAuth } from '../contexts/AuthContext';
import { contratosAPI, fornecedoresAPI, departamentosAPI, usuariosAPI } from '../lib/backendApi';
import { 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  Filter, 
  X, 
  Pencil,
  FileText,
  Calendar,
  DollarSign,
  Building,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileSignature,
  TrendingUp,
  Upload,
  Download,
  Paperclip
} from 'lucide-react';
import { AlertDialog } from './ui/AlertDialog';
import Autocomplete from './ui/Autocomplete';

interface Contrato {
  id: string;
  numero_contrato: string;
  titulo: string;
  descricao?: string;
  tipo: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  departamento_id?: string;
  departamento_nome?: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  valor_total: number;
  moeda: string;
  data_inicio: string;
  data_fim?: string;
  data_assinatura?: string;
  status: string;
  prioridade: string;
  termos?: string;
  observacoes?: string;
  anexo_url?: string;
  criado_por: string;
  criado_por_nome?: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  ativos: number;
  expirados: number;
  expirando_em_breve: number;
  rascunhos: number;
  valor_total_ativos: number;
}

const Contratos: React.FC = () => {
  const { confirm } = useFeedback();
  const { userProfile } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  const [formData, setFormData] = useState({
    numero_contrato: '',
    titulo: '',
    descricao: '',
    tipo: 'servico',
    fornecedor_id: '',
    departamento_id: '',
    responsavel_id: '',
    valor_total: '',
    moeda: 'AOA',
    data_inicio: '',
    data_fim: '',
    data_assinatura: '',
    status: 'rascunho',
    prioridade: 'media',
    termos: '',
    observacoes: '',
    renovacao_automatica: false,
    periodo_renovacao: '',
    dias_alerta_vencimento: '30',
  });

  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
    fetchFornecedores();
    fetchDepartamentos();
    fetchUsuarios();
  }, [statusFilter, tipoFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contratosData, statsData] = await Promise.all([
        contratosAPI.getAll({ status: statusFilter || undefined, tipo: tipoFilter || undefined }),
        contratosAPI.getStats()
      ]);
      setContratos(contratosData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching contratos:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Não foi possível carregar os contratos',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFornecedores = async () => {
    try {
      const data = await fornecedoresAPI.getAll();
      setFornecedores(data);
    } catch (error) {
      console.error('Error fetching fornecedores:', error);
    }
  };

  const fetchDepartamentos = async () => {
    try {
      const data = await departamentosAPI.getAll();
      setDepartamentos(data);
    } catch (error) {
      console.error('Error fetching departamentos:', error);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const data = await usuariosAPI.getAll();
      setUsuarios(data);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    }
  };

  const handleCreateContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        valor_total: parseFloat(formData.valor_total) || 0,
        fornecedor_id: formData.fornecedor_id || null,
        departamento_id: formData.departamento_id || null,
        responsavel_id: formData.responsavel_id || null,
        data_fim: formData.data_fim || null,
        data_assinatura: formData.data_assinatura || null,
      };

      if (isEditing && selectedContrato) {
        await contratosAPI.update(selectedContrato.id, payload);
        setAlertDialog({
          isOpen: true,
          title: 'Sucesso',
          message: 'Contrato atualizado com sucesso',
          type: 'success'
        });
      } else {
        await contratosAPI.create(payload);
        setAlertDialog({
          isOpen: true,
          title: 'Sucesso',
          message: 'Contrato criado com sucesso',
          type: 'success'
        });
      }
      
      setShowCreateModal(false);
      resetForm();
      await fetchData();
    } catch (error: any) {
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: error.message || 'Erro ao salvar contrato',
        type: 'error'
      });
    }
  };

  const handleDeleteContrato = async (id: string) => {
    if (!await confirm({ title: 'Excluir este contrato?', message: 'Esta acção não pode ser desfeita.', confirmText: 'Excluir', variant: 'danger' })) return;
    
    try {
      await contratosAPI.delete(id);
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Contrato excluído com sucesso',
        type: 'success'
      });
      await fetchData();
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao excluir contrato',
        type: 'error'
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadFile = async (contratoId: string) => {
    if (!selectedFile) {
      setAlertDialog({
        isOpen: true,
        title: 'Aviso',
        message: 'Selecione um ficheiro para enviar',
        type: 'warning'
      });
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api' 
        : `${window.location.protocol}//${window.location.hostname}:3001/api`;

      const response = await fetch(`${API_URL}/contratos/${contratoId}/upload-anexo`, {
        method: 'POST',
        headers: {
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || '',
          'x-user-department-id': userProfile?.departamento_id || '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar ficheiro');
      }

      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Ficheiro enviado com sucesso',
        type: 'success'
      });

      setSelectedFile(null);
      await fetchData();
      
      if (selectedContrato) {
        const updated = await contratosAPI.getById(contratoId);
        setSelectedContrato(updated);
      }
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao enviar ficheiro',
        type: 'error'
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadFile = async (contratoId: string) => {
    try {
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api' 
        : `${window.location.protocol}//${window.location.hostname}:3001/api`;

      window.open(`${API_URL}/contratos/${contratoId}/download-anexo`, '_blank');
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao baixar ficheiro',
        type: 'error'
      });
    }
  };

  const handleDeleteFile = async (contratoId: string) => {
    if (!await confirm({ title: 'Remover o ficheiro anexado?', message: 'Esta acção não pode ser desfeita.', confirmText: 'Remover', variant: 'danger' })) return;

    try {
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api' 
        : `${window.location.protocol}//${window.location.hostname}:3001/api`;

      const response = await fetch(`${API_URL}/contratos/${contratoId}/anexo`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || '',
          'x-user-department-id': userProfile?.departamento_id || '',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao remover ficheiro');
      }

      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Ficheiro removido com sucesso',
        type: 'success'
      });

      await fetchData();
      
      if (selectedContrato) {
        const updated = await contratosAPI.getById(contratoId);
        setSelectedContrato(updated);
      }
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao remover ficheiro',
        type: 'error'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      numero_contrato: '',
      titulo: '',
      descricao: '',
      tipo: 'servico',
      fornecedor_id: '',
      departamento_id: '',
      responsavel_id: '',
      valor_total: '',
      moeda: 'AOA',
      data_inicio: '',
      data_fim: '',
      data_assinatura: '',
      status: 'rascunho',
      prioridade: 'media',
      termos: '',
      observacoes: '',
      renovacao_automatica: false,
      periodo_renovacao: '',
      dias_alerta_vencimento: '30',
    });
    setIsEditing(false);
    setSelectedContrato(null);
  };

  const handleEdit = (contrato: Contrato) => {
    setFormData({
      numero_contrato: contrato.numero_contrato,
      titulo: contrato.titulo,
      descricao: contrato.descricao || '',
      tipo: contrato.tipo,
      fornecedor_id: contrato.fornecedor_id || '',
      departamento_id: contrato.departamento_id || '',
      responsavel_id: contrato.responsavel_id || '',
      valor_total: contrato.valor_total.toString(),
      moeda: contrato.moeda,
      data_inicio: contrato.data_inicio?.split('T')[0] || '',
      data_fim: contrato.data_fim?.split('T')[0] || '',
      data_assinatura: contrato.data_assinatura?.split('T')[0] || '',
      status: contrato.status,
      prioridade: contrato.prioridade,
      termos: contrato.termos || '',
      observacoes: contrato.observacoes || '',
      renovacao_automatica: (contrato as any).renovacao_automatica || false,
      periodo_renovacao: (contrato as any).periodo_renovacao?.toString() || '',
      dias_alerta_vencimento: (contrato as any).dias_alerta_vencimento?.toString() || '30',
    });
    setSelectedContrato(contrato);
    setIsEditing(true);
    setShowCreateModal(true);
  };

  const handleViewDetails = async (contrato: Contrato) => {
    try {
      const detailedContrato = await contratosAPI.getById(contrato.id);
      setSelectedContrato(detailedContrato);
      setShowDetailModal(true);
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao carregar detalhes do contrato',
        type: 'error'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      rascunho: { color: 'bg-gray-100 text-gray-800', icon: FileText, label: 'Rascunho' },
      ativo: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Ativo' },
      suspenso: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Suspenso' },
      concluido: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Concluído' },
      cancelado: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelado' },
      expirado: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Expirado' },
    };
    const badge = badges[status] || badges.rascunho;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={12} className="mr-1" />
        {badge.label}
      </span>
    );
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const colors: Record<string, string> = {
      baixa: 'bg-gray-100 text-gray-700',
      media: 'bg-blue-100 text-blue-700',
      alta: 'bg-orange-100 text-orange-700',
      critica: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[prioridade] || colors.media}`}>
        {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
      </span>
    );
  };

  const filteredContratos = contratos.filter(contrato =>
    contrato.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contrato.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contrato.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredContratos.length / itemsPerPage);
  const paginatedContratos = filteredContratos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'gestor';
  const canDelete = userProfile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileSignature className="mr-3 text-blue-600" size={32} />
            Gestão de Contratos
          </h1>
          <p className="text-gray-600 mt-1">Gerencie contratos e acordos comerciais</p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Novo Contrato
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileSignature className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expirando</p>
                <p className="text-2xl font-bold text-orange-600">{stats.expirando_em_breve}</p>
              </div>
              <AlertCircle className="text-orange-600" size={32} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expirados</p>
                <p className="text-2xl font-bold text-red-600">{stats.expirados}</p>
              </div>
              <XCircle className="text-red-600" size={32} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.valor_total_ativos)}</p>
              </div>
              <TrendingUp className="text-blue-600" size={32} />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar contratos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os Status</option>
                <option value="rascunho">Rascunho</option>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
                <option value="expirado">Expirado</option>
              </select>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os Tipos</option>
                <option value="servico">Serviço</option>
                <option value="fornecimento">Fornecimento</option>
                <option value="obra">Obra</option>
                <option value="consultoria">Consultoria</option>
                <option value="locacao">Locação</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vigência</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedContratos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                    Nenhum contrato encontrado
                  </td>
                </tr>
              ) : (
                paginatedContratos.map((contrato) => (
                  <tr key={contrato.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contrato.numero_contrato}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <div className="max-w-[200px] truncate">{contrato.titulo}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="max-w-[120px] truncate">{contrato.fornecedor_nome || '-'}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500 capitalize">
                      {contrato.tipo}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(contrato.valor_total)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                      <div className="flex flex-col">
                        <span>{formatDate(contrato.data_inicio)}</span>
                        {contrato.data_fim && <span className="text-xs text-gray-400">até {formatDate(contrato.data_fim)}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getStatusBadge(contrato.status)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => handleViewDetails(contrato)}
                          className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(contrato)}
                            className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteContrato(contrato.id)}
                            className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredContratos.length)} de {filteredContratos.length} contratos
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editar Contrato' : 'Novo Contrato'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateContrato} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Contrato *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.numero_contrato}
                    onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="expirado">Expirado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="servico">Serviço</option>
                    <option value="fornecimento">Fornecimento</option>
                    <option value="obra">Obra</option>
                    <option value="consultoria">Consultoria</option>
                    <option value="locacao">Locação</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formData.prioridade}
                    onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Autocomplete
                  label="Fornecedor"
                  placeholder="Pesquisar fornecedor..."
                  value={formData.fornecedor_id}
                  onChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                  options={fornecedores.map(f => ({
                    id: f.id,
                    label: f.nome,
                    sublabel: f.nif ? `NIF: ${f.nif}` : undefined
                  }))}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <select
                    value={formData.departamento_id}
                    onChange={(e) => setFormData({ ...formData, departamento_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {departamentos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>

                <Autocomplete
                  label="Responsável"
                  placeholder="Pesquisar responsável..."
                  value={formData.responsavel_id}
                  onChange={(value) => setFormData({ ...formData, responsavel_id: value })}
                  options={usuarios.map(u => ({
                    id: u.id,
                    label: u.nome,
                    sublabel: u.email || u.departamento?.nome
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.valor_total}
                    onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moeda
                  </label>
                  <select
                    value={formData.moeda}
                    onChange={(e) => setFormData({ ...formData, moeda: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="AOA">AOA</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Término
                  </label>
                  <input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Assinatura
                  </label>
                  <input
                    type="date"
                    value={formData.data_assinatura}
                    onChange={(e) => setFormData({ ...formData, data_assinatura: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Termos e Condições
                </label>
                <textarea
                  value={formData.termos}
                  onChange={(e) => setFormData({ ...formData, termos: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Configurações de Renovação */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Configurações de Renovação</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="renovacao_automatica"
                      checked={formData.renovacao_automatica}
                      onChange={(e) => setFormData({ ...formData, renovacao_automatica: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="renovacao_automatica" className="ml-2 block text-sm text-gray-900">
                      Renovação Automática
                    </label>
                  </div>

                  {formData.renovacao_automatica && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Período de Renovação (meses)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.periodo_renovacao}
                          onChange={(e) => setFormData({ ...formData, periodo_renovacao: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: 12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alertar com (dias de antecedência)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.dias_alerta_vencimento}
                          onChange={(e) => setFormData({ ...formData, dias_alerta_vencimento: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: 30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {isEditing ? 'Atualizar' : 'Criar'} Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedContrato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Contrato</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Número do Contrato</h3>
                  <p className="text-lg font-semibold text-gray-900">{selectedContrato.numero_contrato}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                  {getStatusBadge(selectedContrato.status)}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Título</h3>
                <p className="text-gray-900">{selectedContrato.titulo}</p>
              </div>

              {selectedContrato.descricao && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Descrição</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedContrato.descricao}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Tipo</h3>
                  <p className="text-gray-900 capitalize">{selectedContrato.tipo}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Prioridade</h3>
                  {getPrioridadeBadge(selectedContrato.prioridade)}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Valor Total</h3>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedContrato.valor_total)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Fornecedor</h3>
                  <p className="text-gray-900">{selectedContrato.fornecedor_nome || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Departamento</h3>
                  <p className="text-gray-900">{selectedContrato.departamento_nome || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Responsável</h3>
                  <p className="text-gray-900">{selectedContrato.responsavel_nome || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Data de Início</h3>
                  <p className="text-gray-900">{formatDate(selectedContrato.data_inicio)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Data de Término</h3>
                  <p className="text-gray-900">{formatDate(selectedContrato.data_fim)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Data de Assinatura</h3>
                  <p className="text-gray-900">{formatDate(selectedContrato.data_assinatura)}</p>
                </div>
              </div>

              {selectedContrato.termos && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Termos e Condições</h3>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{selectedContrato.termos}</p>
                </div>
              )}

              {selectedContrato.observacoes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Observações</h3>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{selectedContrato.observacoes}</p>
                </div>
              )}

              {/* Informações de Renovação */}
              {((selectedContrato as any).renovacao_automatica || (selectedContrato as any).numero_renovacoes > 0) && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Informações de Renovação</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Renovação Automática</p>
                        <p className="text-sm font-medium text-gray-900">
                          {(selectedContrato as any).renovacao_automatica ? 'Sim' : 'Não'}
                        </p>
                      </div>
                      {(selectedContrato as any).periodo_renovacao && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Período de Renovação</p>
                          <p className="text-sm font-medium text-gray-900">
                            {(selectedContrato as any).periodo_renovacao} meses
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Número de Renovações</p>
                        <p className="text-sm font-medium text-gray-900">
                          {(selectedContrato as any).numero_renovacoes || 0}
                        </p>
                      </div>
                      {(selectedContrato as any).dias_alerta_vencimento && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Alerta de Vencimento</p>
                          <p className="text-sm font-medium text-gray-900">
                            {(selectedContrato as any).dias_alerta_vencimento} dias antes
                          </p>
                        </div>
                      )}
                    </div>
                    {canEdit && selectedContrato.status === 'ativo' && (
                      <div className="mt-4 pt-4 border-t border-blue-300">
                        <button
                          onClick={async () => {
                            if (await confirm({ title: 'Renovar contrato?', message: 'Será criado um novo contrato a partir deste.', confirmText: 'Renovar', variant: 'info' })) {
                              try {
                                const API_URL = window.location.hostname === 'localhost' 
                                  ? 'http://localhost:3001/api' 
                                  : `${window.location.protocol}//${window.location.hostname}:3001/api`;

                                const response = await fetch(`${API_URL}/contratos/${selectedContrato.id}/renovar`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'x-user-id': userProfile?.id || '',
                                    'x-user-role': userProfile?.role || '',
                                    'x-user-department-id': userProfile?.departamento_id || '',
                                  },
                                  body: JSON.stringify({
                                    manter_valores: true
                                  })
                                });

                                if (!response.ok) throw new Error('Erro ao renovar contrato');

                                setAlertDialog({
                                  isOpen: true,
                                  title: 'Sucesso',
                                  message: 'Contrato renovado com sucesso!',
                                  type: 'success'
                                });

                                setShowDetailModal(false);
                                await fetchData();
                              } catch (error) {
                                setAlertDialog({
                                  isOpen: true,
                                  title: 'Erro',
                                  message: 'Erro ao renovar contrato',
                                  type: 'error'
                                });
                              }
                            }
                          }}
                          className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <TrendingUp size={16} className="mr-2" />
                          Renovar Contrato Manualmente
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Criado por</h3>
                  <p className="text-gray-900">{selectedContrato.criado_por_nome}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Data de Criação</h3>
                  <p className="text-gray-900">{formatDate(selectedContrato.created_at)}</p>
                </div>
              </div>

              {/* Seção de Upload de Ficheiros */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Paperclip size={18} className="mr-2" />
                  Anexo do Contrato
                </h3>
                
                {selectedContrato.anexo_url ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="text-blue-600" size={24} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Ficheiro anexado</p>
                          <p className="text-xs text-gray-500">{selectedContrato.anexo_url.split('/').pop()}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadFile(selectedContrato.id)}
                          className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Download size={16} className="mr-1" />
                          Baixar
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteFile(selectedContrato.id)}
                            className="flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <Trash2 size={16} className="mr-1" />
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  canEdit && (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center">
                        <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                        <p className="text-sm text-gray-600 mb-4">Nenhum ficheiro anexado</p>
                        <div className="flex flex-col items-center space-y-3">
                          <input
                            type="file"
                            id="file-upload"
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.zip,.rar"
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Paperclip size={16} className="mr-2" />
                            Selecionar Ficheiro
                          </label>
                          {selectedFile && (
                            <div className="flex items-center space-x-3">
                              <p className="text-sm text-gray-600">{selectedFile.name}</p>
                              <button
                                onClick={() => handleUploadFile(selectedContrato.id)}
                                disabled={uploadingFile}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {uploadingFile ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Enviando...
                                  </>
                                ) : (
                                  <>
                                    <Upload size={16} className="mr-2" />
                                    Enviar Ficheiro
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          Formatos aceites: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, ZIP, RAR (máx. 50MB)
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
      />
    </div>
  );
};

export default Contratos;
