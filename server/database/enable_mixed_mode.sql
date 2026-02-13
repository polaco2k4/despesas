-- Script para habilitar Mixed Mode Authentication no SQL Server
-- IMPORTANTE: Execute este script com privilégios de administrador

USE master;
GO

-- Habilitar autenticação SQL Server (Mixed Mode)
EXEC xp_instance_regwrite 
    N'HKEY_LOCAL_MACHINE', 
    N'Software\Microsoft\MSSQLServer\MSSQLServer',
    N'LoginMode', 
    REG_DWORD, 
    2;
GO

PRINT 'Mixed Mode Authentication habilitado!';
PRINT 'IMPORTANTE: Você precisa REINICIAR o serviço SQL Server para aplicar as mudanças.';
PRINT 'Execute no PowerShell (como Administrador):';
PRINT 'Restart-Service -Name "MSSQL$SQLEXPRESS" -Force';
GO
