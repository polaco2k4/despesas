import React, { useState, useEffect } from 'react';
import { usuariosAPI, departamentosAPI, usuariosDepartamentosAPI } from '../lib/backendApi';
import type { Usuario, UserRole } from '../types/database';
import { 
  Plus, 
  Edit, 
  Trash2,
  Search,
  XCircle
} from 'lucide-react';

type FormData = Omit<Usuario, 'id' | 'created_at' | 'updated_at' | 'departamento'> & {
  id?: string;
  password?: string;
  confirmPassword?: string;
  departamento_ids?: string[];
};

const initialFormData: FormData = {
  nome: '',
  email: '',
  role: 'colaborador',
  departamento_id: '',
  password: '',
  confirmPassword: '',
  departamento_ids: []
};

const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usuariosData, departamentosData] = await Promise.all([
        usuariosAPI.getAll(),
        departamentosAPI.getAll()
      ]);
      setUsuarios(usuariosData);
      setDepartamentos(departamentosData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUsuario = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      departamento_id: usuario.departamento_id || '',
      password: '',
      confirmPassword: '',
      departamento_ids: usuario.departamentos?.map(d => d.id) || []
    });
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setFormData(initialFormData);
    setEditingUsuario(null);
  };

  const validateForm = (): boolean => {
    if (!formData.nome || !formData.email || !formData.role) {
      alert('Preencha todos os campos obrigatórios');
      return false;
    }

    // For adm_area users, require at least one department
    if (formData.role === 'adm_area') {
      if (!formData.departamento_ids || formData.departamento_ids.length === 0) {
        alert('ADM Área deve ter pelo menos um departamento atribuído');
        return false;
      }
    } else {
      // For other roles, require single department
      if (!formData.departamento_id) {
        alert('Selecione um departamento');
        return false;
      }
    }

    if (!editingUsuario && (!formData.password || formData.password.length < 6)) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (!editingUsuario && formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (editingUsuario) {
        await usuariosAPI.update(editingUsuario.id, {
          nome: formData.nome,
          email: formData.email,
          role: formData.role,
          departamento_id: formData.role === 'adm_area' ? null : formData.departamento_id
        });

        // If adm_area, update departments
        if (formData.role === 'adm_area' && formData.departamento_ids) {
          await usuariosDepartamentosAPI.updateUserDepartamentos(editingUsuario.id, formData.departamento_ids);
        }
      } else {
        const newUser = await usuariosAPI.create({
          nome: formData.nome,
          email: formData.email,
          role: formData.role,
          departamento_id: formData.role === 'adm_area' ? null : formData.departamento_id,
          password_hash: formData.password
        });

        // If adm_area, set departments after user creation
        if (formData.role === 'adm_area' && formData.departamento_ids && formData.departamento_ids.length > 0) {
          await usuariosDepartamentosAPI.updateUserDepartamentos(newUser.id, formData.departamento_ids);
        }
      }
      
      handleCloseModal();
      await fetchData();
    } catch (error) {
      console.error('Error saving usuario:', error);
      alert('Erro ao salvar usuário');
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await usuariosAPI.delete(id);
        alert('Usuário excluído com sucesso!');
        await fetchData();
      } catch (error: any) {
        console.error('Error deleting usuario:', error);
        
        // Display detailed error message from backend
        if (error.details) {
          // Show detailed message with dependencies info
          let message = `${error.message}\n\n${error.details}`;
          
          if (error.dependencies) {
            message += `\n\nDetalhes:`;
            if (error.dependencies.despesas > 0) {
              message += `\n• ${error.dependencies.despesas} despesa(s)`;
            }
            if (error.dependencies.aprovacoes > 0) {
              message += `\n• ${error.dependencies.aprovacoes} aprovação(ões)`;
            }
          }
          
          alert(message);
        } else {
          // Fallback to simple error message
          alert(error.message || 'Erro ao excluir usuário');
        }
      }
    }
  };

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsuarios.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredUsuarios.slice(indexOfFirstRecord, indexOfLastRecord);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'gestor': return 'Gestor';
      case 'colaborador': return 'Colaborador';
      case 'adm_area': return 'ADM Área';
      default: return role;
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
        <button
          onClick={() => {
            setEditingUsuario(null);
            setFormData(initialFormData);
            setShowCreateModal(true);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar usuário..."
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
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perfil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Criação
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRecords.length > 0 ? (
                currentRecords.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {usuario.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usuario.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usuario.role === 'adm_area' && usuario.departamentos && usuario.departamentos.length > 0
                        ? usuario.departamentos.map(d => d.nome).join(', ')
                        : usuario.departamento?.nome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        usuario.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        usuario.role === 'gestor' ? 'bg-green-100 text-green-800' :
                        usuario.role === 'adm_area' ? 'bg-orange-100 text-orange-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {getRoleLabel(usuario.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditUsuario(usuario)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUsuario(usuario.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={usuario.role === 'admin'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredUsuarios.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Próxima
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">{indexOfFirstRecord + 1}</span>
                  {' '}-{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastRecord, filteredUsuarios.length)}
                  </span>
                  {' '}de{' '}
                  <span className="font-medium">{filteredUsuarios.length}</span>
                  {' '}resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Anterior</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNumber
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Próxima</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="nome"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              {!editingUsuario && (
                <>
                  <div className="mb-4">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Senha *
                    </label>
                    <input
                      type="password"
                      id="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Senha *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}
              <div className="mb-4">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil *
                </label>
                <select
                  id="role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  required
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="gestor">Gestor</option>
                  <option value="adm_area">ADM Área</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="departamento" className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.role === 'adm_area' ? 'Departamentos *' : 'Departamento *'}
                </label>
                {formData.role === 'adm_area' ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {departamentos.map((dept) => (
                      <label key={dept.id} className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={formData.departamento_ids?.includes(dept.id) || false}
                          onChange={(e) => {
                            const updatedIds = e.target.checked
                              ? [...(formData.departamento_ids || []), dept.id]
                              : (formData.departamento_ids || []).filter(id => id !== dept.id);
                            setFormData({ ...formData, departamento_ids: updatedIds });
                          }}
                        />
                        <span className="text-sm">{dept.nome}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <select
                    id="departamento_id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.departamento_id || ''}
                    onChange={(e) => setFormData({ ...formData, departamento_id: e.target.value })}
                    required
                  >
                    <option value="">Selecione um departamento</option>
                    {departamentos.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {editingUsuario ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
