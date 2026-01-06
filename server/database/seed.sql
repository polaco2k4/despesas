-- Script de dados iniciais (seed) para o banco DESPESAS
-- SQL Server Express

USE DESPESAS;
GO

-- Limpar dados existentes (cuidado em produção!)
DELETE FROM aprovacoes;
DELETE FROM despesas;
DELETE FROM rubricas;
DELETE FROM orcamentos;
DELETE FROM usuarios;
DELETE FROM departamentos;
DELETE FROM fornecedores;
GO

-- Inserir Departamentos
INSERT INTO departamentos (id, nome, sigla) VALUES
    (NEWID(), 'Tecnologia da Informação', 'TI'),
    (NEWID(), 'Recursos Humanos', 'RH'),
    (NEWID(), 'Financeiro', 'FIN'),
    (NEWID(), 'Operações', 'OPS');
GO

-- Inserir Usuários (senha padrão: 'senha123' - hash SHA256)
DECLARE @deptTI UNIQUEIDENTIFIER = (SELECT id FROM departamentos WHERE sigla = 'TI');
DECLARE @deptRH UNIQUEIDENTIFIER = (SELECT id FROM departamentos WHERE sigla = 'RH');
DECLARE @deptFIN UNIQUEIDENTIFIER = (SELECT id FROM departamentos WHERE sigla = 'FIN');

INSERT INTO usuarios (id, nome, email, password_hash, role, departamento_id) VALUES
    (NEWID(), 'Administrador Sistema', 'admin@empresa.ao', HASHBYTES('SHA2_256', 'senha123'), 'admin', NULL),
    (NEWID(), 'João Silva', 'joao.silva@empresa.ao', HASHBYTES('SHA2_256', 'senha123'), 'gestor', @deptTI),
    (NEWID(), 'Maria Santos', 'maria.santos@empresa.ao', HASHBYTES('SHA2_256', 'senha123'), 'gestor', @deptRH),
    (NEWID(), 'Pedro Costa', 'pedro.costa@empresa.ao', HASHBYTES('SHA2_256', 'senha123'), 'colaborador', @deptTI),
    (NEWID(), 'Ana Ferreira', 'ana.ferreira@empresa.ao', HASHBYTES('SHA2_256', 'senha123'), 'colaborador', @deptFIN);
GO

-- Inserir Orçamentos para 2025
DECLARE @deptTI UNIQUEIDENTIFIER = (SELECT id FROM departamentos WHERE sigla = 'TI');
DECLARE @deptRH UNIQUEIDENTIFIER = (SELECT id FROM departamentos WHERE sigla = 'RH');
DECLARE @deptFIN UNIQUEIDENTIFIER = (SELECT id FROM departamentos WHERE sigla = 'FIN');
DECLARE @deptOPS UNIQUEIDENTIFIER = (SELECT id FROM departamentos WHERE sigla = 'OPS');

INSERT INTO orcamentos (id, departamento_id, ano, valor_total) VALUES
    (NEWID(), @deptTI, 2025, 500000.00),
    (NEWID(), @deptRH, 2025, 300000.00),
    (NEWID(), @deptFIN, 2025, 200000.00),
    (NEWID(), @deptOPS, 2025, 400000.00);
GO

-- Inserir Rubricas
DECLARE @orcTI UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM orcamentos WHERE departamento_id = (SELECT id FROM departamentos WHERE sigla = 'TI') AND ano = 2025);
DECLARE @orcRH UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM orcamentos WHERE departamento_id = (SELECT id FROM departamentos WHERE sigla = 'RH') AND ano = 2025);
DECLARE @orcFIN UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM orcamentos WHERE departamento_id = (SELECT id FROM departamentos WHERE sigla = 'FIN') AND ano = 2025);

INSERT INTO rubricas (id, nome, descricao, valor, orcamento_id) VALUES
    (NEWID(), 'Hardware', 'Aquisição de equipamentos de TI', 200000.00, @orcTI),
    (NEWID(), 'Software', 'Licenças e sistemas', 150000.00, @orcTI),
    (NEWID(), 'Manutenção', 'Manutenção de infraestrutura', 100000.00, @orcTI),
    (NEWID(), 'Formação', 'Treinamento e capacitação', 80000.00, @orcRH),
    (NEWID(), 'Recrutamento', 'Processos seletivos', 120000.00, @orcRH),
    (NEWID(), 'Auditoria', 'Serviços de auditoria', 100000.00, @orcFIN),
    (NEWID(), 'Consultoria', 'Consultoria financeira', 50000.00, @orcFIN);
GO

-- Inserir Fornecedores
INSERT INTO fornecedores (id, nome, nif, email, telefone) VALUES
    (NEWID(), 'TechSupply Lda', '5000123456', 'contato@techsupply.ao', '+244 923 456 789'),
    (NEWID(), 'SoftwarePro Angola', '5000234567', 'vendas@softwarepro.ao', '+244 923 567 890'),
    (NEWID(), 'Consultores Associados', '5000345678', 'info@consultores.ao', '+244 923 678 901');
GO

-- Inserir algumas despesas de exemplo
DECLARE @rubricaHW UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM rubricas WHERE nome = 'Hardware');
DECLARE @rubricaSW UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM rubricas WHERE nome = 'Software');
DECLARE @userPedro UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM usuarios WHERE email = 'pedro.costa@empresa.ao');
DECLARE @userAna UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM usuarios WHERE email = 'ana.ferreira@empresa.ao');
DECLARE @fornecedor1 UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM fornecedores WHERE nome = 'TechSupply Lda');

INSERT INTO despesas (id, rubrica_id, usuario_id, descricao, valor, status, fornecedor_id) VALUES
    (NEWID(), @rubricaHW, @userPedro, 'Aquisição de 10 laptops Dell', 45000.00, 'pendente', @fornecedor1),
    (NEWID(), @rubricaSW, @userPedro, 'Licenças Microsoft Office 365', 12000.00, 'aprovada', NULL),
    (NEWID(), @rubricaHW, @userAna, 'Servidores para datacenter', 85000.00, 'pendente', @fornecedor1);
GO

PRINT 'Dados iniciais inseridos com sucesso!';
PRINT 'Usuário admin: admin@empresa.ao / senha: senha123';
PRINT 'Outros usuários também usam senha: senha123';
