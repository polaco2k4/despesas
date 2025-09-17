import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, despesasAPI } from '../lib/mockApi';
import type { DashboardStats, Despesa } from '../types/database';
import { 
  Euro, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart3 
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDespesas, setRecentDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, despesasData] = await Promise.all([
          dashboardAPI.getStats(),
          despesasAPI.getAll({})
        ]);
        
        setStats(statsData);
        setRecentDespesas(despesasData.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovada': return 'text-green-600 bg-green-50';
      case 'rejeitada': return 'text-red-600 bg-red-50';
      case 'pendente': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovada': return 'Aprovada';
      case 'rejeitada': return 'Rejeitada';
      case 'pendente': return 'Pendente';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Bem-vindo, {userProfile?.nome}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Euro className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Orçamento Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                €{stats?.totalOrcamento?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Despesas Aprovadas</p>
              <p className="text-2xl font-semibold text-gray-900">
                €{stats?.totalDespesas?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.despesasPendentes || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Utilização</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.utilizacaoOrcamento?.toFixed(1) || '0'}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Utilização do Orçamento</h3>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(stats?.utilizacaoOrcamento || 0, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>€{stats?.totalDespesas?.toLocaleString() || '0'} utilizados</span>
          <span>€{stats?.totalOrcamento?.toLocaleString() || '0'} total</span>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Despesas Recentes</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentDespesas.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhuma despesa encontrada
            </div>
          ) : (
            recentDespesas.map((despesa) => (
              <div key={despesa.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${getStatusColor(despesa.status)}`}>
                    {despesa.status === 'aprovada' && <CheckCircle size={20} />}
                    {despesa.status === 'rejeitada' && <XCircle size={20} />}
                    {despesa.status === 'pendente' && <Clock size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {despesa.descricao}
                    </p>
                    <p className="text-sm text-gray-500">
                      {despesa.usuario?.nome} • {despesa.rubrica?.nome}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(despesa.created_at).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    €{despesa.valor.toLocaleString()}
                  </p>
                  <p className={`text-xs px-2 py-1 rounded-full ${getStatusColor(despesa.status)}`}>
                    {getStatusText(despesa.status)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;