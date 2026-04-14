import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Eye,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Download,
  MapPin,
  User
} from 'lucide-react';
import jsPDF from 'jspdf';
import CustomAlert from './CustomAlert';

interface Reuniao {
  id: string;
  titulo: string;
  tipo: 'ordinaria' | 'extraordinaria' | 'conselho' | 'departamental';
  data_hora: string;
  data_hora_fim?: string;
  local?: string;
  departamento_id?: string;
  departamento_nome?: string;
  convocador_id?: string;
  convocador_nome?: string;
  status: 'agendada' | 'realizada' | 'cancelada' | 'expirada';
  agenda?: string;
  observacoes?: string;
  total_participantes?: number;
  total_actas?: number;
  participantes?: any[];
  participantes_externos?: ParticipanteExterno[];
  actas?: any[];
  created_at: string;
  updated_at: string;
}

interface Participante {
  id?: string;
  reuniao_id?: string;
  usuario_id: string;
  usuario_nome?: string;
  usuario_email?: string;
  tipo: 'participante' | 'presidente' | 'secretario';
  presenca?: 'presente' | 'ausente' | 'justificado';
}

interface ParticipanteExterno {
  id?: string;
  reuniao_id?: string;
  nome: string;
  email?: string;
  empresa?: string;
  cargo?: string;
  telefone?: string;
  tipo?: string;
}

interface Acta {
  id: string;
  reuniao_id: string;
  reuniao_titulo?: string;
  reuniao_data?: string;
  numero_acta?: string;
  conteudo: string;
  decisoes?: string;
  aprovada: boolean;
  data_aprovacao?: string;
  aprovador_id?: string;
  aprovador_nome?: string;
  redator_id?: string;
  redator_nome?: string;
  created_at: string;
  updated_at: string;
}

interface Acao {
  id?: string;
  acta_id: string;
  descricao: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  reuniao_titulo?: string;
  numero_acta?: string;
  prazo?: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  observacoes?: string;
}

const API_URL = 'http://localhost:3001/api';

