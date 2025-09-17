/*
  # Sistema de Gestão Orçamental - Schema Inicial

  1. Novas Tabelas
    - `departamentos` - Departamentos da empresa
    - `usuarios` - Utilizadores do sistema com papéis
    - `orcamentos` - Orçamentos anuais por departamento
    - `rubricas` - Categorias de despesas dentro dos orçamentos
    - `despesas` - Despesas criadas pelos colaboradores
    - `aprovacoes` - Histórico de aprovações/rejeições

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas baseadas em papéis de utilizador
    - Auditoria automática com timestamps

  3. Dados Iniciais
    - Departamentos: Finanças, Marketing, TI
    - Utilizadores de exemplo com diferentes papéis
    - Orçamentos para 2025
    - Rubricas e despesas de exemplo
*/

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum para papéis de utilizador
CREATE TYPE user_role AS ENUM ('admin', 'gestor', 'colaborador');

-- Enum para status de despesas
CREATE TYPE despesa_status AS ENUM ('pendente', 'aprovada', 'rejeitada');

-- Enum para status de aprovações
CREATE TYPE aprovacao_status AS ENUM ('aprovada', 'rejeitada');

-- Tabela de departamentos
CREATE TABLE IF NOT EXISTS departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de utilizadores
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'colaborador',
  departamento_id uuid REFERENCES departamentos(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id uuid NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  valor_total decimal(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(departamento_id, ano)
);

-- Tabela de rubricas
CREATE TABLE IF NOT EXISTS rubricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  orcamento_id uuid NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de despesas
CREATE TABLE IF NOT EXISTS despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica_id uuid NOT NULL REFERENCES rubricas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor decimal(10,2) NOT NULL,
  status despesa_status NOT NULL DEFAULT 'pendente',
  anexo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de aprovações
CREATE TABLE IF NOT EXISTS aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  despesa_id uuid NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
  aprovado_por uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  status aprovacao_status NOT NULL,
  comentario text,
  aprovado_em timestamptz DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprovacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para departamentos
CREATE POLICY "Todos podem ver departamentos" ON departamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas admin pode criar departamentos" ON departamentos FOR INSERT TO authenticated USING (
  EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin')
);

-- Políticas RLS para usuarios
CREATE POLICY "Utilizadores podem ver próprio perfil e do departamento" ON usuarios FOR SELECT TO authenticated USING (
  usuarios.id = auth.uid() OR 
  EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND (u.role = 'admin' OR (u.role = 'gestor' AND u.departamento_id = usuarios.departamento_id)))
);

CREATE POLICY "Apenas admin pode gerir utilizadores" ON usuarios FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin')
);

-- Políticas RLS para orçamentos
CREATE POLICY "Ver orçamentos do departamento ou admin" ON orcamentos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND 
    (usuarios.role = 'admin' OR usuarios.departamento_id = orcamentos.departamento_id))
);

CREATE POLICY "Gestor e admin podem criar orçamentos" ON orcamentos FOR INSERT TO authenticated USING (
  EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND usuarios.role IN ('admin', 'gestor'))
);

-- Políticas RLS para rubricas
CREATE POLICY "Ver rubricas do departamento ou admin" ON rubricas FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM usuarios u 
    JOIN orcamentos o ON o.id = rubricas.orcamento_id
    WHERE u.id = auth.uid() AND (u.role = 'admin' OR u.departamento_id = o.departamento_id))
);

-- Políticas RLS para despesas
CREATE POLICY "Ver despesas próprias ou do departamento" ON despesas FOR SELECT TO authenticated USING (
  despesas.usuario_id = auth.uid() OR
  EXISTS (SELECT 1 FROM usuarios u 
    JOIN rubricas r ON r.id = despesas.rubrica_id
    JOIN orcamentos o ON o.id = r.orcamento_id
    WHERE u.id = auth.uid() AND (u.role = 'admin' OR (u.role = 'gestor' AND u.departamento_id = o.departamento_id)))
);

CREATE POLICY "Colaboradores podem criar despesas" ON despesas FOR INSERT TO authenticated USING (
  despesas.usuario_id = auth.uid()
);

CREATE POLICY "Pode editar próprias despesas pendentes" ON despesas FOR UPDATE TO authenticated USING (
  despesas.usuario_id = auth.uid() AND despesas.status = 'pendente'
);

-- Políticas RLS para aprovações
CREATE POLICY "Ver aprovações relacionadas" ON aprovacoes FOR SELECT TO authenticated USING (
  aprovacoes.aprovado_por = auth.uid() OR
  EXISTS (SELECT 1 FROM despesas d WHERE d.id = aprovacoes.despesa_id AND d.usuario_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND usuarios.role = 'admin')
);

-- Inserir dados iniciais
INSERT INTO departamentos (nome) VALUES 
  ('Finanças'),
  ('Marketing'),
  ('TI');

