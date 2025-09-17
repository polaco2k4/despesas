import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Database,
  Settings,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

const Configuracoes: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nome: userProfile?.nome || '',
    email: userProfile?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    emailDespesas: true,
    emailAprovacoes: true,
    emailRelatorios: false,
    pushNotifications: true
  });
  const [systemSettings, setSystemSettings] = useState({
    autoApprovalLimit: 1000,
    requireAttachments: false,
    allowSelfApproval: false,
    maxDespesaValue: 50000
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    console.log('Saving profile:', formData);
    alert('Perfil atualizado com sucesso!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    // Simulate API call
    console.log('Changing password');
    alert('Senha alterada com sucesso!');
    setFormData({
      ...formData,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleSaveNotifications = () => {
    // Simulate API call
    console.log('Saving notifications:', notifications);
    alert('Configurações de notificação salvas!');
  };

  const handleSaveSystemSettings = () => {
    // Simulate API call
    console.log('Saving system settings:', systemSettings);
    alert('Configurações do sistema salvas!');
  };

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'seguranca', label: 'Segurança', icon: Lock },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    ...(userProfile?.role === 'admin' ? [
      { id: 'sistema', label: 'Sistema', icon: Settings },
      { id: 'auditoria', label: 'Auditoria', icon: Shield }
    ] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-2 text-gray-600">
          Gerir as suas preferências e configurações do sistema
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="bg-white rounded-lg shadow p-4">
            <ul className="space-y-2">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <IconComponent className="mr-3" size={18} />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow">
            {/* Perfil Tab */}
            {activeTab === 'perfil' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Informações do Perfil</h2>
                
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Departamento
                      </label>
                      <input
                        type="text"
                        value={userProfile?.departamento?.nome || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Função
                      </label>
                      <input
                        type="text"
                        value={
                          userProfile?.role === 'admin' ? 'Administrador' :
                          userProfile?.role === 'gestor' ? 'Gestor' : 'Colaborador'
                        }
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Save size={18} />
                      <span>Salvar Alterações</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Segurança Tab */}
            {activeTab === 'seguranca' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Segurança</h2>
                
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha Atual
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nova Senha
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Nova Senha
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Requisitos da Senha:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Mínimo de 8 caracteres</li>
                      <li>• Pelo menos uma letra maiúscula</li>
                      <li>• Pelo menos uma letra minúscula</li>
                      <li>• Pelo menos um número</li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Lock size={18} />
                      <span>Alterar Senha</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notificações Tab */}
            {activeTab === 'notificacoes' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Notificações</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notificações por Email</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Novas Despesas</p>
                          <p className="text-sm text-gray-500">Receber notificação quando uma nova despesa for criada</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.emailDespesas}
                            onChange={(e) => setNotifications({ ...notifications, emailDespesas: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Aprovações</p>
                          <p className="text-sm text-gray-500">Receber notificação sobre aprovações/rejeições</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.emailAprovacoes}
                            onChange={(e) => setNotifications({ ...notifications, emailAprovacoes: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Relatórios</p>
                          <p className="text-sm text-gray-500">Receber relatórios mensais por email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.emailRelatorios}
                            onChange={(e) => setNotifications({ ...notifications, emailRelatorios: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notificações Push</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Ativar Notificações Push</p>
                        <p className="text-sm text-gray-500">Receber notificações em tempo real no navegador</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.pushNotifications}
                          onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotifications}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Bell size={18} />
                      <span>Salvar Configurações</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sistema Tab (Admin only) */}
            {activeTab === 'sistema' && userProfile?.role === 'admin' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Configurações do Sistema</h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Limite para Aprovação Automática (€)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.autoApprovalLimit}
                        onChange={(e) => setSystemSettings({ ...systemSettings, autoApprovalLimit: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Despesas abaixo deste valor são aprovadas automaticamente</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Máximo de Despesa (€)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.maxDespesaValue}
                        onChange={(e) => setSystemSettings({ ...systemSettings, maxDespesaValue: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Valor máximo permitido para uma despesa</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Anexos Obrigatórios</p>
                        <p className="text-sm text-gray-500">Exigir anexos para todas as despesas</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={systemSettings.requireAttachments}
                          onChange={(e) => setSystemSettings({ ...systemSettings, requireAttachments: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Permitir Auto-aprovação</p>
                        <p className="text-sm text-gray-500">Permitir que gestores aprovem suas próprias despesas</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={systemSettings.allowSelfApproval}
                          onChange={(e) => setSystemSettings({ ...systemSettings, allowSelfApproval: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveSystemSettings}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Settings size={18} />
                      <span>Salvar Configurações</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Auditoria Tab (Admin only) */}
            {activeTab === 'auditoria' && userProfile?.role === 'admin' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Auditoria e Logs</h2>
                
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Informações de Auditoria:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Todas as ações são automaticamente registadas</li>
                      <li>• Logs incluem criação, edição e aprovação de despesas</li>
                      <li>• Histórico de alterações de utilizadores e configurações</li>
                      <li>• Dados mantidos por 7 anos para compliance</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Atividade Recente</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Login de utilizador</p>
                          <p className="text-sm text-gray-500">ana@empresa.com - 192.168.1.100</p>
                        </div>
                        <span className="text-sm text-gray-500">Há 5 minutos</span>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Despesa aprovada</p>
                          <p className="text-sm text-gray-500">€2.000 - Licença de software</p>
                        </div>
                        <span className="text-sm text-gray-500">Há 1 hora</span>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Nova despesa criada</p>
                          <p className="text-sm text-gray-500">€500 - Material de escritório</p>
                        </div>
                        <span className="text-sm text-gray-500">Há 2 horas</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                      <Database size={18} />
                      <span>Exportar Logs</span>
                    </button>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                      <Shield size={18} />
                      <span>Limpar Logs Antigos</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;