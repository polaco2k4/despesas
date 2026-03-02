# Scripts SQL para Solicitações de Viatura

Execute os seguintes scripts **NA ORDEM** no SQL Server Management Studio (SSMS):

## 1. Adicionar Campo Condutor
**Arquivo:** `add_condutor_solicitacoes.sql`

Este script adiciona o campo `condutor_atribuido_id` à tabela `solicitacoes_viatura`.

```sql
-- Copie e execute o conteúdo de add_condutor_solicitacoes.sql
```

## 2. Atualizar Status
**Arquivo:** `update_status_solicitacoes.sql`

Este script adiciona a opção "atribuida" ao status das solicitações.

```sql
-- Copie e execute o conteúdo de update_status_solicitacoes.sql
```

## Como Executar no SSMS

1. Abra **SQL Server Management Studio**
2. Conecte-se ao servidor: `localhost\SQLEXPRESS`
3. Abra cada arquivo SQL
4. Pressione **F5** ou clique em **Execute**
5. Verifique se aparece a mensagem de sucesso

## Verificar se Funcionou

Execute esta query para verificar:

```sql
USE DESPESAS;
GO

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'solicitacoes_viatura'
AND COLUMN_NAME IN ('condutor_atribuido_id', 'veiculo_atribuido_id');
```

Deve retornar ambos os campos.

## Após Executar os Scripts

1. **Reinicie o servidor backend** (Ctrl+C e depois `npm run dev`)
2. **Recarregue o frontend** (F5 no navegador)
3. Teste criar/editar uma solicitação e atribuir um condutor

---

**IMPORTANTE:** Sem executar estes scripts, o campo `condutor_atribuido_id` não existe no banco de dados e o condutor não será salvo nem exibido.
