import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  PiggyBank, 
  Receipt, 
  FileText, 
  Truck,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { userProfile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'gestor', 'colaborador'] },
    { id: 'departamentos', label: 'Departamentos', icon: Building2, roles: ['admin'] },
    { id: 'usuarios', label: 'Utilizadores', icon: Users, roles: ['admin'] },
    { id: 'orcamentos', label: 'Orçamentos', icon: PiggyBank, roles: ['admin', 'gestor'] },
    { id: 'despesas', label: 'Despesas', icon: Receipt, roles: ['admin', 'gestor', 'colaborador'] },
    { id: 'fornecedores', label: 'Fornecedores', icon: Truck, roles: ['admin', 'gestor'] },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, roles: ['admin', 'gestor'] },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, roles: ['admin', 'gestor', 'colaborador'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userProfile?.role || '')
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'gestor': return 'bg-blue-100 text-blue-800';
      case 'colaborador': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">Sistema Orçamental</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {userProfile?.nome?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userProfile?.nome}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userProfile?.departamento?.nome}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(userProfile?.role || '')}`}>
                {userProfile?.role === 'admin' && 'Administrador'}
                {userProfile?.role === 'gestor' && 'Gestor'}
                {userProfile?.role === 'colaborador' && 'Colaborador'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6">
            <ul className="space-y-2">
              {filteredMenuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onPageChange(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                        currentPage === item.id
                          ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <IconComponent className="mr-3" size={20} />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sign out */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="mr-3" size={20} />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;