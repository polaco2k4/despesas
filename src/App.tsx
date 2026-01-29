import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
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
import Documentos from './components/Documentos';
// Import removed as it's not needed for now

const PrivateRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return userProfile ? (
    <Layout>
      {element}
    </Layout>
  ) : (
    <Navigate to="/login" replace />
  );
};

const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute element={<Dashboard />} />
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute element={<Dashboard />} />
        }
      />
      <Route
        path="/departamentos"
        element={
          <PrivateRoute element={<Departamentos />} />
        }
      />
      <Route
        path="/usuarios"
        element={
          <PrivateRoute element={<Usuarios />} />
        }
      />
      <Route
        path="/orcamentos"
        element={
          <PrivateRoute element={<Orcamentos />} />
        }
      />
      <Route
        path="/despesas"
        element={
          <PrivateRoute element={<Despesas />} />
        }
      />
      <Route
        path="/financas"
        element={
          <PrivateRoute element={<Financas />} />
        }
      />
      <Route
        path="/fornecedores"
        element={
          <PrivateRoute element={<Fornecedores />} />
        }
      />
      <Route
        path="/documentos"
        element={
          <PrivateRoute element={<Documentos />} />
        }
      />
      <Route
        path="/relatorios"
        element={
          <PrivateRoute element={<Relatorios />} />
        }
      />
      <Route
        path="/configuracoes"
        element={
          <PrivateRoute element={<Configuracoes />} />
        }
      />
      <Route 
        path="*" 
        element={
          <Layout>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">404 - Página não encontrada</h2>
                <p className="text-gray-600 mb-4">A página que você está procurando não existe ou foi movida.</p>
                <Navigate to="/" replace />
              </div>
            </div>
          </Layout>
        } 
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;