const Actas: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'reunioes' | 'actas' | 'acoes'>('reunioes');
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [actas, setActas] = useState<Acta[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [showReuniaoModal, setShowReuniaoModal] = useState(false);
  const [showActaModal, setShowActaModal] = useState(false);
  const [showAcaoModal, setShowAcaoModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActaDetailModal, setShowActaDetailModal] = useState(false);
  const [showAcaoDetailModal, setShowAcaoDetailModal] = useState(false);
  
  const [selectedReuniao, setSelectedReuniao] = useState<Reuniao | null>(null);
  const [selectedActa, setSelectedActa] = useState<Acta | null>(null);
  const [selectedAcao, setSelectedAcao] = useState<Acao | null>(null);
  
  const [editingReuniao, setEditingReuniao] = useState<Partial<Reuniao>>({});
  const [editingActa, setEditingActa] = useState<Partial<Acta>>({});
  const [editingAcao, setEditingAcao] = useState<Partial<Acao>>({});
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [participantesExternos, setParticipantesExternos] = useState<ParticipanteExterno[]>([]);
  const [acoesActa, setAcoesActa] = useState<Acao[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalParticipant, setExternalParticipant] = useState<Partial<ParticipanteExterno>>({});
  const [responsavelSearchTerm, setResponsavelSearchTerm] = useState('');
  const [showResponsavelDropdown, setShowResponsavelDropdown] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string | string[];
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ isOpen: false, message: '', type: 'info' });
  
  const [isEditing, setIsEditing] = useState(false);

  const showAlert = (message: string | string[], type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
    setAlertConfig({ isOpen: true, message, type, title });
  };

  const closeAlert = () => {
    setAlertConfig({ ...alertConfig, isOpen: false });
  };

  useEffect(() => {
    fetchData();
    fetchDepartamentos();
    fetchUsuarios();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reunioes') {
        const response = await fetch(`${API_URL}/actas/reunioes`, {
          headers: {
            'x-user-id': userProfile?.id || '',
            'x-user-role': userProfile?.role || '',
            'x-user-department-id': userProfile?.departamento_id || ''
          }
        });
        const data = await response.json();
        setReunioes(data);
      } else if (activeTab === 'actas') {
        const response = await fetch(`${API_URL}/actas/actas`, {
          headers: {
            'x-user-id': userProfile?.id || '',
            'x-user-role': userProfile?.role || '',
            'x-user-department-id': userProfile?.departamento_id || ''
          }
        });
        const data = await response.json();
        setActas(data);
      } else if (activeTab === 'acoes') {
        const response = await fetch(`${API_URL}/actas/acoes`, {
          headers: {
            'x-user-id': userProfile?.id || '',
            'x-user-role': userProfile?.role || '',
            'x-user-department-id': userProfile?.departamento_id || ''
          }
        });
        const data = await response.json();
        setAcoes(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartamentos = async () => {
    try {
      const response = await fetch(`${API_URL}/departamentos`, {
        headers: {
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        }
      });
      const data = await response.json();
      setDepartamentos(data);
    } catch (error) {
      console.error('Error fetching departamentos:', error);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        headers: {
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        }
      });
      const data = await response.json();
      setUsuarios(data);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    }
  };

  const handleCreateReuniao = async () => {
    // Validate that meeting date is not in the past
    if (editingReuniao.data_hora) {
      const meetingDate = new Date(editingReuniao.data_hora);
      const now = new Date();
      if (meetingDate < now) {
        showAlert('Não é permitido criar reunião com data e hora anterior à data atual', 'error');
        return;
      }
    }

    // Validate that end date is not in the past
    if (editingReuniao.data_hora_fim) {
      const endDate = new Date(editingReuniao.data_hora_fim);
      const now = new Date();
      if (endDate < now) {
        showAlert('A data de fim não deve ser anterior à data atual', 'error');
        return;
      }
    }

    try {
      const requestData = {
        ...editingReuniao,
        convocador_id: userProfile?.id,
        participantes,
        participantes_externos: participantesExternos
      };
      
      console.log('📤 Enviando dados da reunião:', requestData);
      
      const response = await fetch(`${API_URL}/actas/reunioes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        setShowReuniaoModal(false);
        setEditingReuniao({});
        setParticipantes([]);
        setParticipantesExternos([]);
        fetchData();
        showAlert('Reunião criada com sucesso!', 'success');
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        
        if (response.status === 409 && errorData.conflicts) {
          // Display conflict details
          showAlert(errorData.conflicts, 'warning', 'CONFLITO DE AGENDA DETECTADO');
        } else {
          showAlert(`Erro ao criar reunião: ${errorData.error || 'Erro desconhecido'}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error creating reuniao:', error);
      showAlert('Erro ao criar reunião. Verifique os dados e tente novamente.', 'error');
    }
  };

  const handleUpdateReuniao = async () => {
    if (!selectedReuniao) return;
    
    // Validate that meeting date is not in the past
    if (editingReuniao.data_hora) {
      const meetingDate = new Date(editingReuniao.data_hora);
      const now = new Date();
      if (meetingDate < now) {
        showAlert('Não é permitido editar reunião com data e hora anterior à data atual', 'error');
        return;
      }
    }

    // Validate that end date is not in the past
    if (editingReuniao.data_hora_fim) {
      const endDate = new Date(editingReuniao.data_hora_fim);
      const now = new Date();
      if (endDate < now) {
        showAlert('A data de fim não deve ser anterior à data atual', 'error');
        return;
      }
    }

    try {
      // Check if user is only a participant (not creator or admin)
      const isCreator = editingReuniao.convocador_id === userProfile?.id;
      const isAdmin = userProfile?.role === 'admin';
      const isOnlyParticipant = !isCreator && !isAdmin && 
        participantes.some(p => p.usuario_id === userProfile?.id);
      
      // If user is only a participant, send only participant data
      const requestBody = isOnlyParticipant 
        ? {
            participantes,
            participantes_externos: participantesExternos
          }
        : {
            ...editingReuniao,
            participantes,
            participantes_externos: participantesExternos
          };
      
      const response = await fetch(`${API_URL}/actas/reunioes/${selectedReuniao.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        setShowReuniaoModal(false);
        setSelectedReuniao(null);
        setEditingReuniao({});
        setParticipantes([]);
        setParticipantesExternos([]);
        setIsEditing(false);
        fetchData();
        showAlert('Reunião atualizada com sucesso!', 'success');
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        console.error('Status code:', response.status);
        console.error('Request body:', {
          ...editingReuniao,
          participantes,
          participantes_externos: participantesExternos
        });
        
        if (response.status === 409 && errorData.conflicts) {
          // Display conflict details
          showAlert(errorData.conflicts, 'warning', 'CONFLITO DE AGENDA DETECTADO');
        } else if (response.status === 403) {
          // Show specific permission error
          showAlert(`Permissão negada: ${errorData.error || 'Você não tem permissão para realizar esta ação'}`, 'error');
        } else {
          showAlert(`Erro ao atualizar reunião: ${errorData.error || 'Erro desconhecido'}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error updating reuniao:', error);
      showAlert('Erro ao atualizar reunião. Verifique os dados e tente novamente.', 'error');
    }
  };

  const handleDeleteReuniao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta reunião?')) return;
    
    try {
      const response = await fetch(`${API_URL}/actas/reunioes/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        }
      });
      
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting reuniao:', error);
    }
  };

  const handleCreateActa = async () => {
    try {
      const response = await fetch(`${API_URL}/actas/actas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        },
        body: JSON.stringify({
          ...editingActa,
          redator_id: userProfile?.id,
          acoes: acoesActa
        })
      });
      
      if (response.ok) {
        setShowActaModal(false);
        setEditingActa({});
        setAcoesActa([]);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating acta:', error);
    }
  };

  const handleUpdateActa = async () => {
    if (!selectedActa) return;
    
    try {
      const response = await fetch(`${API_URL}/actas/actas/${selectedActa.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        },
        body: JSON.stringify(editingActa)
      });
      
      if (response.ok) {
        setShowActaModal(false);
        setSelectedActa(null);
        setEditingActa({});
        setIsEditing(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating acta:', error);
    }
  };

  const handleDeleteActa = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta acta?')) return;
    
    try {
      const response = await fetch(`${API_URL}/actas/actas/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        }
      });
      
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting acta:', error);
    }
  };

  const handleCreateAcao = async () => {
    try {
      const response = await fetch(`${API_URL}/actas/acoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        },
        body: JSON.stringify(editingAcao)
      });
      
      if (response.ok) {
        setShowAcaoModal(false);
        setEditingAcao({});
        setIsEditing(false);
        fetchData();
        showAlert('Ação criada com sucesso!', 'success');
      } else {
        showAlert('Erro ao criar ação', 'error');
      }
    } catch (error) {
      console.error('Error creating acao:', error);
      showAlert('Erro ao criar ação', 'error');
    }
  };

  const handleUpdateAcao = async (id: string, updates: Partial<Acao>) => {
    try {
      const response = await fetch(`${API_URL}/actas/acoes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        fetchData();
        showAlert('Ação atualizada com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Error updating acao:', error);
    }
  };

  const handleDeleteAcao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ação?')) return;
    
    try {
      const response = await fetch(`${API_URL}/actas/acoes/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        }
      });
      
      if (response.ok) {
        fetchData();
        showAlert('Ação excluída com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Error deleting acao:', error);
      showAlert('Erro ao excluir ação', 'error');
    }
  };

  const exportActaToPDF = async (acta: Acta) => {
    // Load meeting details including participants
    let meetingParticipants: any[] = [];
    try {
      const response = await fetch(`${API_URL}/actas/reunioes/${acta.reuniao_id}`, {
        headers: {
          'x-user-id': userProfile?.id || '',
          'x-user-role': userProfile?.role || ''
        }
      });
      if (response.ok) {
        const data = await response.json();
        meetingParticipants = data.participantes || [];
      }
    } catch (error) {
      console.error('Error loading participants for PDF:', error);
    }

    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('ACTA DE REUNIÃO', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Número: ${acta.numero_acta || 'N/A'}`, 20, 40);
    doc.text(`Reunião: ${acta.reuniao_titulo || ''}`, 20, 50);
    doc.text(`Data: ${new Date(acta.reuniao_data || '').toLocaleDateString('pt-PT')}`, 20, 60);
    doc.text(`Redator: ${acta.redator_nome || 'N/A'}`, 20, 70);
    
    let yPosition = 85;
    
    // Add participants section
    if (meetingParticipants.length > 0) {
      doc.setFontSize(11);
      doc.text('Participantes:', 20, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      meetingParticipants.forEach((p) => {
        const participantText = `• ${p.usuario_nome || p.usuario_email} (${p.tipo})`;
        doc.text(participantText, 25, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }
    
    doc.setFontSize(11);
    doc.text('Conteúdo:', 20, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    const splitConteudo = doc.splitTextToSize(acta.conteudo || '', 170);
    doc.text(splitConteudo, 20, yPosition);
    yPosition += splitConteudo.length * 5 + 10;
    
    if (acta.decisoes) {
      doc.setFontSize(11);
      doc.text('Decisões:', 20, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      const splitDecisoes = doc.splitTextToSize(acta.decisoes, 170);
      doc.text(splitDecisoes, 20, yPosition);
    }
    
    doc.save(`acta_${acta.numero_acta || acta.id}.pdf`);
  };

  const filteredReunioes = reunioes.filter(r => {
    const matchesSearch = r.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.departamento_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredActas = actas.filter(a => {
    const matchesSearch = a.reuniao_titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.numero_acta?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredAcoes = acoes.filter(a => {
    const matchesSearch = a.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.responsavel_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada':
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'realizada':
      case 'concluida':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      case 'expirada':
        return 'bg-orange-100 text-orange-800';
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'bg-red-100 text-red-800';
      case 'alta':
        return 'bg-orange-100 text-orange-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baixa':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Actas e Reuniões</h1>
        <p className="text-gray-600">Gestão de reuniões, actas e ações</p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('reunioes')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'reunioes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Calendar className="inline mr-2" size={18} />
          Reuniões
        </button>
        <button
          onClick={() => setActiveTab('actas')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'actas'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileText className="inline mr-2" size={18} />
          Actas
        </button>
        <button
          onClick={() => setActiveTab('acoes')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'acoes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <CheckCircle className="inline mr-2" size={18} />
          Ações
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {(activeTab === 'reunioes' || activeTab === 'acoes') && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            {activeTab === 'reunioes' ? (
              <>
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
                <option value="expirada">Expirada</option>
              </>
            ) : (
              <>
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </>
            )}
          </select>
        )}
        
        {activeTab === 'reunioes' && (
          <button
            onClick={() => {
              setShowReuniaoModal(true);
              setEditingReuniao({ status: 'agendada', tipo: 'ordinaria' });
              setParticipantes([]);
              setParticipantesExternos([]);
              setIsEditing(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Reunião
          </button>
        )}
        
        {activeTab === 'actas' && (
          <button
            onClick={() => {
              setShowActaModal(true);
              setEditingActa({});
              setAcoesActa([]);
              setIsEditing(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Acta
          </button>
        )}

        {activeTab === 'acoes' && (
          <button
            onClick={() => {
              setShowAcaoModal(true);
              setEditingAcao({});
              setIsEditing(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Ação
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'reunioes' && (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{width: '200px'}}>Título</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{width: '100px'}}>Tipo</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{width: '140px'}}>Data/Hora</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{width: '140px'}}>Data/Hora Fim</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{width: '100px'}}>Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{width: '80px'}}>Part.</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase" style={{width: '100px'}}>Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReunioes.map((reuniao) => (
                    <tr 
                      key={reuniao.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={async () => {
                        // Load full meeting details including participants
                        try {
                          const response = await fetch(`${API_URL}/actas/reunioes/${reuniao.id}`, {
                            headers: {
                              'x-user-id': userProfile?.id || '',
                              'x-user-role': userProfile?.role || ''
                            }
                          });
                          if (response.ok) {
                            const data = await response.json();
                            setSelectedReuniao(data);
                          } else {
                            setSelectedReuniao(reuniao);
                          }
                        } catch (error) {
                          console.error('Error loading meeting details:', error);
                          setSelectedReuniao(reuniao);
                        }
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {reuniao.titulo.length > 100 ? reuniao.titulo.substring(0, 100) + '...' : reuniao.titulo}
                        </div>
                        {reuniao.local && <div className="text-sm text-gray-500 truncate">{reuniao.local}</div>}
                      </td>
                      <td className="px-3 py-4">
                        <span className="text-sm text-gray-900 capitalize truncate">{reuniao.tipo}</span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {new Date(reuniao.data_hora).toLocaleString('pt-PT', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {reuniao.data_hora_fim ? new Date(reuniao.data_hora_fim).toLocaleString('pt-PT', {
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                      <td className="px-3 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reuniao.status)}`}>
                          {reuniao.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900 text-center">
                        {reuniao.total_participantes || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={async () => {
                            // Load full meeting details including participants
                            try {
                              const response = await fetch(`${API_URL}/actas/reunioes/${reuniao.id}`, {
                                headers: {
                                  'x-user-id': userProfile?.id || '',
                                  'x-user-role': userProfile?.role || ''
                                }
                              });
                              if (response.ok) {
                                const data = await response.json();
                                setSelectedReuniao(data);
                              } else {
                                setSelectedReuniao(reuniao);
                              }
                            } catch (error) {
                              console.error('Error loading meeting details:', error);
                              setSelectedReuniao(reuniao);
                            }
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={async () => {
                            setSelectedReuniao(reuniao);
                            
                            // Convert dates to correct format for datetime-local input
                            const formatDateForInput = (dateStr: string) => {
                              if (!dateStr) return '';
                              // Handle both formats: "2026-03-14 07:30:00" and "2026-03-14T07:30:00.000Z"
                              return dateStr.replace(' ', 'T').slice(0, 16);
                            };
                            
                            setEditingReuniao({
                              ...reuniao,
                              data_hora: formatDateForInput(reuniao.data_hora),
                              data_hora_fim: reuniao.data_hora_fim ? formatDateForInput(reuniao.data_hora_fim) : undefined
                            });
                            setIsEditing(true);
                            
                            // Load participants and external participants for this meeting
                            try {
                              const response = await fetch(`${API_URL}/actas/reunioes/${reuniao.id}`, {
                                headers: {
                                  'x-user-id': userProfile?.id || '',
                                  'x-user-role': userProfile?.role || ''
                                }
                              });
                              if (response.ok) {
                                const data = await response.json();
                                setParticipantes(data.participantes || []);
                                setParticipantesExternos(data.participantes_externos || []);
                              }
                            } catch (error) {
                              console.error('Error loading participants:', error);
                            }
                            
                            setShowReuniaoModal(true);
                          }}
                          disabled={reuniao.status === 'realizada' && userProfile?.role !== 'admin'}
                          className={`mr-3 ${
                            reuniao.status === 'realizada' && userProfile?.role !== 'admin'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-yellow-600 hover:text-yellow-900'
                          }`}
                          title={
                            reuniao.status === 'realizada' && userProfile?.role !== 'admin'
                              ? 'Apenas administradores podem editar reuniões realizadas'
                              : 'Editar reunião'
                          }
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteReuniao(reuniao.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'actas' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reunião</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Reunião</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Redator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aprovada</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredActas.map((acta) => (
                    <tr key={acta.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {acta.numero_acta || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {acta.reuniao_titulo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {acta.reuniao_data ? new Date(acta.reuniao_data).toLocaleDateString('pt-PT') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {acta.redator_nome || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {acta.aprovada ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Sim
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Não
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedActa(acta);
                            setShowActaDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => exportActaToPDF(acta)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedActa(acta);
                            setEditingActa(acta);
                            setIsEditing(true);
                            setShowActaModal(true);
                          }}
                          disabled={acta.aprovada && userProfile?.role !== 'admin'}
                          className={`mr-3 ${
                            acta.aprovada && userProfile?.role !== 'admin'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-yellow-600 hover:text-yellow-900'
                          }`}
                          title={
                            acta.aprovada && userProfile?.role !== 'admin'
                              ? 'Apenas administradores podem editar actas aprovadas'
                              : 'Editar'
                          }
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteActa(acta.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'acoes' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reunião</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prazo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAcoes.map((acao) => (
                    <tr key={acao.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{acao.descricao}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {acao.reuniao_titulo || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {acao.responsavel_nome || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-PT') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(acao.prioridade)}`}>
                          {acao.prioridade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={acao.status}
                          onChange={(e) => acao.id && handleUpdateAcao(acao.id, { status: e.target.value as any })}
                          className={`px-2 py-1 text-xs font-semibold rounded-full border-0 ${getStatusColor(acao.status)}`}
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="concluida">Concluída</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedAcao(acao);
                            setShowAcaoDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAcao(acao);
                            setEditingAcao(acao);
                            setIsEditing(true);
                            setShowAcaoModal(true);
                          }}
                          disabled={acao.status === 'concluida' && userProfile?.role !== 'admin'}
                          className={`mr-3 ${
                            acao.status === 'concluida' && userProfile?.role !== 'admin'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-yellow-600 hover:text-yellow-900'
                          }`}
                          title={
                            acao.status === 'concluida' && userProfile?.role !== 'admin'
                              ? 'Apenas administradores podem editar ações concluídas'
                              : 'Editar ação'
                          }
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => acao.id && handleDeleteAcao(acao.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showReuniaoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{isEditing ? 'Editar Reunião' : 'Nova Reunião'}</h2>
                <button onClick={() => setShowReuniaoModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título * (máx. 50 caracteres)</label>
                  <input
                    type="text"
                    value={editingReuniao.titulo || ''}
                    onChange={(e) => setEditingReuniao({ ...editingReuniao, titulo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={editingReuniao.tipo || 'ordinaria'}
                      onChange={(e) => setEditingReuniao({ ...editingReuniao, tipo: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ordinaria">Ordinária</option>
                      <option value="extraordinaria">Extraordinária</option>
                      <option value="conselho">Conselho</option>
                      <option value="departamental">Departamental</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      value={editingReuniao.status || 'agendada'}
                      onChange={(e) => setEditingReuniao({ ...editingReuniao, status: e.target.value as any })}
                      disabled={
                        editingReuniao.status === 'expirada' || 
                        (isEditing && editingReuniao.convocador_id !== userProfile?.id && userProfile?.role !== 'admin')
                      }
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        editingReuniao.status === 'expirada' || 
                        (isEditing && editingReuniao.convocador_id !== userProfile?.id && userProfile?.role !== 'admin')
                          ? 'bg-gray-100 cursor-not-allowed'
                          : ''
                      }`}
                      title={
                        editingReuniao.status === 'expirada'
                          ? 'Reuniões expiradas não podem ter o status alterado'
                          : isEditing && editingReuniao.convocador_id !== userProfile?.id && userProfile?.role !== 'admin'
                          ? 'Apenas o criador da reunião ou admin pode alterar o status'
                          : ''
                      }
                    >
                      <option value="agendada">Agendada</option>
                      <option value="realizada">Realizada</option>
                      <option value="cancelada">Cancelada</option>
                      <option value="expirada">Expirada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data/Hora Início *</label>
                    <input
                      type="datetime-local"
                      value={editingReuniao.data_hora ? editingReuniao.data_hora.slice(0, 16) : ''}
                      onChange={(e) => setEditingReuniao({ ...editingReuniao, data_hora: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data/Hora Fim</label>
                    <input
                      type="datetime-local"
                      value={editingReuniao.data_hora_fim ? editingReuniao.data_hora_fim.slice(0, 16) : ''}
                      onChange={(e) => setEditingReuniao({ ...editingReuniao, data_hora_fim: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                  <input
                    type="text"
                    value={editingReuniao.local || ''}
                    onChange={(e) => setEditingReuniao({ ...editingReuniao, local: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participantes</label>
                  
                  {/* Selected participants */}
                  {participantes.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {participantes.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          <span>{usuarios.find(u => u.id === p.usuario_id)?.nome || 'Utilizador'}</span>
                          <button
                            type="button"
                            onClick={() => setParticipantes(participantes.filter((_, i) => i !== idx))}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* User search autocomplete */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={userSearchTerm}
                          onChange={(e) => {
                            setUserSearchTerm(e.target.value);
                            setShowUserDropdown(true);
                          }}
                          onFocus={() => setShowUserDropdown(true)}
                          onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                          placeholder="Pesquisar utilizador..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                      </div>
                    </div>
                    
                    {/* Autocomplete dropdown */}
                    {showUserDropdown && userSearchTerm && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {usuarios
                          .filter(u => 
                            !participantes.find(p => p.usuario_id === u.id) &&
                            (u.nome?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                             u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()))
                          )
                          .map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setParticipantes([...participantes, { 
                                  usuario_id: user.id, 
                                  tipo: 'participante' 
                                }]);
                                setUserSearchTerm('');
                                setShowUserDropdown(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-blue-50 flex flex-col border-b last:border-b-0"
                            >
                              <span className="font-medium text-gray-900">{user.nome}</span>
                              <span className="text-sm text-gray-500">{user.email}</span>
                            </button>
                          ))
                        }
                        {usuarios.filter(u => 
                          !participantes.find(p => p.usuario_id === u.id) &&
                          (u.nome?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                           u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()))
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            Nenhum utilizador encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Participant roles */}
                  {participantes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-600">Definir funções dos participantes:</p>
                      {participantes.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 text-gray-700">
                            {usuarios.find(u => u.id === p.usuario_id)?.nome}
                          </span>
                          <select
                            value={p.tipo}
                            onChange={(e) => {
                              const newParticipantes = [...participantes];
                              newParticipantes[idx].tipo = e.target.value as any;
                              setParticipantes(newParticipantes);
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-xs"
                          >
                            <option value="participante">Participante</option>
                            <option value="presidente">Presidente</option>
                            <option value="secretario">Secretário</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* External Participants Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Participantes Externos</label>
                    <button
                      type="button"
                      onClick={() => setShowExternalForm(!showExternalForm)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Adicionar Externo
                    </button>
                  </div>

                  {/* External participants list */}
                  {participantesExternos.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {participantesExternos.map((ext, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm">
                          <div className="flex-1">
                            <div className="font-medium">{ext.nome}</div>
                            {ext.empresa && <div className="text-xs">{ext.empresa}</div>}
                          </div>
                          <button
                            type="button"
                            onClick={() => setParticipantesExternos(participantesExternos.filter((_, i) => i !== idx))}
                            className="text-green-600 hover:text-green-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* External participant form */}
                  {showExternalForm && (
                  <div className="border border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                        <input
                          type="text"
                          value={externalParticipant.nome || ''}
                          onChange={(e) => setExternalParticipant({ ...externalParticipant, nome: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Nome completo"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={externalParticipant.email || ''}
                          onChange={(e) => setExternalParticipant({ ...externalParticipant, email: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
                        <input
                          type="text"
                          value={externalParticipant.empresa || ''}
                          onChange={(e) => setExternalParticipant({ ...externalParticipant, empresa: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Nome da empresa"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cargo</label>
                        <input
                          type="text"
                          value={externalParticipant.cargo || ''}
                          onChange={(e) => setExternalParticipant({ ...externalParticipant, cargo: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Cargo/Função"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                        <input
                          type="text"
                          value={externalParticipant.telefone || ''}
                          onChange={(e) => setExternalParticipant({ ...externalParticipant, telefone: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="+244 900 000 000"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowExternalForm(false);
                          setExternalParticipant({});
                        }}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (externalParticipant.nome) {
                            setParticipantesExternos([...participantesExternos, externalParticipant as ParticipanteExterno]);
                            setExternalParticipant({});
                            setShowExternalForm(false);
                          } else {
                            showAlert('Por favor, preencha o nome do participante externo', 'warning');
                          }
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agenda</label>
                  <textarea
                    value={editingReuniao.agenda || ''}
                    onChange={(e) => setEditingReuniao({ ...editingReuniao, agenda: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={editingReuniao.observacoes || ''}
                    onChange={(e) => setEditingReuniao({ ...editingReuniao, observacoes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowReuniaoModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={isEditing ? handleUpdateReuniao : handleCreateReuniao}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isEditing ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showActaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{isEditing ? 'Editar Acta' : 'Nova Acta'}</h2>
                <button onClick={() => setShowActaModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {!isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reunião *</label>
                    <select
                      value={editingActa.reuniao_id || ''}
                      onChange={async (e) => {
                        const reuniaoId = e.target.value;
                        setEditingActa({ ...editingActa, reuniao_id: reuniaoId });
                        
                        // Load participants for the selected meeting
                        if (reuniaoId) {
                          try {
                            const response = await fetch(`${API_URL}/actas/reunioes/${reuniaoId}`, {
                              headers: {
                                'x-user-id': userProfile?.id || '',
                                'x-user-role': userProfile?.role || ''
                              }
                            });
                            if (response.ok) {
                              const data = await response.json();
                              setParticipantes(data.participantes || []);
                            }
                          } catch (error) {
                            console.error('Error loading participants:', error);
                          }
                        } else {
                          setParticipantes([]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione uma reunião...</option>
                      {reunioes.filter(r => r.status === 'realizada' || r.status === 'agendada').map((reuniao) => (
                        <option key={reuniao.id} value={reuniao.id}>
                          {reuniao.titulo} - {new Date(reuniao.data_hora).toLocaleDateString('pt-PT')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Show participants if meeting is selected */}
                {editingActa.reuniao_id && participantes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Participantes da Reunião</label>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {participantes.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            <span>{usuarios.find(u => u.id === p.usuario_id)?.nome || 'Utilizador'}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              p.tipo === 'presidente' ? 'bg-purple-200 text-purple-900' :
                              p.tipo === 'secretario' ? 'bg-blue-200 text-blue-900' :
                              'bg-gray-200 text-gray-900'
                            }`}>
                              {p.tipo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número da Acta</label>
                  <input
                    type="text"
                    value={editingActa.numero_acta || ''}
                    placeholder={isEditing ? '' : 'Será gerado automaticamente (xxx/yyyy)'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  {!isEditing && (
                    <p className="text-xs text-gray-500 mt-1">O número será gerado automaticamente no formato: número sequencial/ano</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo *</label>
                  <textarea
                    value={editingActa.conteudo || ''}
                    onChange={(e) => setEditingActa({ ...editingActa, conteudo: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Decisões</label>
                  <textarea
                    value={editingActa.decisoes || ''}
                    onChange={(e) => setEditingActa({ ...editingActa, decisoes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {isEditing && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingActa.aprovada || false}
                      onChange={(e) => setEditingActa({ 
                        ...editingActa, 
                        aprovada: e.target.checked,
                        aprovador_id: e.target.checked ? userProfile?.id : undefined
                      })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">Aprovar Acta</label>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowActaModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={isEditing ? handleUpdateActa : handleCreateActa}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isEditing ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Reunião */}
      {showDetailModal && selectedReuniao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Detalhes da Reunião</h2>
                  <p className="text-blue-100 text-sm">{selectedReuniao.titulo}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedReuniao(null);
                  }}
                  className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">

              <div className="space-y-6">
                {/* Informações Principais - Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="text-blue-600" size={18} />
                      <label className="text-sm font-semibold text-blue-900">Data/Hora Início</label>
                    </div>
                    <p className="text-gray-900 font-medium">
                      {new Date(selectedReuniao.data_hora).toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="text-purple-600" size={18} />
                      <label className="text-sm font-semibold text-purple-900">Tipo</label>
                    </div>
                    <p className="text-gray-900 font-medium capitalize">{selectedReuniao.tipo}</p>
                  </div>

                  {selectedReuniao.data_hora_fim && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="text-green-600" size={18} />
                        <label className="text-sm font-semibold text-green-900">Data/Hora Fim</label>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {new Date(selectedReuniao.data_hora_fim).toLocaleString('pt-PT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="text-yellow-600" size={18} />
                      <label className="text-sm font-semibold text-yellow-900">Status</label>
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedReuniao.status === 'agendada' ? 'bg-blue-200 text-blue-900' :
                      selectedReuniao.status === 'realizada' ? 'bg-green-200 text-green-900' :
                      'bg-red-200 text-red-900'
                    }`}>
                      {selectedReuniao.status}
                    </span>
                  </div>
                </div>

                {/* Local e Convocador */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedReuniao.local && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="text-gray-600" size={18} />
                        <label className="text-sm font-semibold text-gray-700">Local</label>
                      </div>
                      <p className="text-gray-900">{selectedReuniao.local}</p>
                    </div>
                  )}
                  {selectedReuniao.convocador_nome && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="text-gray-600" size={18} />
                        <label className="text-sm font-semibold text-gray-700">Convocador</label>
                      </div>
                      <p className="text-gray-900">{selectedReuniao.convocador_nome}</p>
                    </div>
                  )}
                </div>

                {/* Agenda */}
                {selectedReuniao.agenda && (
                  <div className="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="text-blue-600" size={20} />
                      <label className="text-base font-bold text-blue-900">Agenda</label>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedReuniao.agenda}</p>
                  </div>
                )}

                {/* Observações */}
                {selectedReuniao.observacoes && (
                  <div className="bg-amber-50 p-5 rounded-lg border-l-4 border-amber-500">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="text-amber-600" size={20} />
                      <label className="text-base font-bold text-amber-900">Observações</label>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedReuniao.observacoes}</p>
                  </div>
                )}

                {/* Participantes */}
                {selectedReuniao.participantes && selectedReuniao.participantes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Participantes</label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="space-y-2">
                        {selectedReuniao.participantes.map((p: any, idx: number) => (
                          <li key={idx} className="flex items-center justify-between">
                            <span className="text-gray-900">{p.usuario_nome || p.usuario_email}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              p.tipo === 'presidente' ? 'bg-purple-100 text-purple-800' :
                              p.tipo === 'secretario' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {p.tipo}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Participantes Externos */}
                {selectedReuniao.participantes_externos && selectedReuniao.participantes_externos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Participantes Externos</label>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <ul className="space-y-3">
                        {selectedReuniao.participantes_externos.map((ext: any, idx: number) => (
                          <li key={idx} className="border-b border-green-200 pb-2 last:border-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{ext.nome}</p>
                                {ext.email && (
                                  <p className="text-sm text-gray-600">{ext.email}</p>
                                )}
                                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                  {ext.empresa && <span>🏢 {ext.empresa}</span>}
                                  {ext.cargo && <span>💼 {ext.cargo}</span>}
                                  {ext.telefone && <span>📞 {ext.telefone}</span>}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Actas */}
                {selectedReuniao.actas && selectedReuniao.actas.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Actas</label>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {selectedReuniao.actas.map((acta: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div>
                            <p className="font-medium text-gray-900">{acta.numero_acta}</p>
                            <p className="text-sm text-gray-600">
                              Redator: {acta.redator_nome || 'N/A'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            acta.aprovada ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {acta.aprovada ? 'Aprovada' : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedReuniao(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ação */}
      {showAcaoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{isEditing ? 'Editar Ação' : 'Nova Ação'}</h2>
                <button onClick={() => setShowAcaoModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Acta *</label>
                  <select
                    value={editingAcao.acta_id || ''}
                    onChange={(e) => setEditingAcao({ ...editingAcao, acta_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isEditing}
                  >
                    <option value="">Selecione uma acta...</option>
                    {actas.map((acta) => (
                      <option key={acta.id} value={acta.id}>
                        {acta.numero_acta || 'N/A'} - {acta.reuniao_titulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                  <textarea
                    value={editingAcao.descricao || ''}
                    onChange={(e) => setEditingAcao({ ...editingAcao, descricao: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                    <div className="relative">
                      {editingAcao.responsavel_id ? (
                        <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg">
                          <span className="flex-1">
                            {usuarios.find(u => u.id === editingAcao.responsavel_id)?.nome || 'Utilizador'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAcao({ ...editingAcao, responsavel_id: undefined });
                              setResponsavelSearchTerm('');
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <input
                              type="text"
                              value={responsavelSearchTerm}
                              onChange={(e) => {
                                setResponsavelSearchTerm(e.target.value);
                                setShowResponsavelDropdown(true);
                              }}
                              onFocus={() => setShowResponsavelDropdown(true)}
                              onBlur={() => setTimeout(() => setShowResponsavelDropdown(false), 200)}
                              placeholder="Pesquisar responsável..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                          </div>
                          
                          {showResponsavelDropdown && responsavelSearchTerm && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {usuarios
                                .filter(u => 
                                  u.nome?.toLowerCase().includes(responsavelSearchTerm.toLowerCase()) ||
                                  u.email?.toLowerCase().includes(responsavelSearchTerm.toLowerCase())
                                )
                                .map((user) => (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => {
                                      setEditingAcao({ ...editingAcao, responsavel_id: user.id });
                                      setResponsavelSearchTerm('');
                                      setShowResponsavelDropdown(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-blue-50 flex flex-col border-b last:border-b-0"
                                  >
                                    <span className="font-medium text-gray-900">{user.nome}</span>
                                    <span className="text-sm text-gray-500">{user.email}</span>
                                  </button>
                                ))
                              }
                              {usuarios.filter(u => 
                                u.nome?.toLowerCase().includes(responsavelSearchTerm.toLowerCase()) ||
                                u.email?.toLowerCase().includes(responsavelSearchTerm.toLowerCase())
                              ).length === 0 && (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                  Nenhum utilizador encontrado
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                    <input
                      type="date"
                      value={editingAcao.prazo ? new Date(editingAcao.prazo).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingAcao({ ...editingAcao, prazo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                    <select
                      value={editingAcao.prioridade || 'media'}
                      onChange={(e) => setEditingAcao({ ...editingAcao, prioridade: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>

                  {isEditing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={editingAcao.status || 'pendente'}
                        onChange={(e) => setEditingAcao({ ...editingAcao, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluida">Concluída</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={editingAcao.observacoes || ''}
                    onChange={(e) => setEditingAcao({ ...editingAcao, observacoes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAcaoModal(false);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={isEditing ? () => selectedAcao?.id && handleUpdateAcao(selectedAcao.id, editingAcao) : handleCreateAcao}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isEditing ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Ação */}
      {showAcaoDetailModal && selectedAcao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Detalhes da Ação</h2>
                  <p className="text-green-100 text-sm">{selectedAcao.descricao}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAcaoDetailModal(false);
                    setSelectedAcao(null);
                  }}
                  className="text-white hover:bg-green-800 rounded-lg p-2 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informações Principais - Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="text-blue-600" size={18} />
                    <label className="text-sm font-semibold text-blue-900">Acta</label>
                  </div>
                  <p className="text-gray-900 font-medium">
                    {selectedAcao.numero_acta || 'N/A'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-purple-600" size={18} />
                    <label className="text-sm font-semibold text-purple-900">Reunião</label>
                  </div>
                  <p className="text-gray-900 font-medium">{selectedAcao.reuniao_titulo || 'N/A'}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="text-green-600" size={18} />
                    <label className="text-sm font-semibold text-green-900">Responsável</label>
                  </div>
                  <p className="text-gray-900 font-medium">{selectedAcao.responsavel_nome || 'Não atribuído'}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-orange-600" size={18} />
                    <label className="text-sm font-semibold text-orange-900">Prazo</label>
                  </div>
                  <p className="text-gray-900 font-medium">
                    {selectedAcao.prazo ? new Date(selectedAcao.prazo).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : 'Sem prazo definido'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="text-yellow-600" size={18} />
                    <label className="text-sm font-semibold text-yellow-900">Prioridade</label>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedAcao.prioridade === 'urgente' ? 'bg-red-200 text-red-900' :
                    selectedAcao.prioridade === 'alta' ? 'bg-orange-200 text-orange-900' :
                    selectedAcao.prioridade === 'media' ? 'bg-yellow-200 text-yellow-900' :
                    'bg-green-200 text-green-900'
                  }`}>
                    {selectedAcao.prioridade}
                  </span>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="text-indigo-600" size={18} />
                    <label className="text-sm font-semibold text-indigo-900">Status</label>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedAcao.status === 'concluida' ? 'bg-green-200 text-green-900' :
                    selectedAcao.status === 'em_andamento' ? 'bg-blue-200 text-blue-900' :
                    selectedAcao.status === 'cancelada' ? 'bg-gray-200 text-gray-900' :
                    'bg-yellow-200 text-yellow-900'
                  }`}>
                    {selectedAcao.status === 'em_andamento' ? 'Em Andamento' : 
                     selectedAcao.status === 'concluida' ? 'Concluída' :
                     selectedAcao.status === 'cancelada' ? 'Cancelada' : 'Pendente'}
                  </span>
                </div>
              </div>

              {/* Descrição */}
              <div className="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="text-blue-600" size={20} />
                  <label className="text-base font-bold text-blue-900">Descrição</label>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedAcao.descricao}</p>
              </div>

              {/* Observações */}
              {selectedAcao.observacoes && (
                <div className="bg-amber-50 p-5 rounded-lg border-l-4 border-amber-500">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="text-amber-600" size={20} />
                    <label className="text-base font-bold text-amber-900">Observações</label>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedAcao.observacoes}</p>
                </div>
              )}

              {/* Botão Fechar */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAcaoDetailModal(false);
                    setSelectedAcao(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Acta */}
      {showActaDetailModal && selectedActa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Detalhes da Acta</h2>
                  <p className="text-blue-100 text-sm">Acta Nº {selectedActa.numero_acta || 'N/A'}</p>
                </div>
                <button
                  onClick={() => {
                    setShowActaDetailModal(false);
                    setSelectedActa(null);
                  }}
                  className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informações Principais - Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="text-blue-600" size={18} />
                    <label className="text-sm font-semibold text-blue-900">Número da Acta</label>
                  </div>
                  <p className="text-gray-900 font-medium text-lg">
                    {selectedActa.numero_acta || 'N/A'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-purple-600" size={18} />
                    <label className="text-sm font-semibold text-purple-900">Reunião</label>
                  </div>
                  <p className="text-gray-900 font-medium">{selectedActa.reuniao_titulo || 'N/A'}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-green-600" size={18} />
                    <label className="text-sm font-semibold text-green-900">Data da Reunião</label>
                  </div>
                  <p className="text-gray-900 font-medium">
                    {selectedActa.reuniao_data ? new Date(selectedActa.reuniao_data).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : 'N/A'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="text-orange-600" size={18} />
                    <label className="text-sm font-semibold text-orange-900">Redator</label>
                  </div>
                  <p className="text-gray-900 font-medium">{selectedActa.redator_nome || 'N/A'}</p>
                </div>

                {selectedActa.aprovador_nome && (
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border border-teal-200">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="text-teal-600" size={18} />
                      <label className="text-sm font-semibold text-teal-900">Aprovador</label>
                    </div>
                    <p className="text-gray-900 font-medium">{selectedActa.aprovador_nome}</p>
                  </div>
                )}

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="text-yellow-600" size={18} />
                    <label className="text-sm font-semibold text-yellow-900">Status</label>
                  </div>
                  {selectedActa.aprovada ? (
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-200 text-green-900">
                      Aprovada
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-yellow-200 text-yellow-900">
                      Pendente
                    </span>
                  )}
                </div>
              </div>

              {/* Conteúdo */}
              <div className="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="text-blue-600" size={20} />
                  <label className="text-base font-bold text-blue-900">Conteúdo da Acta</label>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedActa.conteudo || 'Sem conteúdo'}</p>
              </div>

              {/* Decisões */}
              {selectedActa.decisoes && (
                <div className="bg-green-50 p-5 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="text-green-600" size={20} />
                    <label className="text-base font-bold text-green-900">Decisões</label>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedActa.decisoes}</p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => exportActaToPDF(selectedActa)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    setShowActaDetailModal(false);
                    setSelectedActa(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Popup */}
      <CustomAlert
        isOpen={alertConfig.isOpen}
        onClose={closeAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
};

export default Actas;
