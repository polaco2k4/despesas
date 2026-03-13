# Implementação Completa de CRUD para Categorias de Fornecedores

## ✅ Backend Implementado

### 1. Tabela do Banco de Dados
- Arquivo: `server/database/migrations/create_categorias_fornecedores_table.sql`
- Execute este script SQL para criar a tabela

### 2. Controller
- Arquivo: `server/src/controllers/categoriasFornecedoresController.ts`
- Funções: getAll, create, update, delete

### 3. Rotas
- Arquivo: `server/src/routes/categoriasFornecedores.ts`
- Endpoint: `/api/categorias-fornecedores`

### 4. Registro no Servidor
- Arquivo: `server/src/index.ts`
- Rota registrada: `app.use('/api/categorias-fornecedores', categoriasFornecedoresRoutes)`

### 5. API Frontend
- Arquivo: `src/lib/backendApi.ts`
- Exportado: `categoriasFornecedoresAPI`

## 📝 Passos para Completar a Implementação no Frontend

### Passo 1: Executar o script SQL
```bash
# No SQL Server Management Studio ou via comando:
sqlcmd -S localhost -d seu_banco -i server/database/migrations/create_categorias_fornecedores_table.sql
```

### Passo 2: Reiniciar o servidor backend
```bash
cd server
npm run dev
```

### Passo 3: Adicionar as funções no componente Fornecedores.tsx

Adicione após a linha 73 (depois de `fetchData`):

```typescript
const fetchCategorias = async () => {
  try {
    const categoriasData = await categoriasFornecedoresAPI.getAll();
    setCategoriasDB(categoriasData);
  } catch (error) {
    console.error('Error fetching categorias:', error);
  }
};

const handleCreateCategoria = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    if (editingCategoriaId) {
      await categoriasFornecedoresAPI.update(editingCategoriaId, newCategoria);
    } else {
      await categoriasFornecedoresAPI.create(newCategoria);
    }
    
    setShowCategoriaModal(false);
    setEditingCategoriaId(null);
    setNewCategoria({
      nome: '',
      descricao: ''
    });
    await fetchCategorias();
  } catch (error: any) {
    console.error('Error creating/updating categoria:', error);
    const errorMessage = error?.message || 'Erro ao criar/atualizar categoria';
    alert(errorMessage);
  }
};

const handleDeleteCategoria = async (id: string) => {
  if (confirm('Tem certeza que deseja apagar esta categoria?')) {
    try {
      await categoriasFornecedoresAPI.delete(id);
      await fetchCategorias();
    } catch (error: any) {
      console.error('Error deleting categoria:', error);
      const errorMessage = error?.message || 'Erro ao deletar categoria';
      alert(errorMessage);
    }
  }
};
```

### Passo 4: Atualizar o useEffect (linha 60-62)

```typescript
useEffect(() => {
  fetchData();
  fetchCategorias();
}, []);
```

### Passo 5: Substituir a seção "Categorias Tab Content" (por volta da linha 467-494)

Substitua o bloco inteiro `{activeTab === 'categorias' && (` por:

```typescript
{activeTab === 'categorias' && (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-medium text-gray-900">Gestão de Categorias</h3>
      {canManageFornecedores && (
        <button
          onClick={() => setShowCategoriaModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={20} />
          <span>Nova Categoria</span>
        </button>
      )}
    </div>

    <div className="space-y-2">
      {categoriasDB.length > 0 ? (
        categoriasDB.map((categoria) => (
          <div key={categoria.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{categoria.nome}</h4>
              {categoria.descricao && (
                <p className="text-xs text-gray-500 mt-1">{categoria.descricao}</p>
              )}
              <span className="text-xs text-gray-400 mt-1 block">
                {fornecedores.filter(f => f.categoria === categoria.nome).length} fornecedor(es)
              </span>
            </div>
            
            {canManageFornecedores && (
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => {
                    setEditingCategoriaId(categoria.id);
                    setNewCategoria({
                      nome: categoria.nome,
                      descricao: categoria.descricao || ''
                    });
                    setShowCategoriaModal(true);
                  }}
                  className="text-yellow-600 hover:text-yellow-700 p-2 rounded"
                  title="Editar categoria"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDeleteCategoria(categoria.id)}
                  className="text-red-600 hover:text-red-700 p-2 rounded"
                  title="Apagar categoria"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Nenhuma categoria encontrada</p>
          {canManageFornecedores && (
            <button
              onClick={() => setShowCategoriaModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Criar primeira categoria
            </button>
          )}
        </div>
      )}
    </div>
  </div>
)}
```

### Passo 6: Adicionar o Modal de Categoria

Adicione antes do closing `</div>` final do componente (antes da linha com `export default Fornecedores`):

```typescript
{/* Categoria Modal */}
{showCategoriaModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {editingCategoriaId ? 'Editar Categoria' : 'Nova Categoria'}
      </h2>
      
      <form onSubmit={handleCreateCategoria} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome
          </label>
          <input
            type="text"
            value={newCategoria.nome}
            onChange={(e) => setNewCategoria({ ...newCategoria, nome: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome da categoria"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            value={newCategoria.descricao}
            onChange={(e) => setNewCategoria({ ...newCategoria, descricao: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Descrição da categoria (opcional)"
          />
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
          >
            {editingCategoriaId ? 'Atualizar Categoria' : 'Criar Categoria'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCategoriaModal(false);
              setEditingCategoriaId(null);
              setNewCategoria({
                nome: '',
                descricao: ''
              });
            }}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-md transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

## 🎯 Funcionalidades Implementadas

✅ **Criar Categoria** - Adicionar novas categorias com nome e descrição
✅ **Listar Categorias** - Visualizar todas as categorias com contagem de fornecedores
✅ **Editar Categoria** - Modificar nome e descrição de categorias existentes
✅ **Deletar Categoria** - Remover categorias (com validação de uso)
✅ **Validação** - Impede duplicação de nomes e exclusão de categorias em uso

## 🔒 Segurança

- Apenas usuários com role 'admin' ou 'gestor' podem gerenciar categorias
- Validação de duplicatas no backend
- Proteção contra exclusão de categorias em uso

## 📊 Próximos Passos

1. Execute o script SQL
2. Reinicie o servidor
3. Aplique as mudanças no componente Fornecedores.tsx
4. Teste todas as operações CRUD
