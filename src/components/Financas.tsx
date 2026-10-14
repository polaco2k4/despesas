import React, { useEffect, useState, useRef } from 'react';
import { despesasAPI, rubricasAPI, departamentosAPI, dashboardAPI, SERVER_BASE_URL } from '../lib/backendApi';
import type { Despesa, Rubrica, Departamento, DashboardStats, DespesaStatus } from '../types/database';
import WithDepartmentAccess from './auth/withDepartmentAccess';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, 
  XCircle, 
  FileText,
  DollarSign,
  AlertCircle,
  Filter,
  Download,
  BarChart2,
  ChevronDown,
  ChevronUp,
  FileText as FileTextIcon,
  FileDown,
  BarChart3,
  PieChart,
  CalendarDays,
  FilterX,
  Eye,
  X
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Filtros {
  dataInicio: string;
  dataFim: string;
  departamentoId: string;
  rubricaId: string;
  valorMin: string;
  valorMax: string;
}

interface Estatisticas {
  totalDespesas: number;
  totalPago: number;
  totalPendente: number;
  porRubrica: { nome: string; valor: number; percentual: number }[];
  porMes: { mes: string; valor: number }[];
}

const FinancasContent: React.FC = () => {
  const { userProfile } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [rubricas, setRubricas] = useState<Rubrica[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentNumeroOperacao, setPaymentNumeroOperacao] = useState('');
  const [paymentDataPagamento, setPaymentDataPagamento] = useState('');
  const [paymentDocumento, setPaymentDocumento] = useState<File | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({
    dataInicio: '',
    dataFim: '',
    departamentoId: '',
    rubricaId: '',
    valorMin: '',
    valorMax: ''
  });
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalDespesas: 0,
    totalPago: 0,
    totalPendente: 0,
    porRubrica: [],
    porMes: []
  });
  const [stats, setStats] = useState<DashboardStats>({
    totalOrcamento: 0,
    totalDespesas: 0,
    despesasPendentes: 0,
    despesasAprovadas: 0,
    despesasNegadas: 0,
    utilizacaoOrcamento: 0
  });
  const [despesaAnexos, setDespesaAnexos] = useState<Array<{ id: string; anexo_url: string }>>([]);
  const [showRelatorios, setShowRelatorios] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchDespesasAprovadas(),
          fetchRubricas(),
          fetchDepartamentos(),
          fetchEstatisticas()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setMessage({ text: 'Erro ao carregar dados', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const fetchDespesasAprovadas = async (filtrosAtuais: Filtros = filtros) => {
    setLoading(true);
    try {
      console.log('🔍 Frontend Debug - Buscando despesas com filtros:', filtrosAtuais);
      
      // Para o departamento financeiro, buscar apenas despesas aprovadas e pagas
      // Despesas sem aprovação completa (pendente_gestor, pendente_admin, pendente_adm_area) não devem aparecer
      const statuses = ['aprovada', 'paga'];
      
      // Buscar todas as despesas dos status relevantes com filtros aplicados
      const promises = statuses.map(status => {
        const params = {
          status,
          data_inicio: filtrosAtuais.dataInicio || undefined,
          data_fim: filtrosAtuais.dataFim || undefined,
          rubrica_id: filtrosAtuais.rubricaId || undefined,
          departamento_id: filtrosAtuais.departamentoId || undefined,
          valor_min: filtrosAtuais.valorMin ? Number(filtrosAtuais.valorMin) : undefined,
          valor_max: filtrosAtuais.valorMax ? Number(filtrosAtuais.valorMax) : undefined,
          user_departamento_id: userProfile?.departamento_id
        };
        console.log(`🔍 Frontend Debug - Buscando despesas com status ${status}:`, params);
        return despesasAPI.getAll(params);
      });
      
      const results = await Promise.all(promises);
      console.log('🔍 Frontend Debug - Resultados recebidos:', results.map(r => r.length));
      
      // Combinar todas as despesas
      const data = results.flat();
      console.log('🔍 Frontend Debug - Total de despesas após filtros:', data.length);
      
      // Ordenar por data mais recente (created_at em ordem decrescente)
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setDespesas(data);
      setCurrentPage(1); // Resetar para primeira página quando os dados mudam
      calcularEstatisticas(data); // Atualizar estatísticas após filtrar
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar despesas aprovadas:', error);
      setMessage({ text: 'Erro ao carregar despesas', type: 'error' });
      setDespesas([]); // Limpar despesas em caso de erro
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchRubricas = async () => {
    try {
      const data = await rubricasAPI.getAll();
      setRubricas(data);
    } catch (error) {
      console.error('Erro ao carregar rubricas:', error);
      throw error;
    }
  };

  const fetchDepartamentos = async () => {
    try {
      const data = await departamentosAPI.getAll();
      setDepartamentos(data);
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
      throw error;
    }
  };

  const fetchEstatisticas = async () => {
    try {
      // Buscar todas as despesas para calcular estatísticas
      const despesas = await fetchDespesasAprovadas();
      
      // Calcular estatísticas iniciais
      calcularEstatisticas(despesas);
      
      // Buscar stats do dashboard para obter totalOrcamento e utilizacaoOrcamento
      try {
        const dashStats = await dashboardAPI.getStats({
          userId: userProfile?.id,
          userRole: userProfile?.role,
          departamentoId: userProfile?.departamento_id
        });
        setStats(prev => ({
          ...prev,
          totalOrcamento: dashStats.totalOrcamento || 0,
          utilizacaoOrcamento: dashStats.utilizacaoOrcamento || 0
        }));
      } catch (e) {
        console.error('Erro ao buscar stats do orçamento:', e);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      throw error;
    }
  };

  const calcularEstatisticas = (despesasFiltradas: Despesa[]) => {
    const totalDespesas = despesasFiltradas.reduce((sum, d) => sum + d.valor, 0);
    
    // Calcular totais por status
    const totalPago = despesasFiltradas
      .filter(d => d.status === 'paga')
      .reduce((sum, d) => sum + d.valor, 0);
      
    const totalPendente = despesasFiltradas
      .filter(d => d.status === 'aprovada')
      .reduce((sum, d) => sum + d.valor, 0);
      
    const totalNegado = despesasFiltradas
      .filter(d => d.status === 'negada')
      .reduce((sum, d) => sum + d.valor, 0);
      
    const totalAprovado = despesasFiltradas
      .filter(d => d.status === 'aprovada')
      .reduce((sum, d) => sum + d.valor, 0);
    
    // Atualizar o estado com os totais por status
    setStats(prevStats => ({
      ...prevStats,
      totalDespesas,
      totalPago,
      totalPendente,
      totalNegado,
      totalAprovado
    }));
    
    // Agrupar por rubrica
    const porRubricaMap = new Map<string, {valor: number, pago: number, pendente: number, aprovado: number, negado: number}>();
    
    despesasFiltradas.forEach(d => {
      const rubricaNome = d.rubrica?.nome || 'Sem Rubrica';
      const rubricaAtual = porRubricaMap.get(rubricaNome) || { 
        valor: 0, 
        pago: 0, 
        pendente: 0, 
        aprovado: 0, 
        negado: 0 
      };
      
      porRubricaMap.set(rubricaNome, {
        valor: rubricaAtual.valor + d.valor,
        pago: rubricaAtual.pago + (d.status === 'paga' ? d.valor : 0),
        pendente: rubricaAtual.pendente + (d.status === 'pendente_gestor' ? d.valor : 0),
        aprovado: rubricaAtual.aprovado + (d.status === 'aprovada' ? d.valor : 0),
        negado: rubricaAtual.negado + (d.status === 'negada' ? d.valor : 0)
      });
    });
    
    const porRubrica = Array.from(porRubricaMap.entries()).map(([nome, {valor, pago, pendente}]) => ({
      nome,
      valor,
      pago,
      pendente,
      percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0,
      percentualPago: totalDespesas > 0 ? (pago / totalDespesas) * 100 : 0,
      percentualPendente: totalDespesas > 0 ? (pendente / totalDespesas) * 100 : 0
    }));
    
    // Agrupar por mês
    const porMesMap = new Map<string, {valor: number, pago: number, pendente: number}>();
    
    despesasFiltradas.forEach(d => {
      const data = new Date(d.created_at);
      const mesAno = `${data.toLocaleString('pt-AO', { month: 'short' })} ${data.getFullYear()}`;
      const mesAtual = porMesMap.get(mesAno) || { valor: 0, pago: 0, pendente: 0 };
      
      const isPaga = d.descricao?.startsWith('[PAGA]');
      
      porMesMap.set(mesAno, {
        valor: mesAtual.valor + d.valor,
        pago: mesAtual.pago + (isPaga ? d.valor : 0),
        pendente: mesAtual.pendente + (isPaga ? 0 : d.valor)
      });
    });
    
    const porMes = Array.from(porMesMap.entries())
      .map(([mes, {valor, pago, pendente}]) => ({ 
        mes, 
        valor,
        pago,
        pendente
      }))
      .sort((a, b) => new Date(a.mes).getTime() - new Date(b.mes).getTime());
    
    setEstatisticas({
      totalDespesas,
      totalPago,
      totalPendente,
      porRubrica,
      porMes
    });
  };

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const aplicarFiltros = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchDespesasAprovadas(filtros);
      setMessage({ text: 'Filtros aplicados com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao aplicar filtros:', error);
      setMessage({ text: 'Erro ao aplicar filtros', type: 'error' });
    }
  };

  const limparFiltros = async () => {
    const filtrosIniciais = {
      dataInicio: '',
      dataFim: '',
      departamentoId: '',
      rubricaId: '',
      valorMin: '',
      valorMax: ''
    };
    
    setFiltros(filtrosIniciais);
    await fetchDespesasAprovadas(filtrosIniciais);
    setMessage({ text: 'Filtros removidos', type: 'info' });
  };

  const handleOpenPaymentModal = (despesa: Despesa) => {
    setSelectedDespesa(despesa);
    setPaymentNumeroOperacao('');
    setPaymentDataPagamento('');
    setPaymentDocumento(null);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedDespesa || !userProfile) {
      setMessage({ text: 'Erro: usuário não autenticado', type: 'error' });
      return;
    }

    if (!paymentNumeroOperacao.trim()) {
      setMessage({ text: 'Por favor, informe o número de operação.', type: 'error' });
      return;
    }

    if (!paymentDataPagamento) {
      setMessage({ text: 'Por favor, informe a data do pagamento.', type: 'error' });
      return;
    }

    if (!paymentDocumento) {
      setMessage({ text: 'Por favor, anexe o comprovante de pagamento.', type: 'error' });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Upload do comprovante de pagamento
      const uploadResult = await despesasAPI.uploadAnexos([paymentDocumento]);
      const comprovanteUrl = uploadResult.files[0]?.fileUrl || '';

      // Data de pagamento no formato ISO a partir do campo da data
      const dataPagamento = new Date(paymentDataPagamento).toISOString();
      
      // Atualizar a despesa com todos os dados de pagamento
      await despesasAPI.update(selectedDespesa.id, { 
        status: 'paga' as DespesaStatus,
        descricao: selectedDespesa.descricao,
        data_pagamento: dataPagamento,
        pago_por: userProfile.id,
        numero_operacao: paymentNumeroOperacao.trim(),
        comprovante_pagamento_url: comprovanteUrl,
        updated_at: new Date().toISOString()
      });
      
      // Atualizar a lista de despesas, removendo a despesa paga
      const novasDespesas = despesas.filter(d => d.id !== selectedDespesa.id);
      setDespesas(novasDespesas);
      
      // Atualizar estatísticas com a nova lista de despesas
      calcularEstatisticas(novasDespesas);
      
      // Fechar modal de confirmação e mostrar modal de sucesso
      setShowPaymentModal(false);
      setSuccessMessage(`Pagamento confirmado com sucesso em ${new Date(dataPagamento).toLocaleDateString('pt-AO')}!`);
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setMessage({ text: 'Erro ao processar pagamento', type: 'error' });
      setShowPaymentModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRejectionModal = (despesa: Despesa) => {
    setSelectedDespesa(despesa);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const handleApproveDespesa = async () => {
    if (!selectedDespesa) return;

    try {
      setIsProcessing(true);
      const dataAtual = new Date().toISOString();
      
      // Atualizar o status da despesa para 'aprovada'
      await despesasAPI.update(selectedDespesa.id, { 
        status: 'aprovada' as DespesaStatus,
        descricao: selectedDespesa.descricao,
        updated_at: dataAtual
      });
      
      // Atualizar a lista de despesas, removendo a despesa aprovada
      const novasDespesas = despesas.filter(d => d.id !== selectedDespesa.id);
      setDespesas(novasDespesas);
      setShowApprovalModal(false);
      setShowDetailsModal(false);
      
      // Atualizar estatísticas
      calcularEstatisticas(novasDespesas);
      
      setMessage({ 
        text: `Despesa aprovada com sucesso em ${new Date(dataAtual).toLocaleDateString('pt-AO')}!`,
        type: 'success' 
      });
    } catch (error) {
      console.error('Erro ao aprovar despesa:', error);
      setMessage({ text: 'Erro ao aprovar despesa', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectDespesa = async () => {
    if (!selectedDespesa || !rejectionReason.trim()) {
      setMessage({ text: 'Por favor, forneça um motivo para a rejeição', type: 'error' });
      return;
    }

    try {
      setIsProcessing(true);
      const dataAtual = new Date().toISOString();
      
      // Atualizar o status da despesa para 'negada' e adicionar motivo
      await despesasAPI.update(selectedDespesa.id, { 
        status: 'negada' as DespesaStatus,
        descricao: selectedDespesa.descricao, // Mantém a descrição original
        motivo_rejeicao: rejectionReason, // Adiciona o motivo da rejeição
        updated_at: dataAtual
      });
      
      // Atualizar a lista de despesas, removendo a despesa negada
      const novasDespesas = despesas.filter(d => d.id !== selectedDespesa.id);
      setDespesas(novasDespesas);
      setShowRejectionModal(false);
      setShowDetailsModal(false);
      
      // Atualizar estatísticas
      calcularEstatisticas(novasDespesas);
      
      setMessage({ 
        text: `Despesa negada com sucesso em ${new Date(dataAtual).toLocaleDateString('pt-AO')}!`,
        type: 'success' 
      });
    } catch (error) {
      console.error('Erro ao negar despesa:', error);
      setMessage({ 
        text: 'Erro ao negar despesa', 
        type: 'error' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredDespesas = despesas.filter(despesa => {
    const matchesSearch = searchTerm === '' || 
      despesa.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      despesa.id.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesSearch;
  });

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDespesas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDespesas.length / itemsPerPage);
  
  // Funções de exportação
  const exportarParaExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Despesas');
    
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Descrição', key: 'descricao', width: 30 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Data', key: 'data', width: 15 },
      { header: 'Rubrica', key: 'rubrica', width: 20 },
      { header: 'Departamento', key: 'departamento', width: 20 },
      { header: 'Solicitante', key: 'solicitante', width: 25 }
    ];
    
    filteredDespesas.forEach(despesa => {
      worksheet.addRow({
        id: despesa.id,
        descricao: despesa.descricao,
        valor: formatCurrency(despesa.valor).replace(/\s/g, ''),
        data: formatDate(despesa.created_at),
        rubrica: despesa.rubrica?.nome || 'N/A',
        departamento: despesa.usuario?.departamento?.nome || 'N/A',
        solicitante: despesa.usuario?.nome || 'N/A'
      });
    });
    
    worksheet.getRow(1).font = { bold: true };
    
    const buffer = await workbook.xlsx.writeBuffer();
    const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `despesas_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    setMessage({ text: 'Exportação para Excel concluída!', type: 'success' });
  };
  
  const exportarParaPDF = () => {
    // Em um cenário real, você usaria uma biblioteca como jsPDF ou html2pdf
    // Aqui está uma implementação simulada
    setMessage({ 
      text: 'Exportação para PDF em desenvolvimento. Por enquanto, use a exportação para Excel.', 
      type: 'info' 
    });
  };
  
  const exportarRelatorioMensal = () => {
    // Implementação simulada
    setMessage({ 
      text: 'Relatório mensal em desenvolvimento. Por enquanto, use a exportação para Excel.', 
      type: 'info' 
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value).replace('AOA', 'Kz');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-AO');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold">Gestão Financeira</h1>
        <div className="flex space-x-2 mt-2 md:mt-0">
          <button
            onClick={() => setShowFiltros(!showFiltros)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFiltros ? 'Ocultar Filtros' : 'Filtros'}
          </button>
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowRelatorios(!showRelatorios)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
              {showRelatorios ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </button>
            
            {showRelatorios && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    onClick={() => {
                      exportarParaExcel();
                      setShowRelatorios(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    role="menuitem"
                  >
                    <FileTextIcon className="h-4 w-4 mr-2 text-green-600" />
                    Exportar para Excel
                  </button>
                  <button
                    onClick={() => {
                      exportarParaPDF();
                      setShowRelatorios(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    role="menuitem"
                  >
                    <FileDown className="h-4 w-4 mr-2 text-red-600" />
                    Exportar para PDF
                  </button>
                  <button
                    onClick={() => {
                      exportarRelatorioMensal();
                      setShowRelatorios(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    role="menuitem"
                  >
                    <CalendarDays className="h-4 w-4 mr-2 text-blue-600" />
                    Relatório Mensal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {message.text && (
        <div className={`p-4 mb-4 rounded ${
          message.type === 'error' ? 'bg-red-100 text-red-700' : 
          message.type === 'success' ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* Seção de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total em Despesas</p>
              <p className="text-lg font-semibold">{formatCurrency(estatisticas.totalDespesas)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Pago</p>
              <p className="text-lg font-semibold">{formatCurrency(estatisticas.totalPago)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Pendente</p>
              <p className="text-lg font-semibold">{formatCurrency(estatisticas.totalPendente)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Utilização do Orçamento</p>
              <p className="text-lg font-semibold">{stats.utilizacaoOrcamento.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filtros Avançados */}
      {showFiltros && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Filtros Avançados</h3>
            <button
              onClick={limparFiltros}
              className="text-sm text-red-600 hover:text-red-800 flex items-center"
            >
              <FilterX className="h-4 w-4 mr-1" />
              Limpar Filtros
            </button>
          </div>
          
          <form onSubmit={aplicarFiltros} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                id="dataInicio"
                name="dataInicio"
                value={filtros.dataInicio}
                onChange={handleFiltroChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                id="dataFim"
                name="dataFim"
                value={filtros.dataFim}
                onChange={handleFiltroChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="rubricaId" className="block text-sm font-medium text-gray-700 mb-1">
                Rubrica
              </label>
              <select
                id="rubricaId"
                name="rubricaId"
                value={filtros.rubricaId}
                onChange={handleFiltroChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas as Rubricas</option>
                {rubricas.map(rubrica => (
                  <option key={rubrica.id} value={rubrica.id}>
                    {rubrica.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="departamentoId" className="block text-sm font-medium text-gray-700 mb-1">
                Departamento
              </label>
              <select
                id="departamentoId"
                name="departamentoId"
                value={filtros.departamentoId}
                onChange={handleFiltroChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os Departamentos</option>
                {departamentos.map(depto => (
                  <option key={depto.id} value={depto.id}>
                    {depto.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="valorMin" className="block text-sm font-medium text-gray-700 mb-1">
                Valor Mínimo (Kz)
              </label>
              <input
                type="number"
                id="valorMin"
                name="valorMin"
                value={filtros.valorMin}
                onChange={handleFiltroChange}
                placeholder="Mínimo"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="valorMax" className="block text-sm font-medium text-gray-700 mb-1">
                Valor Máximo (Kz)
              </label>
              <input
                type="number"
                id="valorMax"
                name="valorMax"
                value={filtros.valorMax}
                onChange={handleFiltroChange}
                placeholder="Máximo"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Aplicar Filtros
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Seção de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-blue-600" />
            Distribuição por Rubrica
          </h3>
          {estatisticas.porRubrica.length > 0 ? (
            <div className="space-y-2">
              {estatisticas.porRubrica.map((item, index) => (
                <div key={index} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.nome}</span>
                    <span>{formatCurrency(item.valor)} ({item.percentual.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${item.percentual}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhum dado disponível</p>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
            Despesas por Mês
          </h3>
          {estatisticas.porMes.length > 0 ? (
            <div className="space-y-2">
              {estatisticas.porMes.map((item, index) => (
                <div key={index} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.mes}</span>
                    <span>{formatCurrency(item.valor)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${(item.valor / Math.max(...estatisticas.porMes.map(m => m.valor), 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhum dado disponível</p>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="relative w-full md:w-1/3 mb-4 md:mb-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Buscar despesas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-500">
            {filteredDespesas.length} {filteredDespesas.length === 1 ? 'despesa encontrada' : 'despesas encontradas'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Descrição
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Valor
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rubrica
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Departamento
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length > 0 ? (
                currentItems.map((despesa) => (
                  <tr key={despesa.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-100 rounded-md">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">{despesa.descricao}</div>
                          <div className="text-xs text-gray-500">{despesa.id.substring(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {formatCurrency(despesa.valor)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {formatDate(despesa.created_at)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 max-w-[120px] truncate">
                        {despesa.rubrica?.nome || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 max-w-[120px] truncate">
                        {despesa.usuario?.departamento?.nome || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        despesa.status === 'paga' 
                          ? 'bg-green-100 text-green-800' 
                          : despesa.status === 'negada' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {despesa.status === 'paga' 
                          ? 'Pago' 
                          : despesa.status === 'negada' 
                            ? 'Negado' 
                            : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={async () => {
                            setSelectedDespesa(despesa);
                            setShowDetailsModal(true);
                            try {
                              const anexos = await despesasAPI.getAnexos(despesa.id);
                              setDespesaAnexos(anexos);
                            } catch (error) {
                              console.error('Error fetching anexos:', error);
                              setDespesaAnexos([]);
                            }
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenPaymentModal(despesa)}
                          disabled={isProcessing || despesa.status === 'paga' || despesa.status === 'negada'}
                          className={`p-1.5 rounded ${
                            despesa.status === 'paga' || despesa.status === 'negada'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                          } disabled:opacity-50`}
                          title={despesa.status === 'paga' ? 'Pago' : 'Pagar'}
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => despesa.status === 'negada' ? null : handleOpenRejectionModal(despesa)}
                          disabled={isProcessing || despesa.status === 'paga' || despesa.status === 'negada'}
                          className={`p-1.5 rounded ${
                            despesa.status === 'paga' || despesa.status === 'negada'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                          } disabled:opacity-50`}
                          title={despesa.status === 'negada' ? 'Negado' : 'Rejeitar'}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhuma despesa aprovada encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredDespesas.length)}
                  </span>{' '}
                  de <span className="font-medium">{filteredDespesas.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronDown className="h-5 w-5 transform rotate-90" />
                  </button>
                  
                  {/* Page numbers */}
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    const isCurrentPage = pageNumber === currentPage;
                    const showPage = pageNumber === 1 || pageNumber === totalPages || 
                                   (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1);
                    
                    if (!showPage && pageNumber === currentPage - 2) {
                      return (
                        <span key={pageNumber} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      );
                    }
                    
                    if (!showPage && pageNumber === currentPage + 2) {
                      return (
                        <span key={pageNumber} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      );
                    }
                    
                    if (!showPage) return null;
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          isCurrentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronDown className="h-5 w-5 transform -rotate-90" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedDespesa && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Detalhes da Despesa</h3>
                  <p className="text-sm text-gray-500 mt-1">ID: {selectedDespesa.id}</p>
                </div>
                <button
                  onClick={() => { setShowDetailsModal(false); setDespesaAnexos([]); }}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Fechar</span>
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Descrição</h4>
                  <p className="mt-1 text-sm text-gray-900">{selectedDespesa.descricao}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Valor</h4>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatCurrency(selectedDespesa.valor)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Data de Criação</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedDespesa.created_at)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedDespesa.status === 'paga' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedDespesa.status === 'negada' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedDespesa.status === 'paga' 
                      ? 'Pago' 
                      : selectedDespesa.status === 'negada' 
                        ? 'Negado' 
                        : 'Pendente_Gestor'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Rubrica</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedDespesa.rubrica?.nome || 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Departamento</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedDespesa.usuario?.departamento?.nome || 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Criado por</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedDespesa.usuario?.nome || 'N/A'}
                    {selectedDespesa.usuario?.email && (
                      <span className="block text-xs text-gray-500">{selectedDespesa.usuario.email}</span>
                    )}
                  </p>
                </div>
                {selectedDespesa.status === 'paga' && selectedDespesa.pago_por_usuario && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Pago por</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedDespesa.pago_por_usuario.nome || 'N/A'}
                      {selectedDespesa.pago_por_usuario.email && (
                        <span className="block text-xs text-gray-500">{selectedDespesa.pago_por_usuario.email}</span>
                      )}
                    </p>
                  </div>
                )}
                {selectedDespesa.status === 'paga' && selectedDespesa.numero_operacao && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Nº de Operação</h4>
                    <p className="mt-1 text-sm font-mono text-gray-900">{selectedDespesa.numero_operacao}</p>
                  </div>
                )}
                {selectedDespesa.status === 'paga' && selectedDespesa.data_pagamento && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Data do Pagamento</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedDespesa.data_pagamento).toLocaleDateString('pt-AO')}
                    </p>
                  </div>
                )}
                {selectedDespesa.status === 'paga' && selectedDespesa.comprovante_pagamento_url && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Comprovante</h4>
                    <a
                      href={`${SERVER_BASE_URL}${selectedDespesa.comprovante_pagamento_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center space-x-2 p-2 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Comprovante</span>
                    </a>
                  </div>
                )}
                {(selectedDespesa.anexo_url || despesaAnexos.length > 0) && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">
                      {despesaAnexos.length > 1 ? `Anexos (${despesaAnexos.length})` : 'Anexo'}
                    </h4>
                    <div className="mt-1 space-y-2">
                      {despesaAnexos.length > 0 ? (
                        despesaAnexos.map((anexo, index) => (
                          <a
                            key={anexo.id}
                            href={`${SERVER_BASE_URL}${anexo.anexo_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center space-x-2 p-2 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Anexo {despesaAnexos.length > 1 ? index + 1 : ''}</span>
                          </a>
                        ))
                      ) : selectedDespesa.anexo_url ? (
                        <a
                          href={`${SERVER_BASE_URL}${selectedDespesa.anexo_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center space-x-2 p-2 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Ver anexo</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <h4 className="text-sm font-medium text-gray-500 mb-4">Histórico de Aprovações e Pagamentos</h4>
                {selectedDespesa.aprovacoes && selectedDespesa.aprovacoes.length > 0 ? (
                  <div className="space-y-4">
                    {/* Show creator info first */}
                    <div className="border-l-4 border-blue-200 pl-4 py-2 bg-blue-50 rounded-r">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {selectedDespesa.usuario?.nome || 'Sistema'}
                          <span className="text-xs font-normal text-gray-500 ml-2">(Criador)</span>
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Criado
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(selectedDespesa.created_at).toLocaleString('pt-AO')}
                      </p>
                    </div>
                    
                    {/* Show approval/rejection history */}
                    {selectedDespesa.aprovacoes.map((aprovacao, idx) => {
                      const isPayment = aprovacao.status === 'paga';
                      const isRejection = aprovacao.status === 'negada';
                      const isApproval = aprovacao.status === 'aprovada';
                      
                      return (
                        <div 
                          key={idx} 
                          className={`border-l-4 pl-4 py-2 rounded-r ${
                            isPayment 
                              ? 'border-green-200 bg-green-50' 
                              : isRejection 
                                ? 'border-red-200 bg-red-50' 
                                : 'border-yellow-200 bg-yellow-50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {aprovacao.aprovador?.nome || 'Sistema'}
                              <span className="text-xs font-normal text-gray-500 ml-2">
                                ({aprovacao.aprovador?.departamento?.nome === 'Finanças' ? 'Financeiro' : 
                                  aprovacao.role === 'admin' ? 'Administrador' : 
                                  aprovacao.role === 'adm_area' ? 'Administrador de Área' : 
                                  aprovacao.role === 'gestor' ? 'Gestor' : 'Colaborador'})
                              </span>
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isPayment 
                                ? 'bg-green-100 text-green-800' 
                                : isRejection 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {isPayment 
                                ? 'Pagamento Efetuado' 
                                : isRejection 
                                  ? 'Rejeitado' 
                                  : 'Aprovado'}
                            </span>
                          </div>
                          {aprovacao.comentario && (
                            <p className="mt-1 text-sm text-gray-600">
                              <span className="font-medium">Comentário:</span> {aprovacao.comentario}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(aprovacao.aprovado_em).toLocaleString('pt-AO')}
                          </p>
                        </div>
                      );
                    })}
                    
                    {/* Show payment information if the expense is paid and has pago_por_usuario */}
                    {selectedDespesa.status === 'paga' && selectedDespesa.pago_por_usuario && (
                      <div className="border-l-4 border-green-200 pl-4 py-2 bg-green-50 rounded-r">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {selectedDespesa.pago_por_usuario.nome}
                            <span className="text-xs font-normal text-gray-500 ml-2">
                              ({selectedDespesa.pago_por_usuario.departamento?.nome === 'Finanças' ? 'Financeiro' : 
                                selectedDespesa.pago_por_usuario.role === 'admin' ? 'Administrador' : 
                                selectedDespesa.pago_por_usuario.role === 'adm_area' ? 'Administrador de Área' : 
                                selectedDespesa.pago_por_usuario.role === 'gestor' ? 'Gestor' : 'Colaborador'})
                            </span>
                          </p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Pagamento Efetuado
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {selectedDespesa.data_pagamento 
                            ? new Date(selectedDespesa.data_pagamento).toLocaleString('pt-AO')
                            : new Date(selectedDespesa.updated_at).toLocaleString('pt-AO')
                          }
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum histórico de aprovação disponível.</p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setShowDetailsModal(false); setDespesaAnexos([]); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedDespesa && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Rejeitar Despesa</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Por favor, informe o motivo da rejeição para a despesa:
              <span className="font-medium ml-1">{selectedDespesa.descricao}</span>
            </p>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows={4}
              placeholder="Digite o motivo da rejeição..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowRejectionModal(false)}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRejectDespesa}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                disabled={isProcessing || !rejectionReason.trim()}
              >
                {isProcessing ? 'Processando...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {showApprovalModal && selectedDespesa && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-green-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Confirmar Aprovação</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Tem certeza que deseja aprovar esta despesa?
              <span className="font-medium ml-1">{selectedDespesa.descricao}</span>
            </p>
            <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApproveDespesa}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processando...' : 'Confirmar Aprovação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedDespesa && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <DollarSign className="h-6 w-6 text-green-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Confirmar Pagamento</h3>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                Tem certeza que deseja confirmar o pagamento desta despesa?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Descrição:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDespesa.descricao}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valor:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedDespesa.valor?.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Rubrica:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDespesa.rubrica?.nome || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Operação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={paymentNumeroOperacao}
                  onChange={(e) => setPaymentNumeroOperacao(e.target.value)}
                  placeholder="Ex: 2024TRF000123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Pagamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDataPagamento}
                  onChange={(e) => setPaymentDataPagamento(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprovante de Pagamento <span className="text-red-500">*</span>
                </label>
                {paymentDocumento ? (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{paymentDocumento.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentDocumento(null)}
                      className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full py-4 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <FileText className="h-6 w-6 text-gray-400 mb-1" />
                    <span className="text-sm text-gray-500">Clique para selecionar o documento</span>
                    <span className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (máx. 5MB)</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setPaymentDocumento(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                disabled={isProcessing || !paymentNumeroOperacao.trim() || !paymentDataPagamento || !paymentDocumento}
              >
                {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-green-50 border-b border-green-100 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-800">Sucesso</h3>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700">{successMessage}</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Financas: React.FC = () => {
  return (
    <WithDepartmentAccess 
      allowedDepartments={['9623C11E-2157-4D9C-8EAB-EBC1C7FD2685']} // Only Finance department
      allowedRoles={['admin', 'gestor']} // Only admins and managers
      requireSuperAdmin={false} // Allow both super admins and finance department admins/managers
    >
      <FinancasContent />
    </WithDepartmentAccess>
  );
};

export default Financas;
