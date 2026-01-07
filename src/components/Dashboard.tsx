import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, despesasAPI } from '../lib/backendApi';
import type { DashboardStats, Despesa } from '../types/database';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  Receipt,
  DollarSign 
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDespesas, setRecentDespesas] = useState<Despesa[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, despesasData, dailyData] = await Promise.all([
          dashboardAPI.getStats(),
          despesasAPI.getAll({}),
          dashboardAPI.getDailyExpenses({ period: selectedPeriod })
        ]);
        
        console.log('Dashboard data received:', { statsData, dailyData });
        setStats(statsData);
        setRecentDespesas(despesasData.slice(0, 5));
        setDailyExpenses(dailyData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovada': return 'bg-green-100 text-green-800';
      case 'rejeitada': return 'bg-red-100 text-red-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovada': return 'Aprovada';
      case 'rejeitada': return 'Rejeitada';
      case 'pendente': return 'Pendente';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-gray-500">
          Bem-vindo de volta, <span className="font-medium text-blue-600">{userProfile?.nome?.split(' ')[0]}</span>. Aqui está o resumo das suas finanças.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-50 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Orçamento Total</p>
              <p className="text-xl font-bold text-gray-900">
                Kz {stats?.totalOrcamento?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Ano fiscal atual</span>
              <span className="flex items-center text-green-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                12%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-green-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Despesas Aprovadas</p>
              <p className="text-xl font-bold text-gray-900">
                Kz {stats?.totalDespesas?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Mês atual</span>
              <span className="flex items-center text-green-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                8%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-yellow-50 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Pendentes</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.despesasPendentes || 0}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Em análise</span>
              <span className="text-yellow-600">
                {stats?.despesasPendentes || 0} itens
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-50 rounded-xl">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Utilização</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.utilizacaoOrcamento?.toFixed(1) || '0'}%
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                style={{ width: `${Math.min(stats?.utilizacaoOrcamento || 0, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Visão Geral do Orçamento</h3>
            <p className="text-sm text-gray-500">Acompanhe a utilização do seu orçamento</p>
          </div>
          <div className="mt-2 md:mt-0">
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Este ano</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-64 bg-gray-50 rounded-lg p-4">
              {/* Gráfico de barras com dados reais */}
              {dailyExpenses.length > 0 ? (
                <div className="h-40 flex items-end space-x-2">
                  {dailyExpenses.map((day, index) => {
                    const maxValue = Math.max(...dailyExpenses.map(d => d.total), 1);
                    const heightPercentage = maxValue > 0 ? (day.total / maxValue) * 100 : 0;
                    const hasData = day.total > 0;
                    
                    // Calculate actual pixel height (container is h-40 = 160px)
                    const pixelHeight = hasData ? Math.max((heightPercentage / 100) * 160, 20) : 8;
                    
                    console.log(`Day ${index}: ${day.day}, total: ${day.total}, heightPercentage: ${heightPercentage}%, pixelHeight: ${pixelHeight}px, hasData: ${hasData}`);
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center justify-end">
                        <div 
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            hasData 
                              ? 'bg-gradient-to-t from-blue-500 to-cyan-400' 
                              : 'bg-gray-300'
                          }`}
                          style={{ 
                            height: `${pixelHeight}px`
                          }}
                          title={`${day.day}: Kz ${day.total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        ></div>
                        <span className="text-xs text-gray-500 mt-1">
                          {day.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">Sem dados para exibir</p>
                    <p className="text-xs text-gray-400 mt-1">Não há despesas registradas neste período</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Orçamento Disponível</span>
                <span className="text-sm font-semibold text-green-600">
                  Kz {(stats?.totalOrcamento && stats?.totalDespesas) ? 
                    (stats.totalOrcamento - stats.totalDespesas).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${100 - (stats?.utilizacaoOrcamento || 0)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Utilização Média</span>
                <span className="text-sm font-semibold text-blue-600">
                  {stats?.utilizacaoOrcamento?.toFixed(1) || '0'}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${stats?.utilizacaoOrcamento || 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Gasto</span>
                <span className="text-sm font-semibold text-gray-900">
                  Kz {stats?.totalDespesas?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-gray-500">de Kz {stats?.totalOrcamento?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</span>
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                  {stats?.utilizacaoOrcamento?.toFixed(1) || '0'}% utilizado
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
              <p className="text-sm text-gray-500">Últimas despesas registadas no sistema</p>
            </div>
            <button className="mt-3 md:mt-0 px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              Ver Todas
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {recentDespesas.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <Receipt className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="text-gray-700 font-medium mb-1">Sem despesas recentes</h4>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Não foram encontradas despesas recentes no sistema.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                Adicionar Despesa
              </button>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {recentDespesas.map((despesa) => (
                    <tr key={despesa.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                            getStatusColor(despesa.status).split(' ')[0]
                          }`}>
                            {despesa.status === 'aprovada' && <CheckCircle size={20} className="text-green-500" />}
                            {despesa.status === 'rejeitada' && <XCircle size={20} className="text-red-500" />}
                            {despesa.status === 'pendente' && <Clock size={20} className="text-yellow-500" />}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{despesa.descricao}</div>
                            <div className="text-xs text-gray-500">{despesa.usuario?.nome}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{despesa.rubrica?.nome}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(despesa.created_at).toLocaleDateString('pt-PT')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          Kz {despesa.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          despesa.status === 'aprovada' ? 'bg-green-100 text-green-800' :
                          despesa.status === 'rejeitada' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getStatusText(despesa.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Mostrando <span className="font-medium">1</span> a <span className="font-medium">{recentDespesas.length}</span> de <span className="font-medium">{recentDespesas.length}</span> resultados
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Anterior
                  </button>
                  <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;