import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Despesas from './components/Despesas';
import Orcamentos from './components/Orcamentos';
import Fornecedores from './components/Fornecedores';
import Relatorios from './components/Relatorios';
import Configuracoes from './components/Configuracoes';

// Placeholder components for other pages
const Departamentos = () => <div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-900">Departamentos</h2><p className="text-gray-600 mt-2">Funcionalidade em desenvolvimento</p></div>;
const Usuarios = () => <div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-900">Utilizadores</h2><p className="text-gray-600 mt-2">Funcionalidade em desenvolvimento</p></div>;

const AppContent: React.FC = () => {
  const { userProfile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userProfile) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'departamentos':
        return <Departamentos />;
      case 'usuarios':
        return <Usuarios />;
      case 'orcamentos':
        return <Orcamentos />;
      case 'despesas':
        return <Despesas />;
      case 'fornecedores':
        return <Fornecedores />;
      case 'relatorios':
        return <Relatorios />;
      case 'configuracoes':
        return <Configuracoes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;