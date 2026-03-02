import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ManutencaoModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingManutencao: any;
  setEditingManutencao: (data: any) => void;
  veiculos: any[];
  fornecedores?: any[];
  usuarios?: any[];
  isEditing?: boolean;
}

export const ManutencaoModal: React.FC<ManutencaoModalProps> = ({
  show,
  onClose,
  onSubmit,
  editingManutencao,
  setEditingManutencao,
  veiculos,
  fornecedores = [],
  usuarios = [],
  isEditing = false
}) => {
  const [fornecedorSearch, setFornecedorSearch] = useState('');
  const [responsavelSearch, setResponsavelSearch] = useState('');
  const [showFornecedorDropdown, setShowFornecedorDropdown] = useState(false);
  const [showResponsavelDropdown, setShowResponsavelDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.fornecedor-autocomplete')) {
        setShowFornecedorDropdown(false);
      }
      if (!target.closest('.responsavel-autocomplete')) {
        setShowResponsavelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFornecedores = fornecedores.filter(f => 
    f.nome.toLowerCase().includes(fornecedorSearch.toLowerCase())
  );

  const filteredUsuarios = usuarios.filter(u => 
    u.nome.toLowerCase().includes(responsavelSearch.toLowerCase())
  );

  const handleSelectFornecedor = (fornecedor: any) => {
    setEditingManutencao({ ...editingManutencao, fornecedor_id: fornecedor.id });
    setFornecedorSearch(fornecedor.nome);
    setShowFornecedorDropdown(false);
  };

  const handleClearFornecedor = () => {
    setEditingManutencao({ ...editingManutencao, fornecedor_id: undefined });
    setFornecedorSearch('');
    setShowFornecedorDropdown(false);
  };

  const handleSelectResponsavel = (usuario: any) => {
    setEditingManutencao({ ...editingManutencao, responsavel_id: usuario.id });
    setResponsavelSearch(usuario.nome);
    setShowResponsavelDropdown(false);
  };

  const handleClearResponsavel = () => {
    setEditingManutencao({ ...editingManutencao, responsavel_id: undefined });
    setResponsavelSearch('');
    setShowResponsavelDropdown(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{isEditing ? 'Editar Manutenção' : 'Nova Manutenção'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
              <select
                required
                value={editingManutencao.veiculo_id || ''}
                onChange={(e) => setEditingManutencao({ ...editingManutencao, veiculo_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um veículo</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.matricula} - {v.marca} {v.modelo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select
                required
                value={editingManutencao.tipo || ''}
                onChange={(e) => setEditingManutencao({ ...editingManutencao, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                <option value="preventiva">Preventiva</option>
                <option value="corretiva">Corretiva</option>
                <option value="revisao">Revisão</option>
                <option value="inspecao">Inspeção</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input
                type="date"
                required
                value={editingManutencao.data_manutencao || ''}
                onChange={(e) => setEditingManutencao({ ...editingManutencao, data_manutencao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quilometragem</label>
              <input
                type="number"
                step="0.01"
                value={editingManutencao.quilometragem || ''}
                onChange={(e) => setEditingManutencao({ ...editingManutencao, quilometragem: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo (Kz) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={editingManutencao.custo || ''}
                onChange={(e) => setEditingManutencao({ ...editingManutencao, custo: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative fornecedor-autocomplete">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
              <div className="relative">
                <input
                  type="text"
                  value={fornecedorSearch}
                  onChange={(e) => {
                    setFornecedorSearch(e.target.value);
                    setShowFornecedorDropdown(true);
                    if (!e.target.value) {
                      setEditingManutencao({ ...editingManutencao, fornecedor_id: undefined });
                    }
                  }}
                  onFocus={() => setShowFornecedorDropdown(true)}
                  placeholder="Pesquisar fornecedor..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {fornecedorSearch && (
                  <button
                    type="button"
                    onClick={handleClearFornecedor}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {showFornecedorDropdown && fornecedorSearch && filteredFornecedores.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredFornecedores.map((fornecedor) => (
                    <button
                      key={fornecedor.id}
                      type="button"
                      onClick={() => handleSelectFornecedor(fornecedor)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                    >
                      <div className="font-medium text-gray-900">{fornecedor.nome}</div>
                      {fornecedor.nif && (
                        <div className="text-xs text-gray-500">NIF: {fornecedor.nif}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {showFornecedorDropdown && fornecedorSearch && filteredFornecedores.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                  Nenhum fornecedor encontrado
                </div>
              )}
            </div>
            <div className="relative responsavel-autocomplete">
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
              <div className="relative">
                <input
                  type="text"
                  value={responsavelSearch}
                  onChange={(e) => {
                    setResponsavelSearch(e.target.value);
                    setShowResponsavelDropdown(true);
                    if (!e.target.value) {
                      setEditingManutencao({ ...editingManutencao, responsavel_id: undefined });
                    }
                  }}
                  onFocus={() => setShowResponsavelDropdown(true)}
                  placeholder="Pesquisar responsável..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {responsavelSearch && (
                  <button
                    type="button"
                    onClick={handleClearResponsavel}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {showResponsavelDropdown && responsavelSearch && filteredUsuarios.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsuarios.map((usuario) => (
                    <button
                      key={usuario.id}
                      type="button"
                      onClick={() => handleSelectResponsavel(usuario)}
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
              {showResponsavelDropdown && responsavelSearch && filteredUsuarios.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                  Nenhum responsável encontrado
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editingManutencao.status || 'concluida'}
                onChange={(e) => setEditingManutencao({ ...editingManutencao, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="agendada">Agendada</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
              <textarea
                required
                rows={3}
                value={editingManutencao.descricao || ''}
                onChange={(e) => setEditingManutencao({ ...editingManutencao, descricao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva a manutenção realizada..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                rows={2}
                value={editingManutencao.observacoes || ''}
                onChange={(e) => setEditingManutencao({ ...editingManutencao, observacoes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Observações adicionais..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEditing ? 'Atualizar Manutenção' : 'Criar Manutenção'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AbastecimentoModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingAbastecimento: any;
  setEditingAbastecimento: (data: any) => void;
  veiculos: any[];
  usuarios?: any[];
  isEditing?: boolean;
}

export const AbastecimentoModal: React.FC<AbastecimentoModalProps> = ({
  show,
  onClose,
  onSubmit,
  editingAbastecimento,
  setEditingAbastecimento,
  veiculos,
  usuarios = [],
  isEditing = false
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{isEditing ? 'Editar Abastecimento' : 'Novo Abastecimento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
              <select
                required
                value={editingAbastecimento.veiculo_id || ''}
                onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, veiculo_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um veículo</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.matricula} - {v.marca} {v.modelo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora *</label>
              <input
                type="datetime-local"
                required
                value={editingAbastecimento.data_abastecimento || ''}
                onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, data_abastecimento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quilometragem *</label>
              <input
                type="number"
                step="0.01"
                required
                value={editingAbastecimento.quilometragem || ''}
                onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, quilometragem: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Combustível *</label>
              <select
                required
                value={editingAbastecimento.tipo_combustivel || ''}
                onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, tipo_combustivel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                <option value="gasolina">Gasolina</option>
                <option value="diesel">Diesel</option>
                <option value="eletrico">Elétrico</option>
                <option value="hibrido">Híbrido</option>
                <option value="gas">Gás</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Litros *</label>
              <input
                type="number"
                step="0.01"
                required
                value={editingAbastecimento.litros || ''}
                onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, litros: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço por Litro (Kz) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={editingAbastecimento.preco_litro || ''}
                onChange={(e) => {
                  const preco = parseFloat(e.target.value) || 0;
                  const litros = editingAbastecimento.litros || 0;
                  setEditingAbastecimento({ 
                    ...editingAbastecimento, 
                    preco_litro: preco,
                    valor_total: preco * litros
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (Kz) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={editingAbastecimento.valor_total || ''}
                onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, valor_total: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posto</label>
              <input
                type="text"
                value={editingAbastecimento.posto || ''}
                onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, posto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do posto de combustível"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condutor</label>
              <select
                value={editingAbastecimento.condutor_id || ''}
                onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, condutor_id: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione (opcional)</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editingAbastecimento.tanque_cheio || false}
                  onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, tanque_cheio: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Tanque Cheio</span>
              </label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                rows={2}
                value={editingAbastecimento.observacoes || ''}
                onChange={(e) => setEditingAbastecimento({ ...editingAbastecimento, observacoes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Observações adicionais..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEditing ? 'Atualizar Abastecimento' : 'Criar Abastecimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
