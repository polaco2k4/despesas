# 🔧 Correção: Criação de Usuários com Senha

## ❌ Problema Identificado

Ao criar novos usuários através do frontend, a senha estava sendo salva como `NULL` no banco de dados, impedindo o login.

### Causa Raiz
O controller `usuariosController.ts` no backend **não estava processando** o campo `password_hash` enviado pelo frontend, resultando em:
- Senha não sendo inserida no banco de dados
- Campo `password_hash` ficando como `NULL`
- Impossibilidade de fazer login com o usuário criado

---

## ✅ Correção Aplicada

### 1. Instalado Pacote bcrypt
Adicionado ao `server/package.json`:
```json
"dependencies": {
  "bcrypt": "^5.1.1"
}
"devDependencies": {
  "@types/bcrypt": "^5.0.2"
}
```

### 2. Atualizado Controller de Usuários
**Arquivo:** `server/src/controllers/usuariosController.ts`

#### Importação do bcrypt (linha 4):
```typescript
import bcrypt from 'bcrypt';
```

#### Função createUsuario corrigida (linhas 89-123):
```typescript
export const createUsuario = async (req: Request, res: Response) => {
  try {
    const { nome, email, role, departamento_id, password_hash } = req.body;
    
    if (!nome || !email || !role) {
      return res.status(400).json({ error: 'Nome, email e role são obrigatórios' });
    }

    // ✅ NOVO: Validação de senha
    if (!password_hash) {
      return res.status(400).json({ error: 'Senha é obrigatória' });
    }

    // ✅ NOVO: Hash da senha com bcrypt
    const hashedPassword = await bcrypt.hash(password_hash, 10);

    const query = `
      INSERT INTO usuarios (nome, email, role, departamento_id, password_hash)
      OUTPUT INSERTED.id
      VALUES (@nome, @email, @role, @departamento_id, @password_hash)
    `;
    const result = await executeQuery<{ id: string }>(query, {
      nome,
      email,
      role,
      departamento_id,
      password_hash: hashedPassword  // ✅ NOVO: Senha com hash
    });
    
    const usuario = await getUsuarioByIdInternal(result[0].id);
    res.status(201).json(usuario);
  } catch (error) {
    console.error('Error creating usuario:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};
```

---

## 🔄 O Que Mudou

### Antes (❌ Incorreto)
```typescript
// Não recebia password_hash
const { nome, email, role, departamento_id } = req.body;

// Não validava senha
// Não fazia hash da senha

// INSERT sem password_hash
INSERT INTO usuarios (nome, email, role, departamento_id)
VALUES (@nome, @email, @role, @departamento_id)
```

### Depois (✅ Correto)
```typescript
// Recebe password_hash do frontend
const { nome, email, role, departamento_id, password_hash } = req.body;

// Valida se senha foi fornecida
if (!password_hash) {
  return res.status(400).json({ error: 'Senha é obrigatória' });
}

// Faz hash da senha com bcrypt (salt rounds = 10)
const hashedPassword = await bcrypt.hash(password_hash, 10);

// INSERT com password_hash
INSERT INTO usuarios (nome, email, role, departamento_id, password_hash)
VALUES (@nome, @email, @role, @departamento_id, @password_hash)
```

---

## 🧪 Como Testar

### 1. Reiniciar Backend
```powershell
cd server
npm install  # Instalar bcrypt
npm run dev  # Reiniciar servidor
```

### 2. Criar Novo Usuário via Frontend
1. Acessar `http://localhost:5174`
2. Login como admin (`admin@empresa.ao` / `senha123`)
3. Ir para **Usuários**
4. Clicar em **Adicionar Usuário**
5. Preencher formulário:
   - Nome: `Teste Usuario`
   - Email: `teste@empresa.ao`
   - Senha: `teste123` (mínimo 6 caracteres)
   - Confirmar Senha: `teste123`
   - Role: `colaborador`
   - Departamento: Selecionar um
6. Salvar

### 3. Verificar no Banco de Dados
```powershell
sqlcmd -S localhost\SQLEXPRESS -E -C -d DESPESAS -Q "SELECT id, nome, email, role, password_hash FROM usuarios WHERE email = 'teste@empresa.ao'"
```

**Resultado esperado:**
- Campo `password_hash` deve conter um hash bcrypt (começa com `$2b$10$...`)
- **NÃO** deve ser `NULL`

### 4. Testar Login
1. Fazer logout
2. Tentar login com:
   - Email: `teste@empresa.ao`
   - Senha: `teste123`
3. Login deve funcionar ✅

---

## 📊 Fluxo Correto Agora

```
Frontend (Usuarios.tsx)
    ↓
Formulário preenchido:
- nome: "Teste Usuario"
- email: "teste@empresa.ao"  
- password: "teste123"
- confirmPassword: "teste123"
    ↓
usuariosAPI.create({
  nome, email, role, departamento_id,
  password_hash: "teste123"  // Senha em texto plano
})
    ↓
Backend (usuariosController.ts)
    ↓
Validação: senha existe?
    ↓
bcrypt.hash("teste123", 10)
    ↓
Hash gerado: "$2b$10$abc123..."
    ↓
INSERT INTO usuarios (
  nome, email, role, departamento_id,
  password_hash  // Hash bcrypt
)
    ↓
SQL Server Express
    ↓
Usuário criado com senha hash ✅
```

---

## 🔐 Segurança

### Bcrypt
- **Algoritmo:** bcrypt com salt rounds = 10
- **Seguro:** Resistente a ataques de força bruta
- **Padrão da indústria:** Usado por milhões de aplicações

### Exemplo de Hash
```
Senha original: "senha123"
Hash bcrypt: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
```

### Validação no Login
Para validar login, use:
```typescript
const isValid = await bcrypt.compare(senhaDigitada, hashDoBanco);
```

---

## ⚠️ Usuários Existentes com Senha NULL

Se você criou usuários antes da correção, eles terão `password_hash = NULL` e não conseguirão fazer login.

### Solução 1: Recriar Usuários
Deletar e criar novamente via frontend.

### Solução 2: Atualizar Senha Manualmente
```powershell
# Gerar hash para "senha123"
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('senha123', 10).then(hash => console.log(hash));"

# Copiar o hash gerado e executar:
sqlcmd -S localhost\SQLEXPRESS -E -C -d DESPESAS -Q "UPDATE usuarios SET password_hash = '$2b$10$...' WHERE email = 'usuario@empresa.ao'"
```

---

## ✅ Status da Correção

- [x] bcrypt instalado
- [x] Controller atualizado
- [x] Validação de senha adicionada
- [x] Hash de senha implementado
- [x] TypeScript compilando sem erros
- [x] Backend pronto para reiniciar

---

## 📝 Próximos Passos

1. **Reiniciar backend** com as correções
2. **Testar criação** de novo usuário
3. **Verificar hash** no banco de dados
4. **Testar login** com usuário criado
5. **Atualizar usuários antigos** se necessário

---

**Data:** 06/01/2026  
**Status:** ✅ Correção Aplicada - Pronto para Teste  
**Impacto:** Criação de usuários agora funciona corretamente com senha hash
