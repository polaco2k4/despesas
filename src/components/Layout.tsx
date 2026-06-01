import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Building2,
  PiggyBank,
  Receipt,
  Truck,
  DollarSign,
  FolderOpen,
  Folder,
  Car,
  ClipboardList,
  FileSignature
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userProfile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname.split('/')[1] || 'dashboard';

  const handleSignOut = async () => {
    await signOut();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'gestor', 'colaborador', 'adm_area'] },
    { id: 'departamentos', label: 'Departamentos', icon: Building2, roles: ['admin'] },
    { id: 'orcamentos', label: 'Orçamentos', icon: PiggyBank, roles: ['admin', 'gestor', 'adm_area'] },
    { id: 'despesas', label: 'Despesas', icon: Receipt, roles: ['admin', 'gestor', 'colaborador', 'adm_area'] },
    { id: 'documentos', label: 'Documentos', icon: FolderOpen, roles: ['admin', 'gestor', 'colaborador', 'adm_area'] },
    { id: 'expedientes', label: 'Expedientes', icon: Folder, roles: ['admin', 'gestor', 'colaborador', 'adm_area'] },
    { id: 'fornecedores', label: 'Fornecedores', icon: Truck, roles: ['admin', 'gestor'] },
    { id: 'financas', label: 'Finanças', icon: DollarSign, roles: ['admin', 'gestor'] },
    { id: 'frotas', label: 'Gestão de Frotas', icon: Car, roles: ['admin', 'gestor', 'colaborador'] },
    { id: 'actas', label: 'Actas e Reuniões', icon: ClipboardList, roles: ['admin', 'gestor', 'colaborador', 'adm_area'] },
    { id: 'contratos', label: 'Contratos', icon: FileSignature, roles: ['admin', 'gestor', 'adm_area'] },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, roles: ['admin', 'gestor', 'adm_area'] },
    { id: 'usuarios', label: 'Utilizadores', icon: Users, roles: ['admin'] },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, roles: ['admin', 'gestor', 'colaborador', 'adm_area'] },
  ];

  const isSuperAdmin = userProfile?.role === 'admin' && !userProfile?.departamento_id;
  const isFinanceManager = userProfile?.role === 'gestor' && userProfile?.departamento_id === '9623C11E-2157-4D9C-8EAB-EBC1C7FD2685';
  const isFinanceAdmin = userProfile?.role === 'admin' && userProfile?.departamento_id === '9623C11E-2157-4D9C-8EAB-EBC1C7FD2685';

  const filteredMenuItems = menuItems.filter(item => {
    // Check if user has the required role
    const hasRole = item.roles.includes(userProfile?.role || '');
    
    // Special handling for Finanças page
    if (item.id === 'financas') {
      return isSuperAdmin || isFinanceManager || isFinanceAdmin;
    }
    
    return hasRole;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                BudgetFlow
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-md hover:bg-gray-700 transition-colors"
              >
                <X size={20} className="text-gray-300" />
              </button>
            </div>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {userProfile?.nome?.charAt(0)?.toUpperCase()}
                </div>
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${
                  userProfile?.role === 'admin' ? 'bg-green-500' : 
                  userProfile?.role === 'gestor' ? 'bg-blue-500' : 
                  userProfile?.role === 'adm_area' ? 'bg-orange-500' :
                  'bg-amber-500'
                }`}></span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {userProfile?.nome}
                </p>
                <p className="text-xs text-gray-300 truncate">
                  {userProfile?.departamento?.nome}
                </p>
                <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  userProfile?.role === 'admin' ? 'bg-green-900/30 text-green-400' :
                  userProfile?.role === 'gestor' ? 'bg-blue-900/30 text-blue-400' :
                  userProfile?.role === 'adm_area' ? 'bg-orange-900/30 text-orange-400' :
                  'bg-amber-900/30 text-amber-400'
                }`}>
                  {userProfile?.role === 'admin' && 'Administrador'}
                  {userProfile?.role === 'gestor' && 'Gestor'}
                  {userProfile?.role === 'adm_area' && 'ADM Área'}
                  {userProfile?.role === 'colaborador' && 'Colaborador'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {filteredMenuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        navigate(`/${item.id}`);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center px-4 py-3 text-left rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-white border-l-4 border-cyan-400 shadow-lg'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:translate-x-1'
                      }`}
                    >
                      <IconComponent 
                        className={`mr-3 transition-transform duration-200 ${
                          isActive ? 'text-cyan-400 scale-110' : 'text-gray-400'
                        }`} 
                        size={20} 
                      />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-2 h-2 bg-cyan-400 rounded-full"></span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sign out */}
          <div className="p-4 border-t border-gray-700 mt-auto">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500/90 to-red-600/90 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] active:scale-95"
            >
              <LogOut className="mr-2" size={18} />
              <span className="font-medium">Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-100 px-6 py-3 sticky top-0 z-10">
          <div className="flex items-center h-14">
            {/* Botão do menu móvel - sempre à esquerda */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
            
            {/* Logo para desktop - alinhado à esquerda */}
            <div className="hidden lg:flex items-center ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Sistema Integrado de Gestão Empresarial
              </h1>
            </div>
            
            {/* Ícones de navegação - alinhados à direita */}
            <div className="ml-auto">
              <div className="flex items-center space-x-3">
                {/* Botão de notificações */}
                <Notifications />
                
                {/* Separador */}
                <div className="h-8 w-px bg-gray-200"></div>
                
                {/* Menu do usuário */}
                <div className="relative group">
                  <button 
                    className="flex items-center space-x-2 focus:outline-none"
                    aria-label="Menu do usuário"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center text-blue-600 font-medium shadow-sm">
                      {userProfile?.nome?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                        {userProfile?.nome?.split(' ')[0]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {userProfile?.departamento?.nome}
                      </span>
                    </div>
                    <ChevronDown size={16} className="hidden md:block text-gray-400 group-hover:text-blue-600 transition-colors ml-1" />
                  </button>
                  
                  {/* Dropdown do usuário (opcional) */}
                  <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Meu Perfil</a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Configurações</a>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button 
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-gray-50 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-100 px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div> SIGE - Sistema Integrado de Gestão Empresarial, by EGATE CLOUD</div>
            <div className="mt-2 md:mt-0">
              <span className="inline-flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                Online
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;