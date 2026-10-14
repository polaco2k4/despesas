import React, { useEffect, useState } from 'react';
import { useFeedback } from '../contexts/FeedbackContext';
import { departamentosAPI } from '../lib/backendApi';
import type { Departamento } from '../types/database';
import { 
  Plus, 
  Edit, 
  Trash2,
  Search,
  CheckCircle,
  XCircle
} from 'lucide-react';

const Departamentos: React.FC = () => {
  const { confirm } = useFeedback();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDepartamento, setEditingDepartamento] = useState<Departamento | null>(null);
  const [newDepartamento, setNewDepartamento] = useState({
    nome: '',
    sigla: ''
  });

  useEffect(() => {
    fetchDepartamentos();
  }, []);

  const fetchDepartamentos = async () => {
    try {
      setLoading(true);
      const data = await departamentosAPI.getAll();
      setDepartamentos(data);
    } catch (error) {
      console.error('Error fetching departamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartamento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDepartamento) {
        await departamentosAPI.update(editingDepartamento.id, newDepartamento);
      } else {
        await departamentosAPI.create(newDepartamento);
      }
      setShowCreateModal(false);
      setEditingDepartamento(null);
      setNewDepartamento({ nome: '', sigla: '' });
      await fetchDepartamentos();
    } catch (error) {
      console.error('Error saving departamento:', error);
    }
  };

  const handleEditDepartamento = (departamento: Departamento) => {
    setEditingDepartamento(departamento);
    setNewDepartamento({
      nome: departamento.nome,
      sigla: departamento.sigla || ''
    });
    setShowCreateModal(true);
  };

  const handleDeleteDepartamento = async (id: string) => {
    if (await confirm({ title: 'Excluir este departamento?', message: 'Esta acção não pode ser desfeita.', confirmText: 'Excluir', variant: 'danger' })) {
      try {
        await departamentosAPI.delete(id);
        await fetchDepartamentos();
      } catch (error) {
        console.error('Error deleting departamento:', error);
      }
    }
  };

  const filteredDepartamentos = departamentos.filter(departamento =>
    departamento.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Departamentos</h1>
        <button
          onClick={() => {
            setEditingDepartamento(null);
            setNewDepartamento({ nome: '' });
            setShowCreateModal(true);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Departamento
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar departamento..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sigla
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Criação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Atualização
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDepartamentos.length > 0 ? (
                filteredDepartamentos.map((departamento) => (
                  <tr key={departamento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {departamento.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {departamento.sigla || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(departamento.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(departamento.updated_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditDepartamento(departamento)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartamento(departamento.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhum departamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingDepartamento ? 'Editar Departamento' : 'Novo Departamento'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingDepartamento(null);
                  setNewDepartamento({ nome: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateDepartamento}>
              <div className="mb-4">
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Departamento *
                </label>
                <input
                  type="text"
                  id="nome"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={newDepartamento.nome}
                  onChange={(e) => setNewDepartamento({ ...newDepartamento, nome: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="sigla" className="block text-sm font-medium text-gray-700 mb-1">
                  Sigla (opcional)
                </label>
                <input
                  type="text"
                  id="sigla"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={newDepartamento.sigla}
                  onChange={(e) => setNewDepartamento({ ...newDepartamento, sigla: e.target.value.toUpperCase() })}
                  placeholder="Ex: FIN, RH, TI"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDepartamento(null);
                    setNewDepartamento({ nome: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {editingDepartamento ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departamentos;
