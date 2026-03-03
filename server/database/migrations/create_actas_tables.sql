-- Migration: Create Actas e Reuniões tables
-- Description: Tables for managing meetings, minutes, participants, and action items

-- Meetings table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[reunioes]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[reunioes] (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  titulo NVARCHAR(255) NOT NULL,
  tipo NVARCHAR(50) NOT NULL, -- 'ordinaria', 'extraordinaria', 'conselho', 'departamental'
  data_hora DATETIME2 NOT NULL,
  local NVARCHAR(255),
  departamento_id UNIQUEIDENTIFIER,
  convocador_id UNIQUEIDENTIFIER,
  status NVARCHAR(50) DEFAULT 'agendada', -- 'agendada', 'realizada', 'cancelada'
  agenda NVARCHAR(MAX),
  observacoes NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
  FOREIGN KEY (convocador_id) REFERENCES usuarios(id)
);
END
GO

-- Meeting participants
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[reunioes_participantes]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[reunioes_participantes] (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  reuniao_id UNIQUEIDENTIFIER,
  usuario_id UNIQUEIDENTIFIER,
  tipo NVARCHAR(50) DEFAULT 'participante', -- 'participante', 'presidente', 'secretario'
  presenca NVARCHAR(50), -- 'presente', 'ausente', 'justificado'
  created_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (reuniao_id) REFERENCES reunioes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
END
GO

-- Minutes/Actas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[actas]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[actas] (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  reuniao_id UNIQUEIDENTIFIER,
  numero_acta NVARCHAR(50),
  conteudo NVARCHAR(MAX),
  decisoes NVARCHAR(MAX),
  aprovada BIT DEFAULT 0,
  data_aprovacao DATETIME2,
  aprovador_id UNIQUEIDENTIFIER,
  redator_id UNIQUEIDENTIFIER,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (reuniao_id) REFERENCES reunioes(id) ON DELETE CASCADE,
  FOREIGN KEY (aprovador_id) REFERENCES usuarios(id),
  FOREIGN KEY (redator_id) REFERENCES usuarios(id)
);
END
GO

-- Action items from meetings
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[actas_acoes]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[actas_acoes] (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  acta_id UNIQUEIDENTIFIER,
  descricao NVARCHAR(MAX) NOT NULL,
  responsavel_id UNIQUEIDENTIFIER,
  prazo DATE,
  status NVARCHAR(50) DEFAULT 'pendente', -- 'pendente', 'em_andamento', 'concluida', 'cancelada'
  prioridade NVARCHAR(50) DEFAULT 'media', -- 'baixa', 'media', 'alta', 'urgente'
  observacoes NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (acta_id) REFERENCES actas(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
);
END
GO

-- Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_reunioes_departamento' AND object_id = OBJECT_ID('reunioes'))
CREATE INDEX idx_reunioes_departamento ON reunioes(departamento_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_reunioes_data' AND object_id = OBJECT_ID('reunioes'))
CREATE INDEX idx_reunioes_data ON reunioes(data_hora);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_reunioes_status' AND object_id = OBJECT_ID('reunioes'))
CREATE INDEX idx_reunioes_status ON reunioes(status);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_reunioes_participantes_reuniao' AND object_id = OBJECT_ID('reunioes_participantes'))
CREATE INDEX idx_reunioes_participantes_reuniao ON reunioes_participantes(reuniao_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_reunioes_participantes_usuario' AND object_id = OBJECT_ID('reunioes_participantes'))
CREATE INDEX idx_reunioes_participantes_usuario ON reunioes_participantes(usuario_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_actas_reuniao' AND object_id = OBJECT_ID('actas'))
CREATE INDEX idx_actas_reuniao ON actas(reuniao_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_actas_acoes_acta' AND object_id = OBJECT_ID('actas_acoes'))
CREATE INDEX idx_actas_acoes_acta ON actas_acoes(acta_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_actas_acoes_responsavel' AND object_id = OBJECT_ID('actas_acoes'))
CREATE INDEX idx_actas_acoes_responsavel ON actas_acoes(responsavel_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_actas_acoes_status' AND object_id = OBJECT_ID('actas_acoes'))
CREATE INDEX idx_actas_acoes_status ON actas_acoes(status);
GO
