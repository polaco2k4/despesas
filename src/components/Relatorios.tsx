import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { despesasAPI, orcamentosAPI, departamentosAPI } from '../lib/mockApi';
import type { Despesa, Orcamento, Departamento } from '../types/database';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar,
  Building2,
  TrendingUp,
  PieChart,
  BarChart3
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const Relatorios: React.FC = () => {
  const { userProfile } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    departamento_id: '',
    ano: new Date().getFullYear(),
    status: '',
    mes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [despesasData, orcamentosData, departamentosData] = await Promise.all([
        despesasAPI.getAll({}),
        orcamentosAPI.getAll(),
        departamentosAPI.getAll()
      ]);
      
      setDespesas(despesasData);
      setOrcamentos(orcamentosData);
      setDepartamentos(departamentosData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDespesas = despesas.filter(despesa => {
    const despesaDate = new Date(despesa.created_at);
    const matchesDepartamento = !filters.departamento_id || 
      despesa.rubrica?.orcamento?.departamento_id === filters.departamento_id;
    const matchesAno = despesaDate.getFullYear() === filters.ano;
    const matchesStatus = !filters.status || despesa.status === filters.status;
    const matchesMes = !filters.mes || (despesaDate.getMonth() + 1).toString() === filters.mes;
    
    return matchesDepartamento && matchesAno && matchesStatus && matchesMes;
  });

  const filteredOrcamentos = orcamentos.filter(orcamento => {
    const matchesDepartamento = !filters.departamento_id || orcamento.departamento_id === filters.departamento_id;
    const matchesAno = orcamento.ano === filters.ano;
    
    return matchesDepartamento && matchesAno;
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Relatório de Orçamentos e Despesas', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')}`, 20, 30);
    doc.text(`Por: ${userProfile?.nome}`, 20, 35);
    
    // Filters applied
    let yPos = 45;
    doc.setFontSize(14);
    doc.text('Filtros Aplicados:', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    if (filters.departamento_id) {
      const dept = departamentos.find(d => d.id === filters.departamento_id);
      doc.text(`Departamento: ${dept?.nome}`, 20, yPos);
      yPos += 5;
    }
    doc.text(`Ano: ${filters.ano}`, 20, yPos);
    yPos += 5;
    if (filters.status) {
      doc.text(`Status: ${filters.status}`, 20, yPos);
      yPos += 5;
    }
    if (filters.mes) {
      const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      doc.text(`Mês: ${meses[parseInt(filters.mes) - 1]}`, 20, yPos);
      yPos += 5;
    }
    
    yPos += 10;
    
    // Summary
    const totalOrcamento = filteredOrcamentos.reduce((sum, o) => sum + o.valor_total, 0);
    const totalDespesas = filteredDespesas.reduce((sum, d) => sum + (d.status === 'aprovada' ? d.valor : 0), 0);
    const utilizacao = totalOrcamento > 0 ? (totalDespesas / totalOrcamento) * 100 : 0;
    
    doc.setFontSize(14);
    doc.text('Resumo:', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Orçamento Total: €${totalOrcamento.toLocaleString()}`, 20, yPos);
    yPos += 5;
    doc.text(`Despesas Aprovadas: €${totalDespesas.toLocaleString()}`, 20, yPos);
    yPos += 5;
    doc.text(`Taxa de Utilização: ${utilizacao.toFixed(1)}%`, 20, yPos);
    yPos += 5;
    doc.text(`Total de Despesas: ${filteredDespesas.length}`, 20, yPos);
    yPos += 15;
    
    // Despesas table
    if (filteredDespesas.length > 0) {
      doc.setFontSize(14);
      doc.text('Despesas:', 20, yPos);
      yPos += 5;
      
      const tableData = filteredDespesas.map(despesa => [
        despesa.descricao,
        despesa.usuario?.nome || '',
        despesa.rubrica?.nome || '',
        `€${despesa.valor.toLocaleString()}`,
        despesa.status,
        new Date(despesa.created_at).toLocaleDateString('pt-PT')
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Descrição', 'Utilizador', 'Rubrica', 'Valor', 'Status', 'Data']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] }
      });
    }
    
    // Save PDF
    const fileName = `relatorio_${filters.ano}_${Date.now()}.pdf`;
    doc.save(fileName);
  };

  const getStatusStats = () => {
    const pendentes = filteredDespesas.filter(d => d.status === 'pendente').length;
    const aprovadas = filteredDespesas.filter(d => d.status === 'aprovada').length;
    const rejeitadas = filteredDespesas.filter(d => d.status === 'rejeitada').length;
    
    return { pendentes, aprovadas, rejeitadas };
  };

  const getDepartmentStats = () => {
    const stats: { [key: string]: { nome: string; total: number; aprovadas: number } } = {};
    
    filteredDespesas.forEach(despesa => {
      const deptId = despesa.rubrica?.orcamento?.departamento_id;
      const deptNome = despesa.rubrica?.orcamento?.departamento?.nome;
      
      if (deptId && deptNome) {
        if (!stats[deptId]) {
          stats[deptId] = { nome: deptNome, total: 0, aprovadas: 0 };
        }
        stats[deptId].total += despesa.valor;
        if (despesa.status === 'aprovada') {
          stats[deptId].aprovadas += despesa.valor;
        }
      }
    });
    
    return Object.values(stats);
  };

  const statusStats = getStatusStats();
  const departmentStats = getDepartmentStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <button
          onClick={generatePDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Download size={20} />
          <span>Gerar PDF</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="mr-2" size={20} />
          Filtros
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
              value={filters.departamento_id}
              onChange={(e) => setFilters({ ...filters, departamento_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os departamentos</option>
              {departamentos.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.nome}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select
              value={filters.ano}
              onChange={(e) => setFilters({ ...filters, ano: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovada">Aprovada</option>
              <option value="rejeitada">Rejeitada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select
              value={filters.mes}
              onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os meses</option>
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <PieChart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Orçamento Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                €{filteredOrcamentos.reduce((sum, o) => sum + o.valor_total, 0).toLocaleString()}
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
                €{filteredDespesas.reduce((sum, d) => sum + (d.status === 'aprovada' ? d.valor : 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Despesas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredDespesas.length}
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
              <p className="text-sm font-medium text-gray-600">Taxa Utilização</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredOrcamentos.reduce((sum, o) => sum + o.valor_total, 0) > 0 
                  ? ((filteredDespesas.reduce((sum, d) => sum + (d.status === 'aprovada' ? d.valor : 0), 0) / 
                     filteredOrcamentos.reduce((sum, o) => sum + o.valor_total, 0)) * 100).toFixed(1)
                  : '0'}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                <span className="text-sm text-gray-600">Pendentes</span>
              </div>
              <span className="font-semibold">{statusStats.pendentes}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                <span className="text-sm text-gray-600">Aprovadas</span>
              </div>
              <span className="font-semibold">{statusStats.aprovadas}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                <span className="text-sm text-gray-600">Rejeitadas</span>
              </div>
              <span className="font-semibold">{statusStats.rejeitadas}</span>
            </div>
          </div>
        </div>

        {/* Department Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Departamento</h3>
          <div className="space-y-4">
            {departmentStats.map((dept, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{dept.nome}</span>
                  <span className="text-sm text-gray-600">€{dept.aprovadas.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ 
                      width: `${Math.max((dept.aprovadas / Math.max(...departmentStats.map(d => d.aprovadas))) * 100, 5)}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Expenses Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Despesas Filtradas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilizador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDespesas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma despesa encontrada com os filtros aplicados
                  </td>
                </tr>
              ) : (
                filteredDespesas.slice(0, 10).map((despesa) => (
                  <tr key={despesa.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {despesa.descricao}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {despesa.usuario?.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {despesa.rubrica?.orcamento?.departamento?.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      €{despesa.valor.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        despesa.status === 'aprovada' ? 'text-green-600 bg-green-50' :
                        despesa.status === 'rejeitada' ? 'text-red-600 bg-red-50' :
                        'text-yellow-600 bg-yellow-50'
                      }`}>
                        {despesa.status === 'aprovada' ? 'Aprovada' :
                         despesa.status === 'rejeitada' ? 'Rejeitada' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(despesa.created_at).toLocaleDateString('pt-PT')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredDespesas.length > 10 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Mostrando 10 de {filteredDespesas.length} despesas
          </div>
        )}
      </div>
    </div>
  );
};

export default Relatorios;