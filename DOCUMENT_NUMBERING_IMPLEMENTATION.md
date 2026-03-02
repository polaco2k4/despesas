# Implementação de Numeração de Documentos

## Resumo da Implementação

Foi implementado um sistema de numeração de documentos no formato `xxxx/sigla/yyyy` para o sistema DESPESAS.

## Alterações Realizadas

### 1. Banco de Dados
- **Arquivo**: `server/database/add_document_numbering.sql`
  - Adicionado campo `numero_documento` à tabela `documentos`
  - Criada tabela `documento_sequencia` para controle sequencial por departamento/ano
  - Índices para performance

### 2. Backend (Controller)
- **Arquivo**: `server/src/controllers/documentosController.ts`
  - Função `generateDocumentNumber()` para criar números no formato `xxxx/sigla/yyyy`
  - Atualização do `createDocumento()` para gerar e salvar número
  - Atualização das queries para incluir `numero_documento`
  - Sistema de sequência automática por departamento e ano

### 3. Frontend (Types)
- **Arquivo**: `src/types/database.ts`
  - Adicionado campo `numero_documento?` à interface `Documento`

### 4. Frontend (UI)
- **Arquivo**: `src/components/Documentos.tsx`
  - Exibição do número do documento na lista (badge azul)
  - Exibição do número no modal de detalhes

## Formato da Numeração

O sistema gera números no formato: `xxxx/sigla/yyyy`

Onde:
- `xxxx`: Número sequencial de 4 dígitos (ex: 0001, 0002)
- `sigla`: Sigla do departamento (ex: FIN, RH, GER)
- `yyyy`: Ano atual (ex: 2025)

**Exemplos:**
- `0001/FIN/2025` - Primeiro documento do departamento Financeiro em 2025
- `0003/RH/2025` - Terceiro documento do departamento RH em 2025
- `0002/GER/2025` - Segundo documento geral em 2025

## Funcionalidades

### Geração Automática
- Número gerado automaticamente na criação de cada documento
- Sequência separada por departamento e ano
- Reinício automático da sequência a cada ano

### Controle de Sequência
- Tabela `documento_sequencia` controla o próximo número
- Evita duplicação e garante continuidade
- Performance otimizada com índices

### Exibição
- Destaque visual na lista de documentos
- Informação destacada no modal de detalhes
- Design integrado com a UI existente

## Instalação

Execute o script SQL para aplicar as alterações no banco de dados:

```sql
-- Executar no SQL Server
-- server/database/add_document_numbering.sql
```

O sistema está pronto para uso após a execução do script e reinicialização do servidor.