-- Inserir utilizadores de exemplo
INSERT INTO usuarios (nome, email, role, departamento_id) VALUES 
  ('Ana Silva', 'ana@empresa.com', 'admin', (SELECT id FROM departamentos WHERE nome = 'Finanças')),
  ('João Santos', 'joao@empresa.com', 'gestor', (SELECT id FROM departamentos WHERE nome = 'Finanças')),
  ('Maria Oliveira', 'maria@empresa.com', 'gestor', (SELECT id FROM departamentos WHERE nome = 'Marketing')),
  ('Carlos Costa', 'carlos@empresa.com', 'colaborador', (SELECT id FROM departamentos WHERE nome = 'Finanças')),
  ('Beatriz Lima', 'beatriz@empresa.com', 'colaborador', (SELECT id FROM departamentos WHERE nome = 'TI'));

-- Inserir orçamentos para 2025
INSERT INTO orcamentos (departamento_id, ano, valor_total) VALUES 
  ((SELECT id FROM departamentos WHERE nome = 'Finanças'), 2025, 100000.00),
  ((SELECT id FROM departamentos WHERE nome = 'Marketing'), 2025, 80000.00),
  ((SELECT id FROM departamentos WHERE nome = 'TI'), 2025, 120000.00);

-- Inserir rubricas
INSERT INTO rubricas (nome, descricao, orcamento_id) VALUES 
  ('Salários', 'Despesas com salários e benefícios', (SELECT id FROM orcamentos JOIN departamentos ON departamentos.id = orcamentos.departamento_id WHERE departamentos.nome = 'Finanças')),
  ('Consultoria', 'Serviços de consultoria externa', (SELECT id FROM orcamentos JOIN departamentos ON departamentos.id = orcamentos.departamento_id WHERE departamentos.nome = 'Finanças')),
  ('Materiais de Escritório', 'Material de escritório e consumíveis', (SELECT id FROM orcamentos JOIN departamentos ON departamentos.id = orcamentos.departamento_id WHERE departamentos.nome = 'Finanças')),
  ('Publicidade', 'Campanhas publicitárias e marketing digital', (SELECT id FROM orcamentos JOIN departamentos ON departamentos.id = orcamentos.departamento_id WHERE departamentos.nome = 'Marketing')),
  ('Eventos', 'Organização de eventos e conferências', (SELECT id FROM orcamentos JOIN departamentos ON departamentos.id = orcamentos.departamento_id WHERE departamentos.nome = 'Marketing')),
  ('Design', 'Serviços de design gráfico e web', (SELECT id FROM orcamentos JOIN departamentos ON departamentos.id = orcamentos.departamento_id WHERE departamentos.nome = 'Marketing')),
  ('Servidores', 'Manutenção e upgrade de servidores', (SELECT id FROM orcamentos JOIN departamentos ON departamentos.id = orcamentos.departamento_id WHERE departamentos.nome = 'TI')),
  ('Software', 'Licenças de software e aplicações', (SELECT id FROM orcamentos JOIN departamentos ON departamentos.id = orcamentos.departamento_id WHERE departamentos.nome = 'TI')),
  ('Licenças', 'Licenças de sistemas operacionais', (SELECT id FROM orcamentos JOIN departamentos ON departamentos.id = orcamentos.departamento_id WHERE departamentos.nome = 'TI'));

-- Inserir despesas de exemplo
INSERT INTO despesas (rubrica_id, usuario_id, descricao, valor, status) VALUES 
  ((SELECT id FROM rubricas WHERE nome = 'Materiais de Escritório'), (SELECT id FROM usuarios WHERE email = 'carlos@empresa.com'), 'Compra de papel e canetas para o escritório', 500.00, 'pendente'),
  ((SELECT id FROM rubricas WHERE nome = 'Software'), (SELECT id FROM usuarios WHERE email = 'beatriz@empresa.com'), 'Licença anual do software de desenvolvimento', 2000.00, 'aprovada'),
  ((SELECT id FROM rubricas WHERE nome = 'Publicidade'), (SELECT id FROM usuarios WHERE email = 'maria@empresa.com'), 'Campanha publicitária no Google Ads', 3500.00, 'pendente');

-- Inserir aprovações de exemplo
INSERT INTO aprovacoes (despesa_id, aprovado_por, role, status, comentario) VALUES 
  ((SELECT id FROM despesas JOIN usuarios ON usuarios.id = despesas.usuario_id WHERE usuarios.email = 'beatriz@empresa.com'), 
   (SELECT id FROM usuarios WHERE email = 'ana@empresa.com'), 
   'admin', 
   'aprovada', 
   'Despesa aprovada - licença necessária para o projeto');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_departamentos_updated_at BEFORE UPDATE ON departamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orcamentos_updated_at BEFORE UPDATE ON orcamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rubricas_updated_at BEFORE UPDATE ON rubricas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON despesas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();