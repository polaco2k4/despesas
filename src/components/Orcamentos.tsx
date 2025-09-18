import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orcamentosAPI, rubricasAPI, departamentosAPI } from '../lib/mockApi';
import type { Orcamento, Rubrica, Departamento } from '../types/database';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Eye,
  PiggyBank,
  TrendingUp,
  AlertCircle,
  Building2
} from 'lucide-react';

const Orcamentos: React.FC = () => {
  const { userProfile } = useAuth();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [newOrcamento, setNewOrcamento] = useState({
    departamento_id: '',
    ano: new Date().getFullYear() + 1,
    valor_total: ''
  });
  const [newRubrica, setNewRubrica] = useState<{
    nome: string;
    descricao: string;
    valor: string | number;
  }>({
    nome: '',
    descricao: '',
    valor: ''
  });
  const [rubricaError, setRubricaError] = useState('');
  const [showRubricaModal, setShowRubricaModal] = useState(false);
  const [editingRubrica, setEditingRubrica] = useState<Rubrica | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orcamentosData, departamentosData] = await Promise.all([
        orcamentosAPI.getAll(),
        departamentosAPI.getAll()
      ]);
      
      setOrcamentos(orcamentosData);
      setDepartamentos(departamentosData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await orcamentosAPI.create({
        departamento_id: newOrcamento.departamento_id,
        ano: newOrcamento.ano,
        valor_total: parseFloat(newOrcamento.valor_total)
      });
      
      setShowCreateModal(false);
      setNewOrcamento({ departamento_id: '', ano: new Date().getFullYear() + 1, valor_total: '' });
      await fetchData();
    } catch (error) {
      console.error('Error creating orcamento:', error);
    }
  };

  const handleCreateRubrica = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrcamento) return;
    
    // Validate valor is a positive number
    const valor = parseFloat(newRubrica.valor);
    if (isNaN(valor) || valor <= 0) {
      setRubricaError('Por favor, insira um valor válido maior que zero.');
      return;
    }
    
    try {
      // Get all rubrics for this budget
      const rubricas = await rubricasAPI.getByOrcamento(selectedOrcamento.id);
      
      // Calculate total of existing rubrics (excluding the one being edited if in edit mode)
      const totalRubricas = rubricas
        .filter(rub => !editingRubrica || rub.id !== editingRubrica.id)
        .reduce((sum, rub) => sum + rub.valor, 0);
      
      // Check if adding/updating this rubric would exceed the budget
      if (totalRubricas + valor > selectedOrcamento.valor_total) {
        const disponivel = selectedOrcamento.valor_total - totalRubricas;
        setRubricaError(`O valor excede o orçamento disponível. Disponível: Kz ${disponivel.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        return;
      }
      
      if (editingRubrica) {
        // Update existing rubric
        await rubricasAPI.update(editingRubrica.id, {
          nome: newRubrica.nome,
          descricao: newRubrica.descricao,
          valor: valor,
          orcamento_id: selectedOrcamento.id
        });
      } else {
        // Create new rubric
        await rubricasAPI.create({
          nome: newRubrica.nome,
          descricao: newRubrica.descricao,
          valor: valor,
          orcamento_id: selectedOrcamento.id
        });
      }
      
      setShowRubricaModal(false);
      setNewRubrica({ nome: '', descricao: '', valor: '' });
      setRubricaError('');
      setEditingRubrica(null);
      await fetchData();
      
      // Refresh selected orcamento
      const updatedOrcamento = await orcamentosAPI.getById(selectedOrcamento.id);
      setSelectedOrcamento(updatedOrcamento);
    } catch (error) {
      console.error('Error saving rubrica:', error);
      setRubricaError(`Ocorreu um erro ao ${editingRubrica ? 'atualizar' : 'criar'} a rubrica. Por favor, tente novamente.`);
    }
  };

  const handleDeleteOrcamento = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar este orçamento?')) {
      try {
        await orcamentosAPI.delete(id);
        await fetchData();
      } catch (error) {
        console.error('Error deleting orcamento:', error);
      }
    }
  };

  const handleEditRubrica = (rubrica: Rubrica) => {
    setEditingRubrica(rubrica);
    setNewRubrica({
      nome: rubrica.nome,
      descricao: rubrica.descricao || '',
      valor: rubrica.valor.toString()
    });
    setShowRubricaModal(true);
  };

  const handleDeleteRubrica = async (rubricaId: string) => {
    if (confirm('Tem certeza que deseja apagar esta rubrica? Esta ação não pode ser desfeita.')) {
      try {
        await rubricasAPI.delete(rubricaId);
        if (selectedOrcamento) {
          const updatedOrcamento = await orcamentosAPI.getById(selectedOrcamento.id);
          setSelectedOrcamento(updatedOrcamento);
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting rubrica:', error);
        alert('Ocorreu um erro ao apagar a rubrica. Por favor, tente novamente.');
      }
    }
  };

  const canCreateOrcamento = userProfile?.role === 'gestor' || userProfile?.role === 'admin';

  const filteredOrcamentos = orcamentos.filter(orcamento => {
    const matchesSearch = orcamento.departamento?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         orcamento.ano.toString().includes(searchTerm);
    return matchesSearch;
  });

  const availableDepartamentos = departamentos.filter(dept => {
    if (userProfile?.role === 'admin') return true;
    return dept.id === userProfile?.departamento_id;
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
        <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
        {canCreateOrcamento && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={20} />
            <span>Novo Orçamento</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar orçamentos..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Orçamentos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrcamentos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            Nenhum orçamento encontrado
          </div>
        ) : (
          filteredOrcamentos.map((orcamento) => {
            const totalRubricas = orcamento.rubricas?.length || 0;
            
            return (
              <div key={orcamento.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {orcamento.departamento?.nome}
                        </h3>
                        <p className="text-sm text-gray-500">Ano {orcamento.ano}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Valor Total</span>
                      <span className="text-xl font-bold text-gray-900">
                        Kz {orcamento.valor_total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Rubricas</span>
                      <span className="text-sm font-medium text-gray-900">
                        {totalRubricas}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedOrcamento(orcamento);
                        setShowDetailModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Eye size={16} />
                      <span>Ver Detalhes</span>
                    </button>
                    
                    {canCreateOrcamento && (
                      <button
                        onClick={() => handleDeleteOrcamento(orcamento.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Apagar orçamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Novo Orçamento</h2>
            
            <form onSubmit={handleCreateOrcamento} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={newOrcamento.departamento_id}
                  onChange={(e) => setNewOrcamento({ ...newOrcamento, departamento_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecionar departamento</option>
                  {availableDepartamentos.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano
                </label>
                <input
                  type="number"
                  min="2024"
                  max="2030"
                  value={newOrcamento.ano}
                  onChange={(e) => setNewOrcamento({ ...newOrcamento, ano: parseInt(e.target.value) })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Total (Kz)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newOrcamento.valor_total}
                  onChange={(e) => setNewOrcamento({ ...newOrcamento, valor_total: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
                >
                  Criar Orçamento
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewOrcamento({ departamento_id: '', ano: new Date().getFullYear() + 1, valor_total: '' });
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

      {/* Detail Modal */}
      {showDetailModal && selectedOrcamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Orçamento - {selectedOrcamento.departamento?.nome} {selectedOrcamento.ano}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Eye size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <PiggyBank className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600">Valor Total</p>
                    <p className="text-2xl font-bold text-blue-900">
                      Kz {selectedOrcamento.valor_total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600">Rubricas</p>
                    <p className="text-2xl font-bold text-green-900">
                      {selectedOrcamento.rubricas?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600">Departamento</p>
                    <p className="text-lg font-bold text-purple-900">
                      {selectedOrcamento.departamento?.nome}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rubricas */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Rubricas</h3>
                {canCreateOrcamento && (
                  <button
                    onClick={() => setShowRubricaModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                  >
                    <Plus size={16} />
                    <span>Nova Rubrica</span>
                  </button>
                )}
              </div>

              {selectedOrcamento.rubricas && selectedOrcamento.rubricas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedOrcamento.rubricas.map((rubrica) => (
                    <div key={rubrica.id} className="border border-gray-200 rounded-lg p-4 relative group">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{rubrica.nome}</h4>
                          <p className="text-lg font-semibold text-blue-600 mt-1">
                            Kz {rubrica.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {rubrica.descricao && (
                            <p className="text-sm text-gray-600 mt-1">{rubrica.descricao}</p>
                          )}
                        </div>
                        {canCreateOrcamento && (
                          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRubrica(rubrica);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Editar rubrica"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRubrica(rubrica.id);
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Apagar rubrica"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>Nenhuma rubrica definida</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rubrica Modal */}
      {showRubricaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingRubrica ? 'Editar Rubrica' : 'Nova Rubrica'}
            </h2>
            
            <form onSubmit={handleCreateRubrica} className="space-y-4">
              {/* Error message */}
              {rubricaError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{rubricaError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={newRubrica.nome}
                      onChange={(e) => setNewRubrica({ ...newRubrica, nome: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome da rubrica"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newRubrica.valor || ''}
                      onChange={(e) => setNewRubrica({ ...newRubrica, valor: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Valor alocado (Kz)"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={newRubrica.descricao}
                  onChange={(e) => setNewRubrica({ ...newRubrica, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descrição da rubrica..."
                />
              </div>
              
              {selectedOrcamento && (
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Orçamento total: Kz {selectedOrcamento.valor_total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p>Já alocado: Kz {selectedOrcamento.rubricas?.reduce((sum, rub) => sum + rub.valor, 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</p>
                  <p className="font-medium">Disponível: Kz {(
                    selectedOrcamento.valor_total - 
                    (selectedOrcamento.rubricas?.reduce((sum, rub) => sum + rub.valor, 0) || 0)
                  ).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition-colors"
                >
                  {editingRubrica ? 'Atualizar Rubrica' : 'Criar Rubrica'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRubricaModal(false);
                    setNewRubrica({ nome: '', descricao: '', valor: '' });
                    setRubricaError('');
                    setEditingRubrica(null);
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
    </div>
  );
};

export default Orcamentos;