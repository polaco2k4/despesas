import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { despesasAPI, rubricasAPI, aprovacoesAPI, orcamentosAPI, fornecedoresAPI } from '../lib/mockApi';
import type { Despesa, Rubrica, Orcamento } from '../types/database';
import { 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  Trash2,
  Eye,
  FileText
} from 'lucide-react';

const Despesas: React.FC = () => {
  const { userProfile } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [rubricas, setRubricas] = useState<Array<Rubrica & { orcamento?: { valor_total: number; departamento?: { nome: string } } }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null);
  const [newDespesa, setNewDespesa] = useState({
    rubrica_id: '',
    descricao: '',
    valor: '',
    anexo: null as File | null,
    fornecedor_id: '',
    valor_orcamento: '',
    orcamento_disponivel: '',
    orcamento_realizado: ''
  });
  
  // Reset form when closing the modal
  const resetNewDespesaForm = () => {
    setNewDespesa({
      rubrica_id: '',
      descricao: '',
      valor: '',
      anexo: null,
      fornecedor_id: '',
      valor_orcamento: '',
      orcamento_disponivel: '',
      orcamento_realizado: ''
    });
    setSelectedDespesa(null);
  };
  
  const [fornecedores, setFornecedores] = useState<Array<{id: string, nome: string}>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Omit<Despesa, 'id' | 'created_at' | 'updated_at' | 'status' | 'aprovacoes' | 'rubrica' | 'usuario'> & { 
    id?: string;
    fornecedor_id?: string | null;
  }>({
    rubrica_id: '',
    descricao: '',
    valor: 0,
    anexo_url: null,
    usuario_id: '',
    fornecedor_id: null // Inicializado como null para consistência com o tipo
  });

  useEffect(() => {
    fetchData();
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    try {
      const fornecedoresData = await fornecedoresAPI.getAll();
      setFornecedores(fornecedoresData.map((f: { id: string; nome: string }) => ({
        id: f.id,
        nome: f.nome
      })));
    } catch (error) {
      console.error('Error fetching fornecedores:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [despesasData, rubricasData] = await Promise.all([
        despesasAPI.getAll({}),
        rubricasAPI.getAll()
      ]);
      
      setDespesas(despesasData);
      setRubricas(rubricasData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRubricaChange = async (rubricaId: string) => {
    if (!rubricaId) {
      setNewDespesa(prev => ({
        ...prev,
        rubrica_id: '',
        valor_orcamento: '',
        orcamento_disponivel: '',
        orcamento_realizado: ''
      }));
      return;
    }

    try {
      // Find the selected rubrica
      const rubrica = rubricas.find(r => r.id === rubricaId);
      if (!rubrica || !rubrica.orcamento) return;

      // Calculate total expenses for this rubrica
      const allDespesas = await despesasAPI.getAll({});
      const despesasRubrica = allDespesas.filter(d => d.rubrica_id === rubricaId);
      const totalGasto = despesasRubrica.reduce((sum, d) => sum + d.valor, 0);
      const orcamentoDisponivel = rubrica.orcamento.valor_total - totalGasto;

      setNewDespesa(prev => ({
        ...prev,
        rubrica_id: rubricaId,
        valor_orcamento: rubrica.orcamento!.valor_total.toString(),
        orcamento_disponivel: orcamentoDisponivel.toString(),
        orcamento_realizado: totalGasto.toString()
      }));
    } catch (error) {
      console.error('Error fetching rubrica data:', error);
    }
  };

  const handleCreateDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const despesaData = {
        rubrica_id: newDespesa.rubrica_id,
        usuario_id: userProfile!.id,
        descricao: newDespesa.descricao,
        valor: parseFloat(newDespesa.valor),
        fornecedor_id: newDespesa.fornecedor_id,
        // Os campos abaixo são apenas para exibição e não precisam ser enviados
        // valor_orcamento: newDespesa.valor_orcamento,
        // orcamento_disponivel: newDespesa.orcamento_disponivel,
        // orcamento_realizado: newDespesa.orcamento_realizado,
        anexo_url: newDespesa.anexo ? URL.createObjectURL(newDespesa.anexo) : null
      };

      await despesasAPI.create(despesaData);
      
      setShowCreateModal(false);
      setNewDespesa({ 
        rubrica_id: '', 
        descricao: '', 
        valor: '', 
        anexo: null,
        fornecedor_id: '',
        valor_orcamento: '',
        orcamento_disponivel: '',
        orcamento_realizado: ''
      });
      await fetchData();
    } catch (error) {
      console.error('Error creating despesa:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewDespesa({ ...newDespesa, anexo: e.target.files[0] });
    }
  };

  const handleApproval = async (despesaId: string, status: 'aprovada' | 'negada', comentario?: string) => {
    try {
      await aprovacoesAPI.create({
        despesa_id: despesaId,
        status,
        comentario
      });
      
      await fetchData();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error processing approval:', error);
    }
  };

  const handleDeleteDespesa = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar esta despesa?')) {
      try {
        await despesasAPI.delete(id);
        await fetchData();
      } catch (error) {
        console.error('Error deleting despesa:', error);
      }
    }
  };

  const handleEditDespesa = (despesa: Despesa) => {
    // Se a despesa estiver negada, muda o status para 'pendente' ao editar
    const updatedDespesa = {
      ...despesa,
      status: despesa.status === 'negada' ? 'pendente' : despesa.status
    };
    
    // Prepara os dados para edição, tratando corretamente o fornecedor_id
    setEditingDespesa({
      rubrica_id: despesa.rubrica_id,
      descricao: despesa.descricao,
      valor: despesa.valor,
      anexo_url: despesa.anexo_url,
      usuario_id: despesa.usuario_id,
      fornecedor_id: despesa.fornecedor_id || null // Permite null para fornecedor_id
    });
    
    // Atualiza a despesa selecionada com o status atualizado
    setSelectedDespesa(updatedDespesa);
    setIsEditing(true);
    setShowDetailModal(true);
  };

  const handleUpdateDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDespesa) return;
    
    try {
      // Se a despesa estava negada, muda o status para 'pendente' ao atualizar
      const statusAtualizado = selectedDespesa.status === 'negada' ? 'pendente' : selectedDespesa.status;
      
      const despesaData = {
        rubrica_id: editingDespesa.rubrica_id,
        descricao: editingDespesa.descricao,
        valor: editingDespesa.valor,
        fornecedor_id: editingDespesa.fornecedor_id,
        status: statusAtualizado, // Atualiza o status se necessário
        anexo_url: editingDespesa.anexo_url
      };

      // Atualiza a despesa existente em vez de criar uma nova
      await despesasAPI.update(selectedDespesa.id, despesaData);
      
      // Fecha o modal de edição e atualiza a lista
      setShowDetailModal(false);
      setIsEditing(false);
      resetNewDespesaForm();
      await fetchData();
    } catch (error) {
      console.error('Error updating despesa:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovada':
      case 'paga': return 'text-green-600 bg-green-50';
      case 'negada': return 'text-red-600 bg-red-50';
      case 'pendente': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovada': return 'Aprovada';
      case 'paga': return 'Paga';
      case 'negada': return 'Negada';
      case 'pendente': return 'Pendente';
      default: return status;
    }
  };

  const canCreateDespesa = userProfile?.role === 'colaborador';
  const canApprove = userProfile?.role === 'gestor' || userProfile?.role === 'admin';

  const filteredDespesas = despesas.filter(despesa => {
    const matchesSearch = despesa.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         despesa.usuario?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         despesa.rubrica?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || despesa.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const availableRubricas = rubricas.filter(rubrica => {
    if (userProfile?.role === 'admin') return true;
    return rubrica.orcamento?.departamento_id === userProfile?.departamento_id;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Despesas</h1>
        {canCreateDespesa && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={20} />
            <span>Nova Despesa</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar despesas..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovada">Aprovada</option>
              <option value="rejeitada">Rejeitada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Despesas List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nº Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rubrica
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solicitante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDespesas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma despesa encontrada
                  </td>
                </tr>
              ) : (
                filteredDespesas.map((despesa) => (
                  <tr key={despesa.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {despesa.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {despesa.descricao}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Kz {despesa.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {despesa.rubrica?.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {despesa.usuario?.nome}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(despesa.status)}`}>
                        {getStatusText(despesa.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(despesa.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDespesa(despesa);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {despesa.usuario_id === userProfile?.id && despesa.status === 'pendente' && (
                          <button
                            onClick={() => handleDeleteDespesa(despesa.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Apagar despesa"
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
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Nova Despesa</h2>
            
            <form onSubmit={handleCreateDespesa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rubrica
                </label>
                <select
                  value={newDespesa.rubrica_id}
                  onChange={(e) => handleRubricaChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecionar rubrica</option>
                  {availableRubricas.map((rubrica) => (
                    <option key={rubrica.id} value={rubrica.id}>
                      {rubrica.nome} - {rubrica.orcamento?.departamento?.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={newDespesa.descricao}
                  onChange={(e) => setNewDespesa({ ...newDespesa, descricao: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descrição da despesa..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor (Kz)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newDespesa.valor}
                  onChange={(e) => setNewDespesa({ ...newDespesa, valor: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fornecedor
                </label>
                <select
                  value={newDespesa.fornecedor_id}
                  onChange={(e) => setNewDespesa({ ...newDespesa, fornecedor_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecionar fornecedor</option>
                  {fornecedores.map((fornecedor) => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor do Orçamento (Kz)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newDespesa.valor_orcamento}
                    readOnly
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orçamento Disponível (Kz)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newDespesa.orcamento_disponivel}
                    readOnly
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orçamento Realizado (Kz)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newDespesa.orcamento_realizado}
                    readOnly
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anexo (opcional)
                </label>
                <div className="mt-1 flex items-center">
                  <label className="w-full flex flex-col items-center px-4 py-6 bg-white text-blue-600 rounded-lg shadow tracking-wide uppercase border border-blue-600 cursor-pointer hover:bg-blue-50">
                    <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                    </svg>
                    <span className="mt-2 text-base leading-normal">
                      {newDespesa.anexo ? newDespesa.anexo.name : 'Selecionar ficheiro'}
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
                >
                  Criar Despesa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetNewDespesaForm();
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail/Edit Modal */}
      {(showDetailModal && selectedDespesa) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditing ? 'Editar Despesa' : 'Detalhes da Despesa'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Nº Documento: {selectedDespesa.id}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setIsEditing(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateDespesa} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rubrica *
                    </label>
                    <select
                      value={editingDespesa.rubrica_id}
                      onChange={(e) => {
                        const rubricaId = e.target.value;
                        setEditingDespesa({
                          ...editingDespesa,
                          rubrica_id: rubricaId
                        });
                        handleRubricaChange(rubricaId);
                      }}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma rubrica</option>
                      {rubricas.map((rubrica) => (
                        <option key={rubrica.id} value={rubrica.id}>
                          {rubrica.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição *
                    </label>
                    <textarea
                      value={editingDespesa.descricao}
                      onChange={(e) => setEditingDespesa({...editingDespesa, descricao: e.target.value})}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Descreva a despesa detalhadamente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor (Kz) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingDespesa.valor}
                      onChange={(e) => setEditingDespesa({...editingDespesa, valor: parseFloat(e.target.value) || 0})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0,00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fornecedor
                    </label>
                    <select
                      value={editingDespesa.fornecedor_id || ''}
                      onChange={(e) => setEditingDespesa({
                        ...editingDespesa, 
                        fornecedor_id: e.target.value || null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione um fornecedor</option>
                      {fornecedores.map((fornecedor) => (
                        <option key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anexo
                    </label>
                    <div className="mt-1 flex items-center">
                      {editingDespesa.anexo_url ? (
                        <div className="flex items-center">
                          <a 
                            href={editingDespesa.anexo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Ver anexo atual
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDespesa({...editingDespesa, anexo_url: null});
                              // Aqui você pode adicionar lógica para remover o anexo do servidor se necessário
                            }}
                            className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remover anexo
                          </button>
                        </div>
                      ) : (
                        <div className="w-full">
                          <input
                            type="file"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Formatos suportados: .pdf, .jpg, .jpeg, .png (máx. 5MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valor</label>
                    <p className="text-lg font-semibold text-gray-900">Kz {selectedDespesa.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedDespesa.status)}`}>
                      {getStatusText(selectedDespesa.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Descrição</label>
                  <p className="text-gray-900">{selectedDespesa.descricao}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Solicitante</label>
                    <p className="text-gray-900">{selectedDespesa.usuario?.nome}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rubrica</label>
                    <p className="text-gray-900">{selectedDespesa.rubrica?.nome}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fornecedor</label>
                  <p className="text-gray-900">
                    {selectedDespesa.fornecedor_id ? 
                      (fornecedores.find(f => f.id === selectedDespesa.fornecedor_id)?.nome || 'N/A') : 
                      'Não especificado'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Data de Criação</label>
                  <p className="text-gray-900">{new Date(selectedDespesa.created_at).toLocaleString('pt-PT')}</p>
                </div>

                {selectedDespesa.anexo_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Anexo</label>
                    <a 
                      href={selectedDespesa.anexo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center space-x-2"
                    >
                      <FileText size={16} />
                      <span>Ver anexo</span>
                    </a>
                  </div>
                )}

                {/* Ações do usuário */}
                {userProfile?.id === selectedDespesa.usuario_id && 
                 ['pendente', 'negada'].includes(selectedDespesa.status) && (
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedDespesa.status === 'negada' 
                        ? 'Esta despesa foi negada. Você pode editá-la e enviar novamente para aprovação.' 
                        : 'Você pode editar esta despesa enquanto ela estiver pendente.'}
                    </p>
                    <button
                      onClick={() => {
                        // For both denied and pending expenses, use the edit functionality
                        handleEditDespesa(selectedDespesa);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      {selectedDespesa.status === 'negada' ? 'Editar e Reenviar' : 'Editar Despesa'}
                    </button>
                  </div>
                )}

                {/* Approval History */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-4">Histórico de Aprovações e Pagamentos</h4>
                  <div className="space-y-4">
                    {/* Show creator info first */}
                    <div className="border-l-4 border-blue-200 pl-4 py-2 bg-blue-50 rounded-r">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {selectedDespesa.usuario?.nome || 'Utilizador não encontrado'}
                          <span className="text-xs font-normal text-gray-500 ml-2">(Solicitante)</span>
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Despesa criada
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(selectedDespesa.created_at).toLocaleString('pt-PT')}
                      </p>
                      {selectedDespesa.descricao && (
                        <p className="mt-1 text-sm text-gray-700">{selectedDespesa.descricao}</p>
                      )}
                    </div>
                    
                    {/* Show approval/rejection history */}
                    {selectedDespesa.aprovacoes && selectedDespesa.aprovacoes.length > 0 ? (
                      [...selectedDespesa.aprovacoes]
                        .sort((a, b) => new Date(a.aprovado_em).getTime() - new Date(b.aprovado_em).getTime())
                        .map((aprovacao, idx) => (
                          <div 
                            key={idx} 
                            className={`border-l-4 pl-4 py-2 rounded-r ${
                              aprovacao.status === 'aprovada' 
                                ? 'border-green-200 bg-green-50' 
                                : aprovacao.status === 'negada' 
                                  ? 'border-red-200 bg-red-50' 
                                  : 'border-yellow-200 bg-yellow-50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-medium text-gray-900">
                                {aprovacao.aprovador?.nome || 'Sistema'}
                                <span className="text-xs font-normal text-gray-500 ml-2">
                                  ({aprovacao.role === 'admin' ? 'Administrador' : 'Gestor'})
                                </span>
                              </p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                aprovacao.status === 'aprovada' 
                                  ? 'bg-green-100 text-green-800' 
                                  : aprovacao.status === 'negada' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {aprovacao.status === 'aprovada' 
                                  ? 'Aprovada' 
                                  : aprovacao.status === 'negada' 
                                    ? 'Rejeitada' 
                                    : 'Pendente'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {new Date(aprovacao.aprovado_em).toLocaleString('pt-PT')}
                            </p>
                            {aprovacao.comentario && (
                              <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                <p className="text-sm text-gray-700">{aprovacao.comentario}</p>
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-4 text-sm text-gray-500">
                        Nenhuma aprovação registada ainda.
                      </div>
                    )}

                    {/* Show payment information if the expense is paid */}
                    {selectedDespesa.status === 'paga' && (
                      <div className="border-l-4 border-green-200 pl-4 py-2 bg-green-50 rounded-r">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {selectedDespesa.aprovacoes?.find(a => a.status === 'aprovada')?.aprovador?.nome || 'Sistema'}
                            <span className="text-xs font-normal text-gray-500 ml-2">
                              (Financeiro)
                            </span>
                          </p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Pagamento processado
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {selectedDespesa.data_pagamento 
                            ? `Efetuado em: ${new Date(selectedDespesa.data_pagamento).toLocaleString('pt-PT')}`
                            : 'Data de pagamento não disponível'}
                        </p>
                        {selectedDespesa.aprovacoes?.find(a => a.status === 'paga')?.comentario && (
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                            <p className="text-sm text-gray-700">
                              {selectedDespesa.aprovacoes.find(a => a.status === 'paga')?.comentario}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Approval Actions */}
                {canApprove && selectedDespesa.status === 'pendente' && (
                  <div className="border-t pt-4">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleApproval(selectedDespesa.id, 'aprovada')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors"
                      >
                        <CheckCircle size={20} />
                        <span>Aprovar</span>
                      </button>
                      <button
                        onClick={() => handleApproval(selectedDespesa.id, 'negada')}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors"
                      >
                        <XCircle size={20} />
                        <span>Rejeitar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Despesas;