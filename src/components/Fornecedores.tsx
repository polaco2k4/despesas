import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fornecedoresAPI } from '../lib/mockApi';
import type { Fornecedor } from '../data/mockData';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Eye,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';

const Fornecedores: React.FC = () => {
  const { userProfile } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [newFornecedor, setNewFornecedor] = useState({
    nome: '',
    email: '',
    telefone: '',
    endereco: '',
    nif: '',
    categoria: '',
    status: 'ativo' as 'ativo' | 'inativo'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const fornecedoresData = await fornecedoresAPI.getAll();
      setFornecedores(fornecedoresData);
    } catch (error) {
      console.error('Error fetching fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await fornecedoresAPI.create(newFornecedor);
      
      setShowCreateModal(false);
      setNewFornecedor({
        nome: '',
        email: '',
        telefone: '',
        endereco: '',
        nif: '',
        categoria: '',
        status: 'ativo'
      });
      await fetchData();
    } catch (error) {
      console.error('Error creating fornecedor:', error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: 'ativo' | 'inativo') => {
    try {
      const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
      await fornecedoresAPI.update(id, { status: newStatus });
      await fetchData();
    } catch (error) {
      console.error('Error updating fornecedor status:', error);
    }
  };

  const handleDeleteFornecedor = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar este fornecedor?')) {
      try {
        await fornecedoresAPI.delete(id);
        await fetchData();
      } catch (error) {
        console.error('Error deleting fornecedor:', error);
      }
    }
  };

  const canManageFornecedores = userProfile?.role === 'admin' || userProfile?.role === 'gestor';

  const filteredFornecedores = fornecedores.filter(fornecedor => {
    const matchesSearch = fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fornecedor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fornecedor.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || fornecedor.status === statusFilter;
    const matchesCategoria = !categoriaFilter || fornecedor.categoria === categoriaFilter;
    return matchesSearch && matchesStatus && matchesCategoria;
  });

  const categorias = [...new Set(fornecedores.map(f => f.categoria))];

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
        <h1 className="text-3xl font-bold text-gray-900">Fornecedores</h1>
        {canManageFornecedores && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={20} />
            <span>Novo Fornecedor</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar fornecedores..."
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
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fornecedores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFornecedores.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            Nenhum fornecedor encontrado
          </div>
        ) : (
          filteredFornecedores.map((fornecedor) => (
            <div key={fornecedor.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Building className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {fornecedor.nome}
                      </h3>
                      <p className="text-sm text-gray-500">{fornecedor.categoria}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    fornecedor.status === 'ativo' 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-red-600 bg-red-50'
                  }`}>
                    {fornecedor.status === 'ativo' ? (
                      <>
                        <CheckCircle size={12} className="mr-1" />
                        Ativo
                      </>
                    ) : (
                      <>
                        <XCircle size={12} className="mr-1" />
                        Inativo
                      </>
                    )}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail size={14} className="mr-2" />
                    {fornecedor.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone size={14} className="mr-2" />
                    {fornecedor.telefone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText size={14} className="mr-2" />
                    NIF: {fornecedor.nif}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedFornecedor(fornecedor);
                      setShowDetailModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Eye size={16} />
                    <span>Ver Detalhes</span>
                  </button>
                  
                  {canManageFornecedores && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleStatus(fornecedor.id, fornecedor.status)}
                        className={`p-1 rounded ${
                          fornecedor.status === 'ativo'
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                        title={fornecedor.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      >
                        {fornecedor.status === 'ativo' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button
                        onClick={() => handleDeleteFornecedor(fornecedor.id)}
                        className="text-red-600 hover:text-red-700 p-1 rounded"
                        title="Apagar fornecedor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Novo Fornecedor</h2>
            
            <form onSubmit={handleCreateFornecedor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={newFornecedor.nome}
                  onChange={(e) => setNewFornecedor({ ...newFornecedor, nome: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome do fornecedor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newFornecedor.email}
                  onChange={(e) => setNewFornecedor({ ...newFornecedor, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@fornecedor.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={newFornecedor.telefone}
                  onChange={(e) => setNewFornecedor({ ...newFornecedor, telefone: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+351 21 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <textarea
                  value={newFornecedor.endereco}
                  onChange={(e) => setNewFornecedor({ ...newFornecedor, endereco: e.target.value })}
                  required
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Endereço completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIF
                </label>
                <input
                  type="text"
                  value={newFornecedor.nif}
                  onChange={(e) => setNewFornecedor({ ...newFornecedor, nif: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={newFornecedor.categoria}
                  onChange={(e) => setNewFornecedor({ ...newFornecedor, categoria: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Categoria do fornecedor"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
                >
                  Criar Fornecedor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewFornecedor({
                      nome: '',
                      email: '',
                      telefone: '',
                      endereco: '',
                      nif: '',
                      categoria: '',
                      status: 'ativo'
                    });
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
      {showDetailModal && selectedFornecedor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Fornecedor</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedFornecedor.nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedFornecedor.status === 'ativo' 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-red-600 bg-red-50'
                  }`}>
                    {selectedFornecedor.status === 'ativo' ? (
                      <>
                        <CheckCircle size={12} className="mr-1" />
                        Ativo
                      </>
                    ) : (
                      <>
                        <XCircle size={12} className="mr-1" />
                        Inativo
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <p className="text-gray-900">{selectedFornecedor.categoria}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedFornecedor.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <p className="text-gray-900">{selectedFornecedor.telefone}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Endereço</label>
                <p className="text-gray-900">{selectedFornecedor.endereco}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">NIF</label>
                <p className="text-gray-900">{selectedFornecedor.nif}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Criado em</label>
                  <p className="text-gray-900">{new Date(selectedFornecedor.created_at).toLocaleString('pt-PT')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Atualizado em</label>
                  <p className="text-gray-900">{new Date(selectedFornecedor.updated_at).toLocaleString('pt-PT')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fornecedores;