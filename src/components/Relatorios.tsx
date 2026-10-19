import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { despesasAPI, orcamentosAPI, departamentosAPI, rubricasAPI } from '../lib/backendApi';
import type { Despesa, Orcamento, Departamento, Rubrica } from '../types/database';
import { 
  Download, 
  Clock,
  XCircle,
  ArrowUpDown,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Filter,
  BarChart2 as BarChartIcon,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Define chart options type
type ChartOptions = {
  responsive: boolean;
  plugins: {
    legend: {
      position: 'top' | 'bottom' | 'left' | 'right' | 'chartArea' | 'center' | { [scaleId: string]: number } | undefined;
    };
    tooltip: {
      callbacks: {
        label: (context: any) => string;
      };
    };
  };
  scales?: {
    y?: {
      beginAtZero: boolean;
      ticks?: {
        callback: (value: any) => string;
      };
      grid?: {
        display: boolean;
      };
    };
    x?: {
      grid?: {
        display: boolean;
      };
      ticks?: {
        callback: (value: any) => string;
      };
    };
  };
  indexAxis?: 'x' | 'y';
};


const Relatorios: React.FC = () => {
  const { userProfile } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [rubricas, setRubricas] = useState<Rubrica[]>([]);
  // Referências aos gráficos da página, usadas para incluí-los no PDF
  const monthlyChartRef = useRef<ChartJS<'line'>>(null);
  const statusChartRef = useRef<ChartJS<'pie'>>(null);
  const departmentChartRef = useRef<ChartJS<'bar'>>(null);
  const [filters, setFilters] = useState({
    departamento_id: '',
    ano: new Date().getFullYear(),
    status: '',
    mes: '',
    rubrica_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Helper function to get filters based on user role
  const getRelatoriosFilters = () => {
    const filters: any = {};
    if (userProfile?.role === 'adm_area' && userProfile?.departamentos && userProfile.departamentos.length > 0) {
      // For adm_area users, filter by all their departments
      filters.departamento_ids = userProfile.departamentos.map(d => d.id);
    } else if ((userProfile?.role === 'gestor' || userProfile?.role === 'colaborador') && userProfile?.departamento_id) {
      // For gestor and colaborador, filter by their single department
      filters.departamento_id = userProfile.departamento_id;
    }
    return filters;
  };

  const fetchData = async () => {
    try {
      const filters = getRelatoriosFilters();
      
      const [despesasData, orcamentosData, departamentosData, rubricasData] = await Promise.all([
        despesasAPI.getAll(filters),
        orcamentosAPI.getAll(),
        departamentosAPI.getAll(),
        rubricasAPI.getAll()
      ]);
      
      // Filter orcamentos based on user role
      const filteredOrcamentosData = orcamentosData.filter((orcamento: Orcamento) => {
        if (userProfile?.role === 'adm_area' && userProfile?.departamentos && userProfile.departamentos.length > 0) {
          return userProfile.departamentos.some(dept => dept.id === orcamento.departamento_id);
        } else if ((userProfile?.role === 'gestor' || userProfile?.role === 'colaborador') && userProfile?.departamento_id) {
          return orcamento.departamento_id === userProfile.departamento_id;
        }
        return true;
      });
      
      setDespesas(despesasData);
      setOrcamentos(filteredOrcamentosData);
      setDepartamentos(departamentosData);
      setRubricas(rubricasData);
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
    // A despesa pertence ao ano do orçamento da sua rubrica (o mesmo ano do Orçamento Total)
    const anoDespesa = despesa.rubrica?.orcamento?.ano ?? despesaDate.getFullYear();
    const matchesAno = Number(anoDespesa) === filters.ano;
    const matchesStatus = !filters.status || (filters.status === 'pendente'
      ? despesa.status.startsWith('pendente')
      : despesa.status === filters.status);
    const matchesMes = !filters.mes || (despesaDate.getMonth() + 1).toString() === filters.mes;
    const matchesRubrica = !filters.rubrica_id || despesa.rubrica_id === filters.rubrica_id;
    
    return matchesDepartamento && matchesAno && matchesStatus && matchesMes && matchesRubrica;
  });

  const filteredOrcamentos = orcamentos.filter(orcamento => {
    const matchesDepartamento = !filters.departamento_id || orcamento.departamento_id === filters.departamento_id;
    const matchesAno = orcamento.ano === filters.ano;
    
    return matchesDepartamento && matchesAno;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovada': return 'Aprovada';
      case 'paga': return 'Paga';
      case 'negada': return 'Negada';
      case 'rejeitada': return 'Rejeitada';
      default: return 'Pendente';
    }
  };

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
    if (filters.rubrica_id) {
      const rubrica = rubricas.find(r => r.id === filters.rubrica_id);
      if (rubrica) {
        doc.text(`Rubrica: ${rubrica.nome}`, 20, yPos);
        yPos += 5;
      }
    }
    
    yPos += 10;
    
    // Summary
    const totalOrcamento = filteredOrcamentos.reduce((sum, o) => sum + o.valor_total, 0);
    const totalDespesas = filteredDespesas.reduce((sum, d) => sum + (d.status === 'aprovada' ? d.valor : 0), 0);
    const utilizacao = totalOrcamento > 0 ? (totalDespesas / totalOrcamento) * 100 : 0;
    const pagas = filteredDespesas.filter(d => d.status === 'paga');
    const totalPago = pagas.reduce((sum, d) => sum + d.valor, 0);

    doc.setFontSize(14);
    doc.text('Resumo:', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Orçamento Total: Kz ${totalOrcamento.toLocaleString()}`, 20, yPos);
    yPos += 5;
    doc.text(`Despesas Aprovadas: Kz ${totalDespesas.toLocaleString()}`, 20, yPos);
    yPos += 5;
    doc.text(`Despesas Pagas: Kz ${totalPago.toLocaleString()} (${pagas.length} itens)`, 20, yPos);
    yPos += 5;
    doc.text(`Taxa de Utilização: ${utilizacao.toFixed(1)}%`, 20, yPos);
    yPos += 5;
    doc.text(`Total de Despesas: ${filteredDespesas.length}`, 20, yPos);
    yPos += 15;

    // Gráficos (capturados dos gráficos apresentados na página)
    const pageHeight = doc.internal.pageSize.getHeight();
    const graficos: { titulo: string; chart: ChartJS | null; maxAltura: number }[] = [
      { titulo: 'Despesas Mensais', chart: monthlyChartRef.current, maxAltura: 75 },
      { titulo: 'Distribuição por Status', chart: statusChartRef.current, maxAltura: 60 },
      { titulo: 'Despesas por Departamento', chart: departmentChartRef.current, maxAltura: 90 }
    ];

    graficos.forEach(({ titulo, chart, maxAltura }) => {
      if (!chart) return;
      const proporcao = chart.width / chart.height;
      let largura = 170;
      let altura = largura / proporcao;
      if (altura > maxAltura) {
        altura = maxAltura;
        largura = altura * proporcao;
      }

      if (yPos + altura + 12 > pageHeight - 15) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.text(titulo, 20, yPos);
      yPos += 4;
      doc.addImage(chart.toBase64Image('image/png', 1), 'PNG', 20, yPos, largura, altura);
      yPos += altura + 10;
    });

    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    
    // Despesas table
    if (filteredDespesas.length > 0) {
      doc.setFontSize(14);
      doc.text('Despesas:', 20, yPos);
      yPos += 5;
      
      const tableData = filteredDespesas.map(despesa => [
        despesa.descricao,
        despesa.usuario?.nome || '',
        despesa.rubrica?.nome || '',
        `Kz ${despesa.valor.toLocaleString()}`,
        getStatusLabel(despesa.status),
        new Date(despesa.created_at).toLocaleDateString('pt-PT')
      ]);
      
      autoTable(doc, {
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
    const pendentes = filteredDespesas.filter(d => d.status.startsWith('pendente')).length;
    const aprovadas = filteredDespesas.filter(d => d.status === 'aprovada').length;
    const pagas = filteredDespesas.filter(d => d.status === 'paga').length;
    const negadas = filteredDespesas.filter(d => d.status === 'negada').length;

    return { pendentes, aprovadas, pagas, negadas };
  };

  // A API devolve só o departamento_id do orçamento; o nome vem da lista de departamentos
  const getDepartamentoNome = (despesa: Despesa) => {
    const deptId = despesa.rubrica?.orcamento?.departamento_id?.toString().toUpperCase();
    return despesa.rubrica?.orcamento?.departamento?.nome ||
      departamentos.find(d => d.id?.toString().toUpperCase() === deptId)?.nome;
  };

  const getDepartmentStats = () => {
    const stats: { [key: string]: { nome: string; total: number; pendentes: number; aprovadas: number; pagas: number } } = {};

    filteredDespesas.forEach(despesa => {
      const deptId = despesa.rubrica?.orcamento?.departamento_id?.toString().toUpperCase();
      const deptNome = getDepartamentoNome(despesa);

      if (deptId && deptNome) {
        if (!stats[deptId]) {
          stats[deptId] = { nome: deptNome, total: 0, pendentes: 0, aprovadas: 0, pagas: 0 };
        }
        if (despesa.status.startsWith('pendente')) {
          stats[deptId].pendentes += despesa.valor;
        } else if (despesa.status === 'aprovada') {
          stats[deptId].aprovadas += despesa.valor;
        } else if (despesa.status === 'paga') {
          stats[deptId].pagas += despesa.valor;
        } else {
          return;
        }
        stats[deptId].total += despesa.valor;
      }
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  };

  const statusStats = getStatusStats();
  const departmentStats = getDepartmentStats();
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Prepare data for charts
  const statusChartData = {
    labels: ['Pendentes', 'Aprovadas', 'Pagas', 'Negadas'],
    datasets: [{
      data: [statusStats.pendentes, statusStats.aprovadas, statusStats.pagas, statusStats.negadas],
      backgroundColor: ['#F59E0B', '#10B981', '#0EA5E9', '#EF4444'],
      borderWidth: 1,
    }]
  };

  // Monthly expenses data
  const monthlyExpenses = Array(12).fill(0);
  filteredDespesas.forEach(despesa => {
    if (despesa.status === 'aprovada') {
      const month = new Date(despesa.created_at).getMonth();
      monthlyExpenses[month] += despesa.valor;
    }
  });

  const monthlyChartData = {
    labels: meses,
    datasets: [{
      label: 'Despesas por Mês (Kz)',
      data: monthlyExpenses,
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      tension: 0.3,
      fill: true
    }]
  };

  // Department expenses data
  const departmentChartData = {
    labels: departmentStats.map(dept => dept.nome),
    // Mesmas cores da "Distribuição por Status"; negadas não contam como despesa
    datasets: [
      { label: 'Pendentes', data: departmentStats.map(dept => dept.pendentes), backgroundColor: '#F59E0B' },
      { label: 'Aprovadas', data: departmentStats.map(dept => dept.aprovadas), backgroundColor: '#10B981' },
      { label: 'Pagas', data: departmentStats.map(dept => dept.pagas), backgroundColor: '#0EA5E9' }
    ].map(dataset => ({ ...dataset, borderColor: '#FFFFFF', borderWidth: 1, borderRadius: 4, barThickness: 18 }))
  };

  // Chart options
  const chartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context) => `Kz ${context.raw?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `Kz ${value}`
        }
      }
    }
  };

  // Top 5 despesas
  const topDespesas = [...filteredDespesas]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // Calculate total values
  const totalOrcamento = filteredOrcamentos.reduce((sum, o) => sum + o.valor_total, 0);
  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + (d.status === 'aprovada' ? d.valor : 0), 0);
  const utilizacao = totalOrcamento > 0 ? (totalDespesas / totalOrcamento) * 100 : 0;
  const totalPendentes = filteredDespesas.filter(d => d.status.startsWith('pendente')).length;
  const totalAprovadas = filteredDespesas.filter(d => d.status === 'aprovada' || d.status === 'paga').length;
  const despesasPagas = filteredDespesas.filter(d => d.status === 'paga');
  const totalPago = despesasPagas.reduce((sum, d) => sum + d.valor, 0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalNegadas = filteredDespesas.filter(d => d.status === 'negada').length;

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
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
              value={filters.departamento_id}
              onChange={(e) => setFilters({ ...filters, departamento_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os departamentos</option>
              {departamentos
                .filter(dept => {
                  // For gestor and colaborador, only show their own department
                  if ((userProfile?.role === 'gestor' || userProfile?.role === 'colaborador') && userProfile?.departamento_id) {
                    return dept.id === userProfile.departamento_id;
                  }
                  return true;
                })
                .map((dept) => (
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
              <option value="paga">Paga</option>
              <option value="negada">Negada</option>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rubrica</label>
            <select
              value={filters.rubrica_id}
              onChange={(e) => setFilters({ ...filters, rubrica_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as rubricas</option>
              {rubricas.map((rubrica) => (
                <option key={rubrica.id} value={rubrica.id}>
                  {rubrica.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-50 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Orçamento Total</p>
              <p className="text-xl font-bold text-gray-900">
                Kz {totalOrcamento.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Disponível</span>
              <span className="font-medium text-green-600">
                Kz {(totalOrcamento - totalDespesas).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-green-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Despesas Aprovadas</p>
              <p className="text-xl font-bold text-gray-900">
                Kz {totalDespesas.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Taxa de Utilização</span>
              <span className={`font-semibold ${utilizacao > 80 ? 'text-red-600' : utilizacao > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                {utilizacao.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Despesas Pagas</p>
              <p className="text-xl font-bold text-gray-900">
                Kz {totalPago.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Quantidade</span>
              <span className="font-medium text-emerald-600">
                {despesasPagas.length} itens
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 rounded-xl">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Status das Despesas</p>
              <div className="flex items-center justify-end space-x-4 mt-1">
                <span className="text-xs text-amber-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> {totalPendentes}
                </span>
                <span className="text-xs text-green-600 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {totalAprovadas}
                </span>
                <span className="text-xs text-red-600 flex items-center">
                  <XCircle className="h-3 w-3 mr-1" /> {totalNegadas}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-amber-500 h-1.5 rounded-full" 
                style={{ width: `${(totalPendentes / filteredDespesas.length) * 100 || 0}%` }}
              ></div>
              <div 
                className="bg-green-500 h-1.5 rounded-full -mt-1.5" 
                style={{ width: `${(totalAprovadas / filteredDespesas.length) * 100 || 0}%` }}
              ></div>
              <div 
                className="bg-red-500 h-1.5 rounded-full -mt-1.5" 
                style={{ width: `${(totalNegadas / filteredDespesas.length) * 100 || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-50 rounded-xl">
              <BarChartIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Média Mensal</p>
              <p className="text-xl font-bold text-gray-900">
                Kz {(totalDespesas / 12).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Maior despesa</span>
              <span className="font-medium text-gray-900">
                {topDespesas[0] ? `Kz ${topDespesas[0].valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Expenses Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Despesas Mensais</h3>
            <div className="flex items-center text-sm text-gray-500">
              <LineChartIcon className="h-4 w-4 mr-1 text-blue-600" />
              <span>Evolução</span>
            </div>
          </div>
          <div className="h-64">
            <Line
              ref={monthlyChartRef}
              data={monthlyChartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  tooltip: {
                    callbacks: {
                      label: (context: any) => `Kz ${context.raw?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `Kz ${value}`
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Distribuição por Status</h3>
            <div className="flex items-center text-sm text-gray-500">
              <PieChartIcon className="h-4 w-4 mr-1 text-green-600" />
              <span>Visão Geral</span>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <div className="w-48 h-48">
              <Pie
                ref={statusChartRef}
                data={statusChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.raw as number;
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                          const percentage = Math.round((value / total) * 100);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }} 
              />
            </div>
            <div className="ml-8 space-y-3">
              {statusChartData.labels.map((label, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: statusChartData.datasets[0].backgroundColor[index] }}
                  ></div>
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {statusChartData.datasets[0].data[index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Expenses */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Despesas por Departamento</h3>
            <div className="flex items-center text-sm text-gray-500">
              <BarChartIcon className="h-4 w-4 mr-1 text-purple-600" />
              <span>Comparação</span>
            </div>
          </div>
          <div className="h-80">
            {departmentStats.length > 0 ? (
              <Bar
                ref={departmentChartRef}
                data={departmentChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y' as const,
                  plugins: {
                    legend: { position: 'top' as const },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `${context.dataset.label}: Kz ${Number(context.raw).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        footer: (items: any[]) => {
                          const total = departmentStats[items[0].dataIndex]?.total || 0;
                          return `Total: Kz ${total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      stacked: true,
                      beginAtZero: true,
                      grid: { color: '#F3F4F6' },
                      ticks: {
                        callback: (value) => `Kz ${Number(value).toLocaleString('pt-PT', { notation: 'compact' })}`
                      }
                    },
                    y: {
                      stacked: true,
                      grid: { display: false }
                    }
                  }
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Nenhuma despesa encontrada com os filtros atuais
              </div>
            )}
          </div>
        </div>

        {/* Top Despesas */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Maiores Despesas</h3>
            <div className="flex items-center text-sm text-gray-500">
              <ArrowUpDown className="h-4 w-4 mr-1 text-amber-600" />
              <span>Top 5</span>
            </div>
          </div>
          <div className="space-y-4">
            {topDespesas.length > 0 ? (
              topDespesas.map((despesa, index) => (
                <div key={despesa.id} className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-medium">
                    {index + 1}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                        {despesa.descricao}
                      </h4>
                      <span className="text-sm font-semibold text-gray-900 ml-2">
                        Kz {despesa.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <span>{new Date(despesa.created_at).toLocaleDateString('pt-PT')}</span>
                      <span className="mx-2">•</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        despesa.status === 'aprovada' ? 'bg-green-100 text-green-800' :
                        despesa.status === 'pendente_gestor' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {despesa.status.charAt(0).toUpperCase() + despesa.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhuma despesa encontrada com os filtros atuais
              </div>
            )}
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
                      {getDepartamentoNome(despesa)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Kz {despesa.valor.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        despesa.status === 'aprovada' || despesa.status === 'paga' ? 'text-green-600 bg-green-50' :
                        despesa.status === 'negada' ? 'text-red-600 bg-red-50' :
                        'text-yellow-600 bg-yellow-50'
                      }`}>
                        {getStatusLabel(despesa.status)}
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