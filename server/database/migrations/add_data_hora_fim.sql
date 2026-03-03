-- Migration: Add data_hora_fim to reunioes table
-- Description: Add end date/time field to meetings

-- Add data_hora_fim column if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[reunioes]') 
    AND name = 'data_hora_fim'
)
BEGIN
    ALTER TABLE [dbo].[reunioes]
    ADD data_hora_fim DATETIME2;
END
GO

PRINT 'Migration completed: data_hora_fim column added to reunioes table';
