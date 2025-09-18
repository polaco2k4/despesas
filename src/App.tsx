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
import Financas from './components/Financas';
import Usuarios from './components/Usuarios';
import Departamentos from './components/Departamentos';

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
      case 'financas':
        return <Financas />;
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;