import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Car, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Eye,
  Wrench,
  Fuel,
  X,
  Gauge,
  Users,
  BarChart3,
  ClipboardList,
  FileDown
} from 'lucide-react';
import { ManutencaoModal, AbastecimentoModal } from './Frotas_Modals';
import jsPDF from 'jspdf';

interface Veiculo {
  id: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano: number;
  tipo: 'ligeiro' | 'pesado' | 'moto' | 'outro';
  cor?: string;
  numero_chassis?: string;
  departamento_id?: string;
  departamento_nome?: string;
  condutor_atual_id?: string;
  condutor_nome?: string;
  quilometragem_atual: number;
  capacidade_tanque?: number;
  consumo_medio?: number;
  data_aquisicao?: string;
  valor_aquisicao?: number;
  status: 'ativo' | 'manutencao' | 'inativo' | 'abatido';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

interface Manutencao {
  id: string;
  veiculo_id: string;
  veiculo_matricula?: string;
  tipo: 'preventiva' | 'corretiva' | 'revisao' | 'inspecao';
  descricao: string;
  data_manutencao: string;
  quilometragem?: number;
  custo: number;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  proximo_servico_km?: number;
  proximo_servico_data?: string;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  responsavel_id?: string;
  responsavel_nome?: string;
  observacoes?: string;
}

interface Abastecimento {
  id: string;
  veiculo_id: string;
  veiculo_matricula?: string;
  data_abastecimento: string;
  quilometragem: number;
  litros: number;
  preco_litro: number;
  valor_total: number;
  tipo_combustivel: 'gasolina' | 'diesel' | 'eletrico' | 'hibrido' | 'gas';
  posto?: string;
  condutor_id?: string;
  condutor_nome?: string;
  tanque_cheio: boolean;
  observacoes?: string;
}

const API_URL = 'http://localhost:3001/api';

const Frotas: React.FC = () => {
  const { userProfile } = useAuth();
  const isColaborador = userProfile?.role === 'colaborador';
  const [activeTab, setActiveTab] = useState<'veiculos' | 'manutencoes' | 'abastecimentos' | 'atribuicoes' | 'solicitacoes' | 'relatorios'>(isColaborador ? 'solicitacoes' : 'veiculos');
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<any[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [relatorios, setRelatorios] = useState<any>(null);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManutencaoModal, setShowManutencaoModal] = useState(false);
  const [showAbastecimentoModal, setShowAbastecimentoModal] = useState(false);
  const [showAtribuicaoModal, setShowAtribuicaoModal] = useState(false);
  const [showSolicitacaoModal, setShowSolicitacaoModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showManutencaoDetailModal, setShowManutencaoDetailModal] = useState(false);
  const [showAbastecimentoDetailModal, setShowAbastecimentoDetailModal] = useState(false);
  const [showAtribuicaoDetailModal, setShowAtribuicaoDetailModal] = useState(false);
  const [showSolicitacaoDetailModal, setShowSolicitacaoDetailModal] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);
  const [selectedManutencao, setSelectedManutencao] = useState<Manutencao | null>(null);
  const [selectedAbastecimento, setSelectedAbastecimento] = useState<Abastecimento | null>(null);
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<any>(null);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<any>(null);
  const [editingVeiculo, setEditingVeiculo] = useState<Partial<Veiculo>>({});
  const [editingManutencao, setEditingManutencao] = useState<Partial<Manutencao>>({});
  const [editingAbastecimento, setEditingAbastecimento] = useState<Partial<Abastecimento>>({});
  const [editingAtribuicao, setEditingAtribuicao] = useState<any>({});
  const [editingSolicitacao, setEditingSolicitacao] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingManutencao, setIsEditingManutencao] = useState(false);
  const [isEditingAbastecimento, setIsEditingAbastecimento] = useState(false);
  const [isEditingAtribuicao, setIsEditingAtribuicao] = useState(false);
  const [isEditingSolicitacao, setIsEditingSolicitacao] = useState(false);
  const [condutorSearch, setCondutorSearch] = useState('');
  const [showCondutorDropdown, setShowCondutorDropdown] = useState(false);
  const [condutorAtribuicaoSearch, setCondutorAtribuicaoSearch] = useState('');
  const [showCondutorAtribuicaoDropdown, setShowCondutorAtribuicaoDropdown] = useState(false);
  const [condutorSolicitacaoSearch, setCondutorSolicitacaoSearch] = useState('');
  const [showCondutorSolicitacaoDropdown, setShowCondutorSolicitacaoDropdown] = useState(false);

  useEffect(() => {
    fetchData();
    fetchDepartamentos();
    fetchUsuarios();
    fetchFornecedores();
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.condutor-autocomplete')) {
        setShowCondutorDropdown(false);
      }
      if (!target.closest('.condutor-atribuicao-autocomplete')) {
        setShowCondutorAtribuicaoDropdown(false);
      }
      if (!target.closest('.condutor-solicitacao-autocomplete')) {
        setShowCondutorSolicitacaoDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDepartamentos = async () => {
    try {
      const response = await fetch(`${API_URL}/departamentos`);
      if (response.ok) {
        const data = await response.json();
        setDepartamentos(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching departamentos:', error);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios`);
      if (response.ok) {
        const data = await response.json();
        setUsuarios(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    }
  };

  const fetchFornecedores = async () => {
    try {
      const response = await fetch(`${API_URL}/fornecedores`);
      if (response.ok) {
        const data = await response.json();
        setFornecedores(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching fornecedores:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'veiculos') {
        const response = await fetch(`${API_URL}/frotas/veiculos`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setVeiculos(Array.isArray(data) ? data : []);
      } else if (activeTab === 'manutencoes') {
        const response = await fetch(`${API_URL}/frotas/manutencoes`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setManutencoes(Array.isArray(data) ? data : []);
      } else if (activeTab === 'abastecimentos') {
        const response = await fetch(`${API_URL}/frotas/abastecimentos`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAbastecimentos(Array.isArray(data) ? data : []);
      } else if (activeTab === 'atribuicoes') {
        const response = await fetch(`${API_URL}/frotas/atribuicoes`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAtribuicoes(Array.isArray(data) ? data : []);
      } else if (activeTab === 'solicitacoes') {
        const response = await fetch(`${API_URL}/frotas/solicitacoes`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSolicitacoes(Array.isArray(data) ? data : []);
      } else if (activeTab === 'relatorios') {
        await fetchRelatorios();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setVeiculos([]);
      setManutencoes([]);
      setAbastecimentos([]);
      setAtribuicoes([]);
      setSolicitacoes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatorios = async () => {
    try {
      const [veiculosRes, manutencoesRes, abastecimentosRes] = await Promise.all([
        fetch(`${API_URL}/frotas/veiculos`),
        fetch(`${API_URL}/frotas/manutencoes`),
        fetch(`${API_URL}/frotas/abastecimentos`)
      ]);
      
      const veiculosData = await veiculosRes.json();
      const manutencoesData = await manutencoesRes.json();
      const abastecimentosData = await abastecimentosRes.json();
      
      const totalVeiculos = veiculosData.length;
      const veiculosAtivos = veiculosData.filter((v: any) => v.status === 'ativo').length;
      const totalManutencoes = manutencoesData.length;
      const custoManutencoes = manutencoesData.reduce((sum: number, m: any) => sum + (m.custo || 0), 0);
      const totalAbastecimentos = abastecimentosData.length;
      const custoAbastecimentos = abastecimentosData.reduce((sum: number, a: any) => sum + (a.valor_total || 0), 0);
      const totalLitros = abastecimentosData.reduce((sum: number, a: any) => sum + (a.litros || 0), 0);
      
      setRelatorios({
        totalVeiculos,
        veiculosAtivos,
        totalManutencoes,
        custoManutencoes,
        totalAbastecimentos,
        custoAbastecimentos,
        totalLitros,
        custoTotal: custoManutencoes + custoAbastecimentos
      });
    } catch (error) {
      console.error('Error fetching relatorios:', error);
    }
  };

  const handleCreateVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing ? `${API_URL}/frotas/veiculos/${editingVeiculo.id}` : `${API_URL}/frotas/veiculos`;
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVeiculo)
      });
      
      if (response.ok) {
        setShowCreateModal(false);
        setEditingVeiculo({});
        setIsEditing(false);
        await fetchData();
      }
    } catch (error) {
      console.error('Error saving veiculo:', error);
    }
  };

  const handleEditVeiculo = (veiculo: Veiculo) => {
    setEditingVeiculo(veiculo);
    setIsEditing(true);
    setShowCreateModal(true);
    // Set condutor search to the current condutor name
    const condutor = usuarios.find(u => u.id === veiculo.condutor_atual_id);
    setCondutorSearch(condutor ? condutor.nome : '');
  };

  const handleSelectCondutor = (usuario: any) => {
    setEditingVeiculo({ ...editingVeiculo, condutor_atual_id: usuario.id });
    setCondutorSearch(usuario.nome);
    setShowCondutorDropdown(false);
  };

  const handleClearCondutor = () => {
    setEditingVeiculo({ ...editingVeiculo, condutor_atual_id: undefined });
    setCondutorSearch('');
    setShowCondutorDropdown(false);
  };

  const filteredUsuarios = usuarios.filter(user => 
    user.nome.toLowerCase().includes(condutorSearch.toLowerCase())
  );

  const filteredUsuariosAtribuicao = usuarios.filter(user => 
    user.nome.toLowerCase().includes(condutorAtribuicaoSearch.toLowerCase())
  );

  const handleSelectCondutorAtribuicao = (usuario: any) => {
    setEditingAtribuicao({ ...editingAtribuicao, condutor_id: usuario.id });
    setCondutorAtribuicaoSearch(usuario.nome);
    setShowCondutorAtribuicaoDropdown(false);
  };

  const handleClearCondutorAtribuicao = () => {
    setEditingAtribuicao({ ...editingAtribuicao, condutor_id: undefined });
    setCondutorAtribuicaoSearch('');
    setShowCondutorAtribuicaoDropdown(false);
  };

  const handleDeleteVeiculo = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar este veículo?')) return;
    
    try {
      await fetch(`${API_URL}/frotas/veiculos/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (error) {
      console.error('Error deleting veiculo:', error);
    }
  };

  const handleEditManutencao = (manutencao: Manutencao) => {
    setEditingManutencao(manutencao);
    setIsEditingManutencao(true);
    setShowManutencaoModal(true);
  };

  const handleDeleteManutencao = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar esta manutenção?')) return;
    
    try {
      await fetch(`${API_URL}/frotas/manutencoes/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (error) {
      console.error('Error deleting manutencao:', error);
    }
  };

  const handleEditAbastecimento = (abastecimento: Abastecimento) => {
    setEditingAbastecimento(abastecimento);
    setIsEditingAbastecimento(true);
    setShowAbastecimentoModal(true);
  };

  const handleDeleteAbastecimento = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar este abastecimento?')) return;
    
    try {
      await fetch(`${API_URL}/frotas/abastecimentos/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (error) {
      console.error('Error deleting abastecimento:', error);
    }
  };

  const handleCreateManutencao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditingManutencao ? `${API_URL}/frotas/manutencoes/${editingManutencao.id}` : `${API_URL}/frotas/manutencoes`;
      const method = isEditingManutencao ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingManutencao)
      });
      
      if (response.ok) {
        setShowManutencaoModal(false);
        setEditingManutencao({});
        setIsEditingManutencao(false);
        await fetchData();
      }
    } catch (error) {
      console.error('Error saving manutencao:', error);
    }
  };

  const handleCreateAbastecimento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditingAbastecimento ? `${API_URL}/frotas/abastecimentos/${editingAbastecimento.id}` : `${API_URL}/frotas/abastecimentos`;
      const method = isEditingAbastecimento ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAbastecimento)
      });
      
      if (response.ok) {
        setShowAbastecimentoModal(false);
        setEditingAbastecimento({});
        setIsEditingAbastecimento(false);
        await fetchData();
      }
    } catch (error) {
      console.error('Error saving abastecimento:', error);
    }
  };

  const handleOpenCreateModal = () => {
    if (activeTab === 'veiculos') {
      setShowCreateModal(true);
    } else if (activeTab === 'manutencoes') {
      setEditingManutencao({});
      setIsEditingManutencao(false);
      setShowManutencaoModal(true);
    } else if (activeTab === 'abastecimentos') {
      setEditingAbastecimento({});
      setIsEditingAbastecimento(false);
      setShowAbastecimentoModal(true);
    } else if (activeTab === 'atribuicoes') {
      setEditingAtribuicao({});
      setShowAtribuicaoModal(true);
    } else if (activeTab === 'solicitacoes') {
      setEditingSolicitacao({ solicitante_id: userProfile?.id });
      setShowSolicitacaoModal(true);
    }
  };

  const handleCreateSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditingSolicitacao ? `${API_URL}/frotas/solicitacoes/${editingSolicitacao.id}` : `${API_URL}/frotas/solicitacoes`;
      const method = isEditingSolicitacao ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSolicitacao)
      });
      
      if (response.ok) {
        setShowSolicitacaoModal(false);
        setEditingSolicitacao({});
        setIsEditingSolicitacao(false);
        await fetchData();
      }
    } catch (error) {
      console.error('Error saving solicitacao:', error);
    }
  };

  const handleEditSolicitacao = (solicitacao: any) => {
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setEditingSolicitacao({
      ...solicitacao,
      data_inicio: formatDateForInput(solicitacao.data_inicio),
      data_fim: formatDateForInput(solicitacao.data_fim)
    });
    setIsEditingSolicitacao(true);
    setShowSolicitacaoModal(true);
    const condutor = usuarios.find(u => u.id === solicitacao.condutor_atribuido_id);
    setCondutorSolicitacaoSearch(condutor ? condutor.nome : '');
  };

  const handleDeleteSolicitacao = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar esta solicitação?')) return;
    
    try {
      await fetch(`${API_URL}/frotas/solicitacoes/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (error) {
      console.error('Error deleting solicitacao:', error);
    }
  };

  const handleCreateAtribuicao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditingAtribuicao ? `${API_URL}/frotas/atribuicoes/${editingAtribuicao.id}` : `${API_URL}/frotas/atribuicoes`;
      const method = isEditingAtribuicao ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAtribuicao)
      });
      
      if (response.ok) {
        setShowAtribuicaoModal(false);
        setEditingAtribuicao({});
        setIsEditingAtribuicao(false);
        await fetchData();
      }
    } catch (error) {
      console.error('Error saving atribuicao:', error);
    }
  };

  const handleEditAtribuicao = (atribuicao: any) => {
    setEditingAtribuicao(atribuicao);
    setIsEditingAtribuicao(true);
    setShowAtribuicaoModal(true);
    const condutor = usuarios.find(u => u.id === atribuicao.condutor_id);
    setCondutorAtribuicaoSearch(condutor ? condutor.nome : '');
  };

  const handleDeleteAtribuicao = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar esta atribuição?')) return;
    
    try {
      await fetch(`${API_URL}/frotas/atribuicoes/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (error) {
      console.error('Error deleting atribuicao:', error);
    }
  };

  const getCreateButtonText = () => {
    switch (activeTab) {
      case 'veiculos': return 'Novo Veículo';
      case 'manutencoes': return 'Nova Manutenção';
      case 'abastecimentos': return 'Novo Abastecimento';
      case 'atribuicoes': return 'Nova Atribuição';
      case 'solicitacoes': return 'Nova Solicitação';
      default: return 'Novo';
    }
  };

  const shouldShowCreateButton = () => {
    return activeTab !== 'relatorios';
  };

  const generatePDFReport = () => {
    if (!relatorios) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Dados da Empresa
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Sistema de Gestão Corporativa', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Módulo de Gestão de Frotas', pageWidth / 2, 22, { align: 'center' });
    
    // Título do Relatório
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Frotas', pageWidth / 2, 32, { align: 'center' });
    
    // Data do relatório
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, pageWidth / 2, 38, { align: 'center' });
    
    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, 42, pageWidth - 20, 42);
    
    // Resumo Geral
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 20, 52);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let yPos = 62;
    
    // Veículos
    doc.setFont('helvetica', 'bold');
    doc.text('Total de Veículos:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${relatorios.totalVeiculos} (${relatorios.veiculosAtivos} ativos)`, 80, yPos);
    yPos += 8;
    
    // Manutenções
    doc.setFont('helvetica', 'bold');
    doc.text('Total de Manutenções:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${relatorios.totalManutencoes}`, 80, yPos);
    yPos += 8;
    
    // Abastecimentos
    doc.setFont('helvetica', 'bold');
    doc.text('Total de Abastecimentos:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${relatorios.totalAbastecimentos}`, 80, yPos);
    yPos += 8;
    
    // Total de Litros
    doc.setFont('helvetica', 'bold');
    doc.text('Total de Litros:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${relatorios.totalLitros.toFixed(2)} L`, 80, yPos);
    yPos += 15;
    
    // Custos
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Análise de Custos', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Custo Manutenções
    doc.setFont('helvetica', 'bold');
    doc.text('Custo Total - Manutenções:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kz ${relatorios.custoManutencoes.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 80, yPos);
    yPos += 8;
    
    // Custo Abastecimentos
    doc.setFont('helvetica', 'bold');
    doc.text('Custo Total - Combustível:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kz ${relatorios.custoAbastecimentos.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 80, yPos);
    yPos += 8;
    
    // Custo Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Custo Total Operacional:', 20, yPos);
    doc.text(`Kz ${relatorios.custoTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 80, yPos);
    yPos += 15;
    
    // Estatísticas
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Estatísticas e Médias', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Custo médio por manutenção
    const custoMedioManutencao = relatorios.totalManutencoes > 0 
      ? (relatorios.custoManutencoes / relatorios.totalManutencoes) 
      : 0;
    doc.text(`Custo Médio por Manutenção: Kz ${custoMedioManutencao.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 8;
    
    // Custo médio por abastecimento
    const custoMedioAbastecimento = relatorios.totalAbastecimentos > 0 
      ? (relatorios.custoAbastecimentos / relatorios.totalAbastecimentos) 
      : 0;
    doc.text(`Custo Médio por Abastecimento: Kz ${custoMedioAbastecimento.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 8;
    
    // Litros médios por abastecimento
    const litrosMedios = relatorios.totalAbastecimentos > 0 
      ? (relatorios.totalLitros / relatorios.totalAbastecimentos) 
      : 0;
    doc.text(`Litros Médios por Abastecimento: ${litrosMedios.toFixed(2)} L`, 20, yPos);
    yPos += 8;
    
    // Custo médio por veículo
    const custoMedioVeiculo = relatorios.totalVeiculos > 0 
      ? (relatorios.custoTotal / relatorios.totalVeiculos) 
      : 0;
    doc.text(`Custo Médio por Veículo: Kz ${custoMedioVeiculo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 20, yPos);
    
    // Rodapé
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Sistema de Gestão Corporativa - Módulo de Frotas', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Salvar PDF
    const fileName = `relatorio-frotas-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const canManageFrotas = userProfile?.role === 'admin' || userProfile?.role === 'gestor';
  const isColaboradorRole = userProfile?.role === 'colaborador';

  const filteredSolicitacoes = isColaboradorRole 
    ? solicitacoes.filter(s => s.solicitante_id === userProfile?.id)
    : solicitacoes;

  const filteredVeiculos = veiculos.filter(v => {
    const matchesSearch = v.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.modelo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'manutencao': return 'bg-yellow-100 text-yellow-800';
      case 'inativo': return 'bg-gray-100 text-gray-800';
      case 'abatido': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'manutencao': return 'Manutenção';
      case 'inativo': return 'Inativo';
      case 'abatido': return 'Abatido';
      default: return status;
    }
  };

  const getTipoText = (tipo: string) => {
    switch (tipo) {
      case 'ligeiro': return 'Ligeiro';
      case 'pesado': return 'Pesado';
      case 'moto': return 'Moto';
      case 'outro': return 'Outro';
      default: return tipo;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Frotas</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie veículos, manutenções e abastecimentos</p>
        </div>
        {((canManageFrotas && shouldShowCreateButton()) || (isColaboradorRole && activeTab === 'solicitacoes')) && (
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-2" size={20} />
            {getCreateButtonText()}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {!isColaboradorRole && (
              <button
                onClick={() => setActiveTab('veiculos')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'veiculos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Car className="inline mr-2" size={18} />
                Veículos
              </button>
            )}
            {!isColaboradorRole && (
              <button
                onClick={() => setActiveTab('manutencoes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'manutencoes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Wrench className="inline mr-2" size={18} />
                Manutenções
              </button>
            )}
            {!isColaboradorRole && (
              <button
                onClick={() => setActiveTab('abastecimentos')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'abastecimentos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Fuel className="inline mr-2" size={18} />
                Abastecimentos
              </button>
            )}
            {!isColaboradorRole && (
              <button
                onClick={() => setActiveTab('atribuicoes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'atribuicoes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline mr-2" size={18} />
                Atribuições
              </button>
            )}
            <button
              onClick={() => setActiveTab('solicitacoes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'solicitacoes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ClipboardList className="inline mr-2" size={18} />
              Solicitações
            </button>
            {!isColaboradorRole && (
              <button
                onClick={() => setActiveTab('relatorios')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'relatorios'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="inline mr-2" size={18} />
                Relatórios
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {activeTab === 'veiculos' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="manutencao">Manutenção</option>
                <option value="inativo">Inativo</option>
                <option value="abatido">Abatido</option>
              </select>
            )}
          </div>

          {activeTab === 'veiculos' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veículo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condutor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quilometragem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVeiculos.map((veiculo) => (
                    <tr key={veiculo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Car className="text-blue-600" size={20} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{veiculo.matricula}</div>
                            <div className="text-sm text-gray-500">{veiculo.marca} {veiculo.modelo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getTipoText(veiculo.tipo)}</div>
                        <div className="text-sm text-gray-500">{veiculo.ano}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{veiculo.condutor_nome || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Gauge className="mr-1" size={16} />
                          {veiculo.quilometragem_atual?.toLocaleString('pt-PT')} km
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(veiculo.status)}`}>
                          {getStatusText(veiculo.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedVeiculo(veiculo);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {canManageFrotas && (
                          <>
                            <button
                              onClick={() => handleEditVeiculo(veiculo)}
                              className="text-green-600 hover:text-green-900 mr-3"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteVeiculo(veiculo.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredVeiculos.length === 0 && (
                <div className="text-center py-12">
                  <Car className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum veículo encontrado</h3>
                  <p className="mt-1 text-sm text-gray-500">Comece adicionando um novo veículo à frota.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manutencoes' && (
            <div className="space-y-4">
              {manutencoes.map((manutencao) => (
                <div key={manutencao.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Wrench className="text-orange-500" size={20} />
                        <h3 className="text-sm font-medium text-gray-900">{manutencao.descricao}</h3>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Veículo:</span>
                          <p className="font-medium">{manutencao.veiculo_matricula}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Tipo:</span>
                          <p className="font-medium capitalize">{manutencao.tipo}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Data:</span>
                          <p className="font-medium">{new Date(manutencao.data_manutencao).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Custo:</span>
                          <p className="font-medium">Kz {manutencao.custo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        manutencao.status === 'concluida' ? 'bg-green-100 text-green-800' :
                        manutencao.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                        manutencao.status === 'agendada' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {manutencao.status.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedManutencao(manutencao);
                            setShowManutencaoDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {canManageFrotas && (
                          <>
                            <button
                              onClick={() => handleEditManutencao(manutencao)}
                              className="text-green-600 hover:text-green-900"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteManutencao(manutencao.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {manutencoes.length === 0 && (
                <div className="text-center py-12">
                  <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma manutenção registrada</h3>
                </div>
              )}
            </div>
          )}

          {activeTab === 'abastecimentos' && (
            <div className="space-y-4">
              {abastecimentos.map((abastecimento) => (
                <div key={abastecimento.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Fuel className="text-green-500" size={20} />
                        <h3 className="text-sm font-medium text-gray-900">{abastecimento.veiculo_matricula}</h3>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Data:</span>
                          <p className="font-medium">{new Date(abastecimento.data_abastecimento).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Litros:</span>
                          <p className="font-medium">{abastecimento.litros.toFixed(2)} L</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Combustível:</span>
                          <p className="font-medium capitalize">{abastecimento.tipo_combustivel}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Valor Total:</span>
                          <p className="font-medium">Kz {abastecimento.valor_total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedAbastecimento(abastecimento);
                          setShowAbastecimentoDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalhes"
                      >
                        <Eye size={18} />
                      </button>
                      {canManageFrotas && (
                        <>
                          <button
                            onClick={() => handleEditAbastecimento(abastecimento)}
                            className="text-green-600 hover:text-green-900"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteAbastecimento(abastecimento.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {abastecimentos.length === 0 && (
                <div className="text-center py-12">
                  <Fuel className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum abastecimento registrado</h3>
                </div>
              )}
            </div>
          )}

          {activeTab === 'atribuicoes' && (
            <div className="space-y-4">
              {atribuicoes.map((atribuicao) => (
                <div key={atribuicao.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Users className="text-purple-500" size={20} />
                        <h3 className="text-sm font-medium text-gray-900">{atribuicao.veiculo_matricula}</h3>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Condutor:</span>
                          <p className="font-medium">{atribuicao.condutor_nome}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Data Início:</span>
                          <p className="font-medium">{new Date(atribuicao.data_inicio).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Data Fim:</span>
                          <p className="font-medium">{atribuicao.data_fim ? new Date(atribuicao.data_fim).toLocaleDateString('pt-PT') : 'Em curso'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Km Inicial:</span>
                          <p className="font-medium">{atribuicao.quilometragem_inicial?.toLocaleString('pt-PT')} km</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        atribuicao.data_fim ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {atribuicao.data_fim ? 'Concluída' : 'Ativa'}
                      </span>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => {
                            setSelectedAtribuicao(atribuicao);
                            setShowAtribuicaoDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {canManageFrotas && (
                          <>
                            <button
                              onClick={() => handleEditAtribuicao(atribuicao)}
                              className="text-green-600 hover:text-green-900"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteAtribuicao(atribuicao.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {atribuicoes.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma atribuição registrada</h3>
                </div>
              )}
            </div>
          )}

          {activeTab === 'solicitacoes' && (
            <div className="space-y-4">
              {filteredSolicitacoes.map((solicitacao) => (
                <div key={solicitacao.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <ClipboardList className="text-indigo-500" size={20} />
                        <h3 className="text-sm font-medium text-gray-900">{solicitacao.solicitante_nome}</h3>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Destino:</span>
                          <p className="font-medium">{solicitacao.destino}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Data Início:</span>
                          <p className="font-medium">{new Date(solicitacao.data_inicio).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Data Fim:</span>
                          <p className="font-medium">{new Date(solicitacao.data_fim).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Passageiros:</span>
                          <p className="font-medium">{solicitacao.numero_passageiros}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        solicitacao.status === 'aprovada' ? 'bg-green-100 text-green-800' :
                        solicitacao.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                        solicitacao.status === 'rejeitada' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {solicitacao.status.charAt(0).toUpperCase() + solicitacao.status.slice(1)}
                      </span>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => {
                            setSelectedSolicitacao(solicitacao);
                            setShowSolicitacaoDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {canManageFrotas && (
                          <>
                            <button
                              onClick={() => handleEditSolicitacao(solicitacao)}
                              className="text-green-600 hover:text-green-900"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteSolicitacao(solicitacao.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredSolicitacoes.length === 0 && (
                <div className="text-center py-12">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma solicitação registrada</h3>
                  <p className="mt-1 text-sm text-gray-500">Comece criando uma nova solicitação de viatura.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'relatorios' && relatorios && (
            <div className="space-y-6">
              <div className="flex justify-end mb-4">
                <button
                  onClick={generatePDFReport}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                  <FileDown className="mr-2" size={18} />
                  Gerar PDF
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total de Veículos</p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">{relatorios.totalVeiculos}</p>
                      <p className="text-xs text-blue-600 mt-1">{relatorios.veiculosAtivos} ativos</p>
                    </div>
                    <Car className="text-blue-500" size={40} />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Manutenções</p>
                      <p className="text-3xl font-bold text-orange-900 mt-2">{relatorios.totalManutencoes}</p>
                      <p className="text-xs text-orange-600 mt-1">Kz {relatorios.custoManutencoes.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <Wrench className="text-orange-500" size={40} />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Abastecimentos</p>
                      <p className="text-3xl font-bold text-green-900 mt-2">{relatorios.totalAbastecimentos}</p>
                      <p className="text-xs text-green-600 mt-1">{relatorios.totalLitros.toFixed(2)} L</p>
                    </div>
                    <Fuel className="text-green-500" size={40} />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Custo Total</p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">Kz {(relatorios.custoTotal / 1000).toFixed(1)}K</p>
                      <p className="text-xs text-purple-600 mt-1">Operacional</p>
                    </div>
                    <BarChart3 className="text-purple-500" size={40} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Custos</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Manutenções</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        Kz {relatorios.custoManutencoes.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-3 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Combustível</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        Kz {relatorios.custoAbastecimentos.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-base font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-purple-600">
                        Kz {relatorios.custoTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b">
                      <span className="text-sm text-gray-600">Custo Médio por Manutenção</span>
                      <span className="text-sm font-semibold text-gray-900">
                        Kz {relatorios.totalManutencoes > 0 ? (relatorios.custoManutencoes / relatorios.totalManutencoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-3 border-b">
                      <span className="text-sm text-gray-600">Custo Médio por Abastecimento</span>
                      <span className="text-sm font-semibold text-gray-900">
                        Kz {relatorios.totalAbastecimentos > 0 ? (relatorios.custoAbastecimentos / relatorios.totalAbastecimentos).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-3 border-b">
                      <span className="text-sm text-gray-600">Litros Médios por Abastecimento</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {relatorios.totalAbastecimentos > 0 ? (relatorios.totalLitros / relatorios.totalAbastecimentos).toFixed(2) : '0.00'} L
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-gray-600">Custo Médio por Veículo</span>
                      <span className="text-sm font-bold text-purple-600">
                        Kz {relatorios.totalVeiculos > 0 ? (relatorios.custoTotal / relatorios.totalVeiculos).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{isEditing ? 'Editar Veículo' : 'Novo Veículo'}</h2>
              <button onClick={() => {
                setShowCreateModal(false);
                setEditingVeiculo({});
                setIsEditing(false);
              }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateVeiculo} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula *</label>
                  <input
                    type="text"
                    required
                    value={editingVeiculo.matricula || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, matricula: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    value={editingVeiculo.marca || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, marca: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    value={editingVeiculo.modelo || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, modelo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
                  <input
                    type="number"
                    required
                    value={editingVeiculo.ano || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, ano: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    required
                    value={editingVeiculo.tipo || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    <option value="ligeiro">Ligeiro</option>
                    <option value="pesado">Pesado</option>
                    <option value="moto">Moto</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                  <input
                    type="text"
                    value={editingVeiculo.cor || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, cor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quilometragem Atual</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingVeiculo.quilometragem_atual || 0}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, quilometragem_atual: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <select
                    value={editingVeiculo.departamento_id || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, departamento_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione (opcional)</option>
                    {departamentos.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="relative condutor-autocomplete">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condutor Atual</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={condutorSearch}
                      onChange={(e) => {
                        setCondutorSearch(e.target.value);
                        setShowCondutorDropdown(true);
                        if (!e.target.value) {
                          setEditingVeiculo({ ...editingVeiculo, condutor_atual_id: undefined });
                        }
                      }}
                      onFocus={() => setShowCondutorDropdown(true)}
                      placeholder="Pesquisar condutor..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {condutorSearch && (
                      <button
                        type="button"
                        onClick={handleClearCondutor}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {showCondutorDropdown && condutorSearch && filteredUsuarios.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredUsuarios.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectCondutor(user)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                        >
                          <div className="font-medium text-gray-900">{user.nome}</div>
                          {user.email && (
                            <div className="text-xs text-gray-500">{user.email}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {showCondutorDropdown && condutorSearch && filteredUsuarios.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                      Nenhum condutor encontrado
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número do Chassis</label>
                  <input
                    type="text"
                    value={editingVeiculo.numero_chassis || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, numero_chassis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade do Tanque (L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingVeiculo.capacidade_tanque || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, capacidade_tanque: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consumo Médio (km/L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingVeiculo.consumo_medio || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, consumo_medio: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Aquisição</label>
                  <input
                    type="date"
                    value={editingVeiculo.data_aquisicao || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, data_aquisicao: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Aquisição (Kz)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingVeiculo.valor_aquisicao || ''}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, valor_aquisicao: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingVeiculo.status || 'ativo'}
                    onChange={(e) => setEditingVeiculo({ ...editingVeiculo, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="inativo">Inativo</option>
                    <option value="abatido">Abatido</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={3}
                  value={editingVeiculo.observacoes || ''}
                  onChange={(e) => setEditingVeiculo({ ...editingVeiculo, observacoes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Observações adicionais sobre o veículo..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingVeiculo({});
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {isEditing ? 'Atualizar Veículo' : 'Criar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ManutencaoModal
        show={showManutencaoModal}
        onClose={() => {
          setShowManutencaoModal(false);
          setEditingManutencao({});
          setIsEditingManutencao(false);
        }}
        onSubmit={handleCreateManutencao}
        editingManutencao={editingManutencao}
        setEditingManutencao={setEditingManutencao}
        veiculos={veiculos}
        fornecedores={fornecedores}
        usuarios={usuarios}
        isEditing={isEditingManutencao}
      />

      <AbastecimentoModal
        show={showAbastecimentoModal}
        onClose={() => {
          setShowAbastecimentoModal(false);
          setEditingAbastecimento({});
          setIsEditingAbastecimento(false);
        }}
        onSubmit={handleCreateAbastecimento}
        editingAbastecimento={editingAbastecimento}
        setEditingAbastecimento={setEditingAbastecimento}
        veiculos={veiculos}
        usuarios={usuarios}
        isEditing={isEditingAbastecimento}
      />

      {showAtribuicaoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{isEditingAtribuicao ? 'Editar Atribuição' : 'Nova Atribuição'}</h2>
              <button onClick={() => {
                setShowAtribuicaoModal(false);
                setEditingAtribuicao({});
                setIsEditingAtribuicao(false);
                setCondutorAtribuicaoSearch('');
              }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateAtribuicao} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
                  <select
                    required
                    value={editingAtribuicao.veiculo_id || ''}
                    onChange={(e) => setEditingAtribuicao({ ...editingAtribuicao, veiculo_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um veículo</option>
                    {veiculos.map((v) => (
                      <option key={v.id} value={v.id}>{v.matricula} - {v.marca} {v.modelo}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 relative condutor-atribuicao-autocomplete">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condutor *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={condutorAtribuicaoSearch}
                      onChange={(e) => {
                        setCondutorAtribuicaoSearch(e.target.value);
                        setShowCondutorAtribuicaoDropdown(true);
                        if (!e.target.value) {
                          setEditingAtribuicao({ ...editingAtribuicao, condutor_id: undefined });
                        }
                      }}
                      onFocus={() => setShowCondutorAtribuicaoDropdown(true)}
                      placeholder="Pesquisar condutor..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {condutorAtribuicaoSearch && (
                      <button
                        type="button"
                        onClick={handleClearCondutorAtribuicao}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {showCondutorAtribuicaoDropdown && condutorAtribuicaoSearch && filteredUsuariosAtribuicao.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredUsuariosAtribuicao.map((usuario) => (
                        <button
                          key={usuario.id}
                          type="button"
                          onClick={() => handleSelectCondutorAtribuicao(usuario)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                        >
                          <div className="font-medium text-gray-900">{usuario.nome}</div>
                          {usuario.email && (
                            <div className="text-xs text-gray-500">{usuario.email}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {showCondutorAtribuicaoDropdown && condutorAtribuicaoSearch && filteredUsuariosAtribuicao.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                      Nenhum condutor encontrado
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={editingAtribuicao.data_inicio || ''}
                    onChange={(e) => setEditingAtribuicao({ ...editingAtribuicao, data_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Fim</label>
                  <input
                    type="date"
                    value={editingAtribuicao.data_fim || ''}
                    onChange={(e) => setEditingAtribuicao({ ...editingAtribuicao, data_fim: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quilometragem Inicial *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingAtribuicao.quilometragem_inicial || ''}
                    onChange={(e) => setEditingAtribuicao({ ...editingAtribuicao, quilometragem_inicial: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quilometragem Final</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingAtribuicao.quilometragem_final || ''}
                    onChange={(e) => setEditingAtribuicao({ ...editingAtribuicao, quilometragem_final: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    rows={3}
                    value={editingAtribuicao.observacoes || ''}
                    onChange={(e) => setEditingAtribuicao({ ...editingAtribuicao, observacoes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações sobre a atribuição..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAtribuicaoModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {isEditingAtribuicao ? 'Atualizar Atribuição' : 'Criar Atribuição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSolicitacaoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{isEditingSolicitacao ? 'Editar Solicitação de Viatura' : 'Nova Solicitação de Viatura'}</h2>
              <button onClick={() => {
                setShowSolicitacaoModal(false);
                setEditingSolicitacao({});
                setIsEditingSolicitacao(false);
              }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateSolicitacao} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                  <input
                    type="text"
                    required
                    value={editingSolicitacao.destino || ''}
                    onChange={(e) => setEditingSolicitacao({ ...editingSolicitacao, destino: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Local de destino..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editingSolicitacao.data_inicio || ''}
                    onChange={(e) => setEditingSolicitacao({ ...editingSolicitacao, data_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Fim *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editingSolicitacao.data_fim || ''}
                    onChange={(e) => setEditingSolicitacao({ ...editingSolicitacao, data_fim: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Passageiros *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingSolicitacao.numero_passageiros || ''}
                    onChange={(e) => setEditingSolicitacao({ ...editingSolicitacao, numero_passageiros: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Viatura</label>
                  <select
                    value={editingSolicitacao.tipo_viatura || ''}
                    onChange={(e) => setEditingSolicitacao({ ...editingSolicitacao, tipo_viatura: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Qualquer</option>
                    <option value="ligeiro">Ligeiro</option>
                    <option value="pesado">Pesado</option>
                    <option value="moto">Moto</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da Solicitação *</label>
                  <textarea
                    rows={3}
                    required
                    value={editingSolicitacao.motivo || ''}
                    onChange={(e) => setEditingSolicitacao({ ...editingSolicitacao, motivo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Descreva o motivo da solicitação..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    rows={2}
                    value={editingSolicitacao.observacoes || ''}
                    onChange={(e) => setEditingSolicitacao({ ...editingSolicitacao, observacoes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações adicionais..."
                  />
                </div>
                {canManageFrotas && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={editingSolicitacao.status || 'pendente'}
                        onChange={(e) => setEditingSolicitacao({ ...editingSolicitacao, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="aprovada">Aprovada</option>
                        <option value="atribuida">Atribuída</option>
                        <option value="rejeitada">Rejeitada</option>
                        <option value="concluida">Concluída</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Veículo Atribuído</label>
                      <select
                        value={editingSolicitacao.veiculo_atribuido_id || ''}
                        onChange={(e) => setEditingSolicitacao({ ...editingSolicitacao, veiculo_atribuido_id: e.target.value || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Nenhum veículo atribuído</option>
                        {veiculos.filter(v => v.status === 'ativo').map((v) => (
                          <option key={v.id} value={v.id}>{v.matricula} - {v.marca} {v.modelo}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 relative condutor-solicitacao-autocomplete">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condutor Atribuído</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={condutorSolicitacaoSearch}
                          onChange={(e) => {
                            setCondutorSolicitacaoSearch(e.target.value);
                            setShowCondutorSolicitacaoDropdown(true);
                            if (!e.target.value) {
                              setEditingSolicitacao({ ...editingSolicitacao, condutor_atribuido_id: null });
                            }
                          }}
                          onFocus={() => setShowCondutorSolicitacaoDropdown(true)}
                          placeholder="Pesquisar condutor..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        {condutorSolicitacaoSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSolicitacao({ ...editingSolicitacao, condutor_atribuido_id: null });
                              setCondutorSolicitacaoSearch('');
                              setShowCondutorSolicitacaoDropdown(false);
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      {showCondutorSolicitacaoDropdown && condutorSolicitacaoSearch && usuarios.filter(u => u.nome.toLowerCase().includes(condutorSolicitacaoSearch.toLowerCase())).length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {usuarios.filter(u => u.nome.toLowerCase().includes(condutorSolicitacaoSearch.toLowerCase())).map((usuario) => (
                            <button
                              key={usuario.id}
                              type="button"
                              onClick={() => {
                                setEditingSolicitacao({ ...editingSolicitacao, condutor_atribuido_id: usuario.id });
                                setCondutorSolicitacaoSearch(usuario.nome);
                                setShowCondutorSolicitacaoDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                            >
                              <div className="font-medium text-gray-900">{usuario.nome}</div>
                              {usuario.email && (
                                <div className="text-xs text-gray-500">{usuario.email}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {showCondutorSolicitacaoDropdown && condutorSolicitacaoSearch && usuarios.filter(u => u.nome.toLowerCase().includes(condutorSolicitacaoSearch.toLowerCase())).length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                          Nenhum condutor encontrado
                        </div>
                      )}
                    </div>
                  </>
                )}
                {isColaboradorRole && (editingSolicitacao.veiculo_atribuido_id || editingSolicitacao.condutor_atribuido_id) && (
                  <>
                    {editingSolicitacao.veiculo_atribuido_id && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Veículo Atribuído</label>
                        <input
                          type="text"
                          disabled
                          value={veiculos.find(v => v.id === editingSolicitacao.veiculo_atribuido_id)?.matricula + ' - ' + veiculos.find(v => v.id === editingSolicitacao.veiculo_atribuido_id)?.marca + ' ' + veiculos.find(v => v.id === editingSolicitacao.veiculo_atribuido_id)?.modelo || 'Não atribuído'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    )}
                    {editingSolicitacao.condutor_atribuido_id && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Condutor Atribuído</label>
                        <input
                          type="text"
                          disabled
                          value={usuarios.find(u => u.id === editingSolicitacao.condutor_atribuido_id)?.nome || 'Não atribuído'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSolicitacaoModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {isEditingSolicitacao ? 'Atualizar Solicitação' : 'Criar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSolicitacaoDetailModal && selectedSolicitacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Detalhes da Solicitação</h2>
              <button onClick={() => setShowSolicitacaoDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Solicitante</label>
                  <p className="text-lg font-semibold">{selectedSolicitacao.solicitante_nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                    selectedSolicitacao.status === 'aprovada' ? 'bg-green-100 text-green-800' :
                    selectedSolicitacao.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                    selectedSolicitacao.status === 'rejeitada' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedSolicitacao.status.charAt(0).toUpperCase() + selectedSolicitacao.status.slice(1)}
                  </span>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Destino</label>
                  <p className="text-lg font-semibold">{selectedSolicitacao.destino}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Início</label>
                  <p className="text-lg font-semibold">{new Date(selectedSolicitacao.data_inicio).toLocaleString('pt-PT')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Fim</label>
                  <p className="text-lg font-semibold">{new Date(selectedSolicitacao.data_fim).toLocaleString('pt-PT')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Número de Passageiros</label>
                  <p className="text-lg font-semibold">{selectedSolicitacao.numero_passageiros}</p>
                </div>
                {selectedSolicitacao.tipo_viatura && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tipo de Viatura</label>
                    <p className="text-lg font-semibold capitalize">{selectedSolicitacao.tipo_viatura}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Motivo da Solicitação</label>
                <p className="text-base mt-1">{selectedSolicitacao.motivo}</p>
              </div>
              {selectedSolicitacao.observacoes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="text-base mt-1">{selectedSolicitacao.observacoes}</p>
                </div>
              )}
              {selectedSolicitacao.veiculo_atribuido_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Veículo Atribuído</label>
                  <p className="text-lg font-semibold">
                    {selectedSolicitacao.veiculo_matricula 
                      ? `${selectedSolicitacao.veiculo_matricula} - ${selectedSolicitacao.veiculo_marca} ${selectedSolicitacao.veiculo_modelo}`
                      : 'Veículo não encontrado'}
                  </p>
                </div>
              )}
              {selectedSolicitacao.condutor_atribuido_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Condutor Atribuído</label>
                  <p className="text-lg font-semibold">{selectedSolicitacao.condutor_nome || 'Condutor não encontrado'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAtribuicaoDetailModal && selectedAtribuicao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Detalhes da Atribuição</h2>
              <button onClick={() => setShowAtribuicaoDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Veículo</label>
                  <p className="text-lg font-semibold">{selectedAtribuicao.veiculo_matricula}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Condutor</label>
                  <p className="text-lg font-semibold">{selectedAtribuicao.condutor_nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Início</label>
                  <p className="text-lg font-semibold">{new Date(selectedAtribuicao.data_inicio).toLocaleDateString('pt-PT')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Fim</label>
                  <p className="text-lg font-semibold">{selectedAtribuicao.data_fim ? new Date(selectedAtribuicao.data_fim).toLocaleDateString('pt-PT') : 'Em curso'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quilometragem Inicial</label>
                  <p className="text-lg font-semibold">{selectedAtribuicao.quilometragem_inicial?.toLocaleString('pt-PT')} km</p>
                </div>
                {selectedAtribuicao.quilometragem_final && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quilometragem Final</label>
                    <p className="text-lg font-semibold">{selectedAtribuicao.quilometragem_final.toLocaleString('pt-PT')} km</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                    selectedAtribuicao.data_fim ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedAtribuicao.data_fim ? 'Concluída' : 'Ativa'}
                  </span>
                </div>
                {selectedAtribuicao.quilometragem_final && selectedAtribuicao.quilometragem_inicial && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quilometragem Percorrida</label>
                    <p className="text-lg font-semibold">{(selectedAtribuicao.quilometragem_final - selectedAtribuicao.quilometragem_inicial).toLocaleString('pt-PT')} km</p>
                  </div>
                )}
              </div>
              {selectedAtribuicao.observacoes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="text-base mt-1">{selectedAtribuicao.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showManutencaoDetailModal && selectedManutencao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Detalhes da Manutenção</h2>
              <button onClick={() => setShowManutencaoDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Veículo</label>
                  <p className="text-lg font-semibold">{selectedManutencao.veiculo_matricula}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo</label>
                  <p className="text-lg font-semibold capitalize">{selectedManutencao.tipo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data</label>
                  <p className="text-lg font-semibold">{new Date(selectedManutencao.data_manutencao).toLocaleDateString('pt-PT')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Custo</label>
                  <p className="text-lg font-semibold">Kz {selectedManutencao.custo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                </div>
                {selectedManutencao.quilometragem && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quilometragem</label>
                    <p className="text-lg font-semibold">{selectedManutencao.quilometragem.toLocaleString('pt-PT')} km</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                    selectedManutencao.status === 'concluida' ? 'bg-green-100 text-green-800' :
                    selectedManutencao.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                    selectedManutencao.status === 'agendada' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedManutencao.status.replace('_', ' ')}
                  </span>
                </div>
                {selectedManutencao.fornecedor_nome && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fornecedor</label>
                    <p className="text-lg font-semibold">{selectedManutencao.fornecedor_nome}</p>
                  </div>
                )}
                {selectedManutencao.responsavel_nome && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Responsável</label>
                    <p className="text-lg font-semibold">{selectedManutencao.responsavel_nome}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Descrição</label>
                <p className="text-base mt-1">{selectedManutencao.descricao}</p>
              </div>
              {selectedManutencao.observacoes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="text-base mt-1">{selectedManutencao.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAbastecimentoDetailModal && selectedAbastecimento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Detalhes do Abastecimento</h2>
              <button onClick={() => setShowAbastecimentoDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Veículo</label>
                  <p className="text-lg font-semibold">{selectedAbastecimento.veiculo_matricula}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data e Hora</label>
                  <p className="text-lg font-semibold">{new Date(selectedAbastecimento.data_abastecimento).toLocaleString('pt-PT')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quilometragem</label>
                  <p className="text-lg font-semibold">{selectedAbastecimento.quilometragem.toLocaleString('pt-PT')} km</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo de Combustível</label>
                  <p className="text-lg font-semibold capitalize">{selectedAbastecimento.tipo_combustivel}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Litros</label>
                  <p className="text-lg font-semibold">{selectedAbastecimento.litros.toFixed(2)} L</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Preço por Litro</label>
                  <p className="text-lg font-semibold">Kz {selectedAbastecimento.preco_litro.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Valor Total</label>
                  <p className="text-lg font-semibold">Kz {selectedAbastecimento.valor_total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                </div>
                {selectedAbastecimento.posto && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Posto</label>
                    <p className="text-lg font-semibold">{selectedAbastecimento.posto}</p>
                  </div>
                )}
                {selectedAbastecimento.condutor_nome && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Condutor</label>
                    <p className="text-lg font-semibold">{selectedAbastecimento.condutor_nome}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Tanque Cheio</label>
                  <p className="text-lg font-semibold">{selectedAbastecimento.tanque_cheio ? 'Sim' : 'Não'}</p>
                </div>
              </div>
              {selectedAbastecimento.observacoes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="text-base mt-1">{selectedAbastecimento.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedVeiculo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Detalhes do Veículo</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Matrícula</label>
                  <p className="text-lg font-semibold">{selectedVeiculo.matricula}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Marca/Modelo</label>
                  <p className="text-lg font-semibold">{selectedVeiculo.marca} {selectedVeiculo.modelo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ano</label>
                  <p className="text-lg font-semibold">{selectedVeiculo.ano}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo</label>
                  <p className="text-lg font-semibold">{getTipoText(selectedVeiculo.tipo)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quilometragem</label>
                  <p className="text-lg font-semibold">{selectedVeiculo.quilometragem_atual?.toLocaleString('pt-PT')} km</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedVeiculo.status)}`}>
                    {getStatusText(selectedVeiculo.status)}
                  </span>
                </div>
                {selectedVeiculo.condutor_nome && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Condutor Atual</label>
                    <p className="text-lg font-semibold">{selectedVeiculo.condutor_nome}</p>
                  </div>
                )}
                {selectedVeiculo.departamento_nome && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Departamento</label>
                    <p className="text-lg font-semibold">{selectedVeiculo.departamento_nome}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Frotas;
