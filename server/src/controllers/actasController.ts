import { Request, Response } from 'express';
import { executeQuery } from '../config/database.js';
import { sanitizeActaFields, detectMaliciousPatterns } from '../utils/sanitize.js';

const WEBHOOK_URL = 'https://hook.eu2.make.com/x9t6rnvlq94vt3y7d65t99rdyyknu175';

const sendToWebhook = async (data: any) => {
  try {
    console.log('📤 Sending to webhook:', JSON.stringify(data, null, 2));
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ Webhook error:', response.status, response.statusText);
      console.error('Response body:', responseText);
    } else {
      console.log('✅ Webhook sent successfully');
      console.log('Response:', responseText);
    }
  } catch (error) {
    console.error('❌ Error sending to webhook:', error);
  }
};

export const getAllReunioes = async (req: Request, res: Response) => {
  try {
    const { departamento_id, status, data_inicio, data_fim } = req.query;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Primeiro, atualizar reuniões expiradas
    const updateExpiredQuery = `
      UPDATE reunioes
      SET status = 'expirada',
          updated_at = GETDATE()
      WHERE status = 'agendada'
        AND (
          (data_hora_fim IS NOT NULL AND data_hora_fim < GETDATE())
          OR
          (data_hora_fim IS NULL AND DATEADD(HOUR, 2, data_hora) < GETDATE())
        )
    `;
    
    await executeQuery(updateExpiredQuery);
    
    let query = `
      SELECT 
        r.*,
        d.nome as departamento_nome,
        u.nome as convocador_nome,
        (SELECT COUNT(*) FROM reunioes_participantes rp WHERE rp.reuniao_id = r.id) as total_participantes
      FROM reunioes r
      LEFT JOIN departamentos d ON r.departamento_id = d.id
      LEFT JOIN usuarios u ON r.convocador_id = u.id
      WHERE 1=1
    `;
    
    const params: Record<string, any> = {};
    
    // Colaborador only sees meetings they participate in
    if (userRole === 'colaborador' && userId) {
      query += ` AND EXISTS (
        SELECT 1 FROM reunioes_participantes rp 
        WHERE rp.reuniao_id = r.id AND rp.usuario_id = @user_id
      )`;
      params.user_id = userId;
    }
    
    if (departamento_id) {
      query += ` AND r.departamento_id = @departamento_id`;
      params.departamento_id = departamento_id;
    }
    
    if (status) {
      query += ` AND r.status = @status`;
      params.status = status;
    }
    
    if (data_inicio) {
      query += ` AND r.data_hora >= @data_inicio`;
      params.data_inicio = data_inicio;
    }
    
    if (data_fim) {
      query += ` AND r.data_hora <= @data_fim`;
      params.data_fim = data_fim;
    }
    
    query += ` ORDER BY r.data_hora DESC`;
    
    const result = await executeQuery(query, Object.keys(params).length > 0 ? params : undefined);
    return res.json(result);
  } catch (error) {
    console.error('Error fetching reunioes:', error);
    return res.status(500).json({ error: 'Erro ao buscar reuniões' });
  }
};

export const getReuniaoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const reuniaoQuery = `
      SELECT 
        r.*,
        d.nome as departamento_nome,
        u.nome as convocador_nome
      FROM reunioes r
      LEFT JOIN departamentos d ON r.departamento_id = d.id
      LEFT JOIN usuarios u ON r.convocador_id = u.id
      WHERE r.id = @id
    `;
    
    const participantesQuery = `
      SELECT 
        rp.*,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM reunioes_participantes rp
      LEFT JOIN usuarios u ON rp.usuario_id = u.id
      WHERE rp.reuniao_id = @id
      ORDER BY rp.tipo DESC, u.nome
    `;
    
    const participantesExternosQuery = `
      SELECT * FROM reunioes_participantes_externos
      WHERE reuniao_id = @id
      ORDER BY nome
    `;
    
    const actasQuery = `
      SELECT 
        a.*,
        u1.nome as redator_nome,
        u2.nome as aprovador_nome
      FROM actas a
      LEFT JOIN usuarios u1 ON a.redator_id = u1.id
      LEFT JOIN usuarios u2 ON a.aprovador_id = u2.id
      WHERE a.reuniao_id = @id
    `;
    
    const [reuniaoResult, participantesResult, participantesExternosResult, actasResult] = await Promise.all([
      executeQuery(reuniaoQuery, { id }),
      executeQuery(participantesQuery, { id }),
      executeQuery(participantesExternosQuery, { id }),
      executeQuery(actasQuery, { id })
    ]);
    
    if (reuniaoResult.length === 0) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }
    
    const reuniao = {
      ...reuniaoResult[0],
      participantes: participantesResult,
      participantes_externos: participantesExternosResult,
      actas: actasResult
    };
    
    return res.json(reuniao);
  } catch (error) {
    console.error('Error fetching reuniao:', error);
    return res.status(500).json({ error: 'Erro ao buscar reunião' });
  }
};

export const createReuniao = async (req: Request, res: Response) => {
  try {
    console.log('📝 Creating reunião with body:', JSON.stringify(req.body, null, 2));
    
    const {
      titulo,
      tipo,
      data_hora,
      data_hora_fim,
      local,
      departamento_id,
      convocador_id,
      agenda,
      observacoes,
      participantes,
      participantes_externos
    } = req.body;
    
    console.log('🔍 DEBUG - convocador_id recebido:', convocador_id);
    console.log('🔍 DEBUG - Headers:', { userId: req.headers['x-user-id'], userRole: req.headers['x-user-role'] });
    
    if (!titulo || !tipo || !data_hora) {
      console.error('❌ Missing required fields:', { titulo, tipo, data_hora });
      return res.status(400).json({ error: 'Campos obrigatórios: titulo, tipo, data_hora' });
    }
    
    // Format dates for SQL Server (keep WAT timezone, no UTC conversion)
    let formattedDate = data_hora;
    if (typeof data_hora === 'string') {
      // Format: "2026-03-14T06:30" -> "2026-03-14 06:30:00"
      formattedDate = data_hora.replace('T', ' ') + ':00';
    }
    
    let formattedDateFim = null;
    if (data_hora_fim) {
      if (typeof data_hora_fim === 'string') {
        // Format: "2026-03-14T08:30" -> "2026-03-14 08:30:00"
        formattedDateFim = data_hora_fim.replace('T', ' ') + ':00';
      } else {
        formattedDateFim = data_hora_fim;
      }
    }
    
    // Check for conflicts if participants are provided
    if (participantes && participantes.length > 0 && local) {
      const conflictQuery = `
        SELECT DISTINCT 
          u.nome as usuario_nome,
          u.email as usuario_email,
          r.titulo as reuniao_titulo,
          r.data_hora,
          r.local
        FROM reunioes r
        INNER JOIN reunioes_participantes rp ON r.id = rp.reuniao_id
        INNER JOIN usuarios u ON rp.usuario_id = u.id
        WHERE r.data_hora = @data_hora
          AND r.local = @local
          AND r.status != 'cancelada'
          AND rp.usuario_id IN (${participantes.map((p: any, idx: number) => `@usuario_${idx}`).join(', ')})
      `;
      
      const conflictParams: any = {
        data_hora: formattedDate,
        local: local
      };
      
      participantes.forEach((p: any, idx: number) => {
        conflictParams[`usuario_${idx}`] = p.usuario_id;
      });
      
      const conflicts = await executeQuery(conflictQuery, conflictParams);
      
      if (conflicts.length > 0) {
        const conflictMessages = conflicts.map((c: any) => 
          `${c.usuario_nome} já tem reunião "${c.reuniao_titulo}" no mesmo horário e local`
        );
        
        console.error('⚠️ Meeting conflicts detected:', conflicts);
        return res.status(409).json({ 
          error: 'Conflito de agenda detectado',
          conflicts: conflictMessages
        });
      }
    }
    
    const reuniaoQuery = `
      INSERT INTO reunioes (
        titulo, tipo, data_hora, data_hora_fim, local, departamento_id, 
        convocador_id, agenda, observacoes
      )
      OUTPUT INSERTED.*
      VALUES (
        @titulo, @tipo, @data_hora, @data_hora_fim, @local, @departamento_id, 
        @convocador_id, @agenda, @observacoes
      )
    `;
    
    const params = {
      titulo,
      tipo,
      data_hora: formattedDate,
      data_hora_fim: formattedDateFim,
      local: local || null,
      departamento_id: departamento_id || null,
      convocador_id: convocador_id || req.headers['x-user-id'] || null,
      agenda: agenda || null,
      observacoes: observacoes || null
    };
    
    console.log('🔍 Query params:', JSON.stringify(params, null, 2));
    
    const reuniaoResult = await executeQuery(reuniaoQuery, params);
    
    console.log('✅ Reunião created:', reuniaoResult[0]);
    
    const reuniao = reuniaoResult[0];
    
    if (participantes && participantes.length > 0) {
      console.log(`👥 Adding ${participantes.length} participantes...`);
      for (const participante of participantes) {
        const participantesQuery = `
          INSERT INTO reunioes_participantes (reuniao_id, usuario_id, tipo)
          VALUES (@reuniao_id, @usuario_id, @tipo)
        `;
        
        await executeQuery(participantesQuery, {
          reuniao_id: reuniao.id,
          usuario_id: participante.usuario_id,
          tipo: participante.tipo || 'participante'
        });
      }
    }
    
    // Add external participants if provided
    if (participantes_externos && participantes_externos.length > 0) {
      console.log(`🌍 Adding ${participantes_externos.length} external participantes...`);
      for (const externo of participantes_externos) {
        const externosQuery = `
          INSERT INTO reunioes_participantes_externos (reuniao_id, nome, email, empresa, cargo, telefone, tipo)
          VALUES (@reuniao_id, @nome, @email, @empresa, @cargo, @telefone, @tipo)
        `;
        
        await executeQuery(externosQuery, {
          reuniao_id: reuniao.id,
          nome: externo.nome,
          email: externo.email || null,
          empresa: externo.empresa || null,
          cargo: externo.cargo || null,
          telefone: externo.telefone || null,
          tipo: externo.tipo || 'convidado'
        });
      }
    }
    
    // Fetch complete meeting data with participants for webhook
    const completeReuniaoQuery = `
      SELECT 
        r.*,
        d.nome as departamento_nome,
        u.nome as convocador_nome,
        u.email as convocador_email
      FROM reunioes r
      LEFT JOIN departamentos d ON r.departamento_id = d.id
      LEFT JOIN usuarios u ON r.convocador_id = u.id
      WHERE r.id = @id
    `;
    
    const participantesCompleteQuery = `
      SELECT 
        rp.*,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM reunioes_participantes rp
      LEFT JOIN usuarios u ON rp.usuario_id = u.id
      WHERE rp.reuniao_id = @id
    `;
    
    const participantesExternosQuery = `
      SELECT * FROM reunioes_participantes_externos
      WHERE reuniao_id = @id
    `;
    
    const [completeReuniao, participantesComplete, participantesExternosComplete] = await Promise.all([
      executeQuery(completeReuniaoQuery, { id: reuniao.id }),
      executeQuery(participantesCompleteQuery, { id: reuniao.id }),
      executeQuery(participantesExternosQuery, { id: reuniao.id })
    ]);
    
    // Combine internal and external participants
    const allParticipantes = [
      ...participantesComplete.map((p: any) => ({
        ...p,
        tipo_participante: 'interno'
      })),
      ...participantesExternosComplete.map((p: any) => ({
        ...p,
        tipo_participante: 'externo'
      }))
    ];
    
    // Extract all emails from participants in simplified format
    const attendees = [
      ...participantesComplete.map((p: any) => ({
        email: p.usuario_email
      })).filter((attendee: any) => attendee.email),
      ...participantesExternosComplete.map((p: any) => ({
        email: p.email
      })).filter((attendee: any) => attendee.email)
    ];
    
    // Create additional email formats for different Make.com modules
    const emailAddresses = attendees.map(a => a.email);
    const emailList = emailAddresses.join(', ');
    const toRecipients = attendees.map(a => ({
      emailAddress: {
        address: a.email
      }
    }));
    
    // Send dates as stored in database (WAT timezone)
    // Database stores: "2026-03-14 06:30:00" (WAT)
    // Send as: "2026-03-14 06:30:00" (same format)
    const startDate = completeReuniao[0].data_hora;
    const endDate = completeReuniao[0].data_hora_fim 
      ? completeReuniao[0].data_hora_fim
      : (() => {
          // Add 1 hour to start time for default end time
          const [datePart, timePart] = completeReuniao[0].data_hora.split(' ');
          const [hours, minutes] = timePart.split(':');
          const newHours = String(parseInt(hours) + 1).padStart(2, '0');
          return `${datePart} ${newHours}:${minutes}:00`;
        })();
    
    console.log('🔍 Debug - Start Date:', startDate);
    console.log('🔍 Debug - End Date:', endDate);
    console.log('🔍 Debug - Attendees count:', attendees.length);
    console.log('🔍 Debug - Attendees:', JSON.stringify(attendees, null, 2));
    
    // Send to webhook with all fields
    const webhookData = {
      action: 'created',
      // MS Teams Online Meeting fields (only these are sent to MS Teams module)
      msTeams: {
        subject: completeReuniao[0].titulo || 'Reunião',
        startDateTime: startDate,
        endDateTime: endDate
      },
      // Additional fields for other Make.com modules
      attendees: attendees,
      emailAddresses: emailAddresses,
      emailList: emailList,
      toRecipients: toRecipients,
      // All meeting fields
      id: completeReuniao[0].id,
      titulo: completeReuniao[0].titulo,
      tipo: completeReuniao[0].tipo,
      data_hora: completeReuniao[0].data_hora,
      data_hora_fim: completeReuniao[0].data_hora_fim,
      local: completeReuniao[0].local,
      departamento_id: completeReuniao[0].departamento_id,
      departamento_nome: completeReuniao[0].departamento_nome,
      convocador_id: completeReuniao[0].convocador_id,
      convocador_nome: completeReuniao[0].convocador_nome,
      convocador_email: completeReuniao[0].convocador_email,
      agenda: completeReuniao[0].agenda,
      observacoes: completeReuniao[0].observacoes,
      status: completeReuniao[0].status,
      created_at: completeReuniao[0].created_at,
      updated_at: completeReuniao[0].updated_at,
      participantes: allParticipantes
    };
    
    sendToWebhook(webhookData).catch(err => 
      console.error('Webhook error (non-blocking):', err)
    );
    
    return res.status(201).json(reuniao);
  } catch (error: any) {
    console.error('❌ Error creating reuniao:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return res.status(500).json({ 
      error: 'Erro ao criar reunião',
      details: error.message 
    });
  }
};

export const updateReuniao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      tipo,
      data_hora,
      data_hora_fim,
      local,
      departamento_id,
      status,
      agenda,
      observacoes,
      participantes,
      participantes_externos
    } = req.body;
    
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Get meeting info and check permissions
    const reuniaoCheck = await executeQuery(
      'SELECT convocador_id, status as current_status FROM reunioes WHERE id = @id',
      { id }
    );
    
    if (reuniaoCheck.length === 0) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }
    
    const isCreator = reuniaoCheck[0].convocador_id === userId;
    const isAdmin = userRole === 'admin';
    const currentStatus = reuniaoCheck[0].current_status;
    
    // Check if meeting is 'realizada' - only admin can edit
    if (currentStatus === 'realizada' && !isAdmin) {
      return res.status(403).json({ 
        error: 'Apenas administradores podem editar reuniões com status "realizada"' 
      });
    }
    
    // Check if user is a participant
    const participantCheck = await executeQuery(
      'SELECT COUNT(*) as count FROM reunioes_participantes WHERE reuniao_id = @id AND usuario_id = @userId',
      { id, userId }
    );
    const isParticipant = participantCheck[0].count > 0;
    
    // Check if status is being CHANGED (not just sent) and validate permissions
    if (status !== undefined && status !== currentStatus) {
      if (!isCreator && !isAdmin) {
        return res.status(403).json({ 
          error: 'Apenas o criador da reunião ou administrador pode alterar o status' 
        });
      }
    }
    
    // Check if user can update the meeting
    // Participants can only add other participants, not change other fields
    if (!isCreator && !isAdmin && !isParticipant) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para editar esta reunião' 
      });
    }
    
    // If user is only a participant (not creator or admin), only allow adding participants
    if (isParticipant && !isCreator && !isAdmin) {
      if (titulo !== undefined || tipo !== undefined || data_hora !== undefined || 
          data_hora_fim !== undefined || local !== undefined || departamento_id !== undefined || 
          status !== undefined || agenda !== undefined || observacoes !== undefined) {
        return res.status(403).json({ 
          error: 'Participantes só podem adicionar outros participantes' 
        });
      }
    }
    
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    if (titulo !== undefined) {
      fields.push('titulo = @titulo');
      params.titulo = titulo;
    }
    if (tipo !== undefined) {
      fields.push('tipo = @tipo');
      params.tipo = tipo;
    }
    if (data_hora !== undefined) {
      fields.push('data_hora = @data_hora');
      // Format date for SQL Server (keep WAT timezone, no UTC conversion)
      let formattedDate = data_hora;
      if (typeof data_hora === 'string') {
        // Format: "2026-03-14T06:30" -> "2026-03-14 06:30:00"
        formattedDate = data_hora.replace('T', ' ') + ':00';
      }
      params.data_hora = formattedDate;
    }
    if (data_hora_fim !== undefined) {
      fields.push('data_hora_fim = @data_hora_fim');
      // Format date for SQL Server (keep WAT timezone, no UTC conversion)
      let formattedDateFim = data_hora_fim;
      if (data_hora_fim && typeof data_hora_fim === 'string') {
        // Format: "2026-03-14T08:30" -> "2026-03-14 08:30:00"
        formattedDateFim = data_hora_fim.replace('T', ' ') + ':00';
      }
      params.data_hora_fim = formattedDateFim || null;
    }
    if (local !== undefined) {
      fields.push('local = @local');
      params.local = local;
    }
    if (departamento_id !== undefined) {
      fields.push('departamento_id = @departamento_id');
      params.departamento_id = departamento_id;
    }
    if (status !== undefined) {
      fields.push('status = @status');
      params.status = status;
    }
    if (agenda !== undefined) {
      fields.push('agenda = @agenda');
      params.agenda = agenda;
    }
    if (observacoes !== undefined) {
      fields.push('observacoes = @observacoes');
      params.observacoes = observacoes;
    }
    
    if (fields.length === 0 && !participantes && !participantes_externos) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    // Get current meeting data first
    const currentMeeting = await executeQuery('SELECT * FROM reunioes WHERE id = @id', { id });
    if (currentMeeting.length === 0) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }
    
    // Format the date for conflict check if it's being updated
    let formattedCheckDateTime = currentMeeting[0].data_hora;
    if (data_hora !== undefined) {
      if (typeof data_hora === 'string') {
        const dateObj = new Date(data_hora);
        if (!isNaN(dateObj.getTime())) {
          formattedCheckDateTime = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        } else {
          formattedCheckDateTime = data_hora;
        }
      } else {
        formattedCheckDateTime = data_hora;
      }
    }
    
    // Check for conflicts if date/time/location or participants are being updated
    const checkLocal = local !== undefined ? local : currentMeeting[0].local;
    
    if ((data_hora !== undefined || local !== undefined || participantes) && checkLocal) {
      
      // Get participants to check (either new ones or existing ones)
      let participantIds: string[] = [];
      if (participantes) {
        participantIds = participantes.map((p: any) => p.usuario_id);
      } else {
        const existingParticipants = await executeQuery(
          'SELECT usuario_id FROM reunioes_participantes WHERE reuniao_id = @id',
          { id }
        );
        participantIds = existingParticipants.map((p: any) => p.usuario_id);
      }
      
      if (participantIds.length > 0 && checkLocal) {
        const conflictQuery = `
          SELECT DISTINCT 
            u.nome as usuario_nome,
            u.email as usuario_email,
            r.titulo as reuniao_titulo,
            r.data_hora,
            r.local
          FROM reunioes r
          INNER JOIN reunioes_participantes rp ON r.id = rp.reuniao_id
          INNER JOIN usuarios u ON rp.usuario_id = u.id
          WHERE r.data_hora = @data_hora
            AND r.local = @local
            AND r.status != 'cancelada'
            AND r.id != @current_id
            AND rp.usuario_id IN (${participantIds.map((_, idx) => `@usuario_${idx}`).join(', ')})
        `;
        
        const conflictParams: any = {
          data_hora: formattedCheckDateTime,
          local: checkLocal,
          current_id: id
        };
        
        participantIds.forEach((userId, idx) => {
          conflictParams[`usuario_${idx}`] = userId;
        });
        
        const conflicts = await executeQuery(conflictQuery, conflictParams);
        
        if (conflicts.length > 0) {
          const conflictMessages = conflicts.map((c: any) => 
            `${c.usuario_nome} já tem reunião "${c.reuniao_titulo}" no mesmo horário e local`
          );
          
          console.error('⚠️ Meeting conflicts detected on update:', conflicts);
          return res.status(409).json({ 
            error: 'Conflito de agenda detectado',
            conflicts: conflictMessages
          });
        }
      }
    }
    
    if (fields.length > 0) {
      fields.push('updated_at = GETDATE()');
      
      const query = `
        UPDATE reunioes
        SET ${fields.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;
      
      const result = await executeQuery(query, params);
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Reunião não encontrada' });
      }
    }
    
    if (participantes) {
      await executeQuery('DELETE FROM reunioes_participantes WHERE reuniao_id = @id', { id });
      
      if (participantes.length > 0) {
        for (const participante of participantes) {
          const participantesQuery = `
            INSERT INTO reunioes_participantes (reuniao_id, usuario_id, tipo, presenca)
            VALUES (@reuniao_id, @usuario_id, @tipo, @presenca)
          `;
          
          await executeQuery(participantesQuery, {
            reuniao_id: id,
            usuario_id: participante.usuario_id,
            tipo: participante.tipo || 'participante',
            presenca: participante.presenca || null
          });
        }
      }
    }
    
    // Update external participants if provided
    if (participantes_externos !== undefined) {
      await executeQuery('DELETE FROM reunioes_participantes_externos WHERE reuniao_id = @id', { id });
      
      if (participantes_externos.length > 0) {
        console.log(`🌍 Updating ${participantes_externos.length} external participantes...`);
        for (const externo of participantes_externos) {
          const externosQuery = `
            INSERT INTO reunioes_participantes_externos (reuniao_id, nome, email, empresa, cargo, telefone, tipo)
            VALUES (@reuniao_id, @nome, @email, @empresa, @cargo, @telefone, @tipo)
          `;
          
          await executeQuery(externosQuery, {
            reuniao_id: id,
            nome: externo.nome,
            email: externo.email || null,
            empresa: externo.empresa || null,
            cargo: externo.cargo || null,
            telefone: externo.telefone || null,
            tipo: externo.tipo || 'convidado'
          });
        }
      }
    }
    
    const updatedReuniao = await executeQuery(
      'SELECT * FROM reunioes WHERE id = @id',
      { id }
    );
    
    // Fetch complete meeting data with participants for webhook
    const completeReuniaoQuery = `
      SELECT 
        r.*,
        d.nome as departamento_nome,
        u.nome as convocador_nome,
        u.email as convocador_email
      FROM reunioes r
      LEFT JOIN departamentos d ON r.departamento_id = d.id
      LEFT JOIN usuarios u ON r.convocador_id = u.id
      WHERE r.id = @id
    `;
    
    const participantesCompleteQuery = `
      SELECT 
        rp.*,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM reunioes_participantes rp
      LEFT JOIN usuarios u ON rp.usuario_id = u.id
      WHERE rp.reuniao_id = @id
    `;
    
    const participantesExternosQuery = `
      SELECT * FROM reunioes_participantes_externos
      WHERE reuniao_id = @id
    `;
    
    const [completeReuniao, participantesComplete, participantesExternosComplete] = await Promise.all([
      executeQuery(completeReuniaoQuery, { id }),
      executeQuery(participantesCompleteQuery, { id }),
      executeQuery(participantesExternosQuery, { id })
    ]);
    
    // Combine internal and external participants
    const allParticipantes = [
      ...participantesComplete.map((p: any) => ({
        ...p,
        tipo_participante: 'interno'
      })),
      ...participantesExternosComplete.map((p: any) => ({
        ...p,
        tipo_participante: 'externo'
      }))
    ];
    
    // Extract all emails from participants in simplified format
    const attendees = [
      ...participantesComplete.map((p: any) => ({
        email: p.usuario_email
      })).filter((attendee: any) => attendee.email),
      ...participantesExternosComplete.map((p: any) => ({
        email: p.email
      })).filter((attendee: any) => attendee.email)
    ];
    
    // Create additional email formats for different Make.com modules
    const emailAddresses = attendees.map(a => a.email);
    const emailList = emailAddresses.join(', ');
    const toRecipients = attendees.map(a => ({
      emailAddress: {
        address: a.email
      }
    }));
    
    // Format dates to ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
    const startDate = new Date(completeReuniao[0].data_hora).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const endDate = completeReuniao[0].data_hora_fim 
      ? new Date(completeReuniao[0].data_hora_fim).toISOString().replace(/\.\d{3}Z$/, 'Z')
      : new Date(new Date(completeReuniao[0].data_hora).getTime() + 3600000).toISOString().replace(/\.\d{3}Z$/, 'Z'); // +1 hour default
    
    // Send to webhook with all fields
    const webhookData = {
      action: 'updated',
      // MS Teams Online Meeting fields (only these are sent to MS Teams module)
      msTeams: {
        subject: completeReuniao[0].titulo || 'Reunião',
        startDateTime: startDate,
        endDateTime: endDate
      },
      // Additional fields for other Make.com modules
      attendees: attendees,
      emailAddresses: emailAddresses,
      emailList: emailList,
      toRecipients: toRecipients,
      // All meeting fields
      id: completeReuniao[0].id,
      titulo: completeReuniao[0].titulo,
      tipo: completeReuniao[0].tipo,
      data_hora: completeReuniao[0].data_hora,
      data_hora_fim: completeReuniao[0].data_hora_fim,
      local: completeReuniao[0].local,
      departamento_id: completeReuniao[0].departamento_id,
      departamento_nome: completeReuniao[0].departamento_nome,
      convocador_id: completeReuniao[0].convocador_id,
      convocador_nome: completeReuniao[0].convocador_nome,
      convocador_email: completeReuniao[0].convocador_email,
      agenda: completeReuniao[0].agenda,
      observacoes: completeReuniao[0].observacoes,
      status: completeReuniao[0].status,
      created_at: completeReuniao[0].created_at,
      updated_at: completeReuniao[0].updated_at,
      participantes: allParticipantes
    };
    
    sendToWebhook(webhookData).catch(err => 
      console.error('Webhook error (non-blocking):', err)
    );
    
    return res.json(updatedReuniao[0]);
  } catch (error: any) {
    console.error('❌ Error updating reuniao:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return res.status(500).json({ 
      error: 'Erro ao atualizar reunião',
      details: error.message 
    });
  }
};

export const deleteReuniao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM reunioes OUTPUT DELETED.* WHERE id = @id',
      { id }
    );
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }
    
    return res.json({ message: 'Reunião excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting reuniao:', error);
    return res.status(500).json({ error: 'Erro ao excluir reunião' });
  }
};

export const getAllActas = async (req: Request, res: Response) => {
  try {
    const { reuniao_id, aprovada } = req.query;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    let query = `
      SELECT 
        a.*,
        r.titulo as reuniao_titulo,
        r.data_hora as reuniao_data,
        u1.nome as redator_nome,
        u2.nome as aprovador_nome
      FROM actas a
      LEFT JOIN reunioes r ON a.reuniao_id = r.id
      LEFT JOIN usuarios u1 ON a.redator_id = u1.id
      LEFT JOIN usuarios u2 ON a.aprovador_id = u2.id
      WHERE 1=1
    `;
    
    const params: Record<string, any> = {};
    
    // Colaborador only sees actas from meetings they participated in
    if (userRole === 'colaborador' && userId) {
      query += ` AND EXISTS (
        SELECT 1 FROM reunioes_participantes rp 
        WHERE rp.reuniao_id = a.reuniao_id AND rp.usuario_id = @user_id
      )`;
      params.user_id = userId;
    }
    
    if (reuniao_id) {
      query += ` AND a.reuniao_id = @reuniao_id`;
      params.reuniao_id = reuniao_id;
    }
    
    if (aprovada !== undefined) {
      query += ` AND a.aprovada = @aprovada`;
      params.aprovada = aprovada === 'true' ? 1 : 0;
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    const result = await executeQuery(query, Object.keys(params).length > 0 ? params : undefined);
    return res.json(result);
  } catch (error) {
    console.error('Error fetching actas:', error);
    return res.status(500).json({ error: 'Erro ao buscar actas' });
  }
};

export const getActaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const actaQuery = `
      SELECT 
        a.*,
        r.titulo as reuniao_titulo,
        r.data_hora as reuniao_data,
        r.local as reuniao_local,
        u1.nome as redator_nome,
        u2.nome as aprovador_nome
      FROM actas a
      LEFT JOIN reunioes r ON a.reuniao_id = r.id
      LEFT JOIN usuarios u1 ON a.redator_id = u1.id
      LEFT JOIN usuarios u2 ON a.aprovador_id = u2.id
      WHERE a.id = @id
    `;
    
    const acoesQuery = `
      SELECT 
        aa.*,
        u.nome as responsavel_nome
      FROM actas_acoes aa
      LEFT JOIN usuarios u ON aa.responsavel_id = u.id
      WHERE aa.acta_id = @id
      ORDER BY aa.prazo, aa.prioridade DESC
    `;
    
    const [actaResult, acoesResult] = await Promise.all([
      executeQuery(actaQuery, { id }),
      executeQuery(acoesQuery, { id })
    ]);
    
    if (actaResult.length === 0) {
      return res.status(404).json({ error: 'Acta não encontrada' });
    }
    
    const acta = {
      ...actaResult[0],
      acoes: acoesResult
    };
    
    return res.json(acta);
  } catch (error) {
    console.error('Error fetching acta:', error);
    return res.status(500).json({ error: 'Erro ao buscar acta' });
  }
};

export const createActa = async (req: Request, res: Response) => {
  try {
    // Detectar padrões maliciosos nos campos de texto
    const textFields = [req.body.conteudo, req.body.decisoes];
    for (const field of textFields) {
      if (field && detectMaliciousPatterns(field)) {
        return res.status(400).json({ error: 'Conteúdo inválido detectado. Por favor, remova caracteres especiais ou código.' });
      }
    }
    
    const {
      reuniao_id,
      conteudo,
      decisoes,
      redator_id,
      acoes
    } = req.body;
    
    if (!reuniao_id || !conteudo) {
      return res.status(400).json({ error: 'Campos obrigatórios: reuniao_id, conteudo' });
    }
    
    // Generate automatic numero_acta in format xxx/yyyy
    const currentYear = new Date().getFullYear();
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM actas 
      WHERE YEAR(created_at) = @year
    `;
    const countResult = await executeQuery(countQuery, { year: currentYear });
    const nextNumber = (countResult[0].count + 1).toString().padStart(3, '0');
    const generatedNumeroActa = `${nextNumber}/${currentYear}`;
    
    const actaQuery = `
      INSERT INTO actas (
        reuniao_id, numero_acta, conteudo, decisoes, redator_id
      )
      OUTPUT INSERTED.*
      VALUES (
        @reuniao_id, @numero_acta, @conteudo, @decisoes, @redator_id
      )
    `;
    
    const actaResult = await executeQuery(actaQuery, {
      reuniao_id,
      numero_acta: generatedNumeroActa,
      conteudo,
      decisoes,
      redator_id
    });
    
    const acta = actaResult[0];
    
    if (acoes && acoes.length > 0) {
      for (const acao of acoes) {
        const acoesQuery = `
          INSERT INTO actas_acoes (
            acta_id, descricao, responsavel_id, prazo, prioridade, observacoes
          )
          VALUES (
            @acta_id, @descricao, @responsavel_id, @prazo, @prioridade, @observacoes
          )
        `;
        
        await executeQuery(acoesQuery, {
          acta_id: acta.id,
          descricao: acao.descricao,
          responsavel_id: acao.responsavel_id,
          prazo: acao.prazo,
          prioridade: acao.prioridade || 'media',
          observacoes: acao.observacoes
        });
      }
    }
    
    await executeQuery(
      'UPDATE reunioes SET status = @status WHERE id = @id',
      { status: 'realizada', id: reuniao_id }
    );
    
    return res.status(201).json(acta);
  } catch (error) {
    console.error('Error creating acta:', error);
    return res.status(500).json({ error: 'Erro ao criar acta' });
  }
};

export const updateActa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      numero_acta,
      conteudo,
      decisoes,
      aprovada,
      aprovador_id
    } = req.body;
    
    const userRole = req.headers['x-user-role'] as string;
    const isAdmin = userRole === 'admin';
    
    // Check if acta is approved - only admin can edit
    const actaCheck = await executeQuery(
      'SELECT aprovada FROM actas WHERE id = @id',
      { id }
    );
    
    if (actaCheck.length === 0) {
      return res.status(404).json({ error: 'Acta não encontrada' });
    }
    
    if (actaCheck[0].aprovada && !isAdmin) {
      return res.status(403).json({ 
        error: 'Apenas administradores podem editar actas aprovadas' 
      });
    }
    
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    if (numero_acta !== undefined) {
      fields.push('numero_acta = @numero_acta');
      params.numero_acta = numero_acta;
    }
    if (conteudo !== undefined) {
      fields.push('conteudo = @conteudo');
      params.conteudo = conteudo;
    }
    if (decisoes !== undefined) {
      fields.push('decisoes = @decisoes');
      params.decisoes = decisoes;
    }
    if (aprovada !== undefined) {
      fields.push('aprovada = @aprovada');
      params.aprovada = aprovada;
      if (aprovada) {
        fields.push('data_aprovacao = GETDATE()');
      }
    }
    if (aprovador_id !== undefined) {
      fields.push('aprovador_id = @aprovador_id');
      params.aprovador_id = aprovador_id;
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    fields.push('updated_at = GETDATE()');
    
    const query = `
      UPDATE actas
      SET ${fields.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Acta não encontrada' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating acta:', error);
    return res.status(500).json({ error: 'Erro ao atualizar acta' });
  }
};

export const deleteActa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM actas OUTPUT DELETED.* WHERE id = @id',
      { id }
    );
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Acta não encontrada' });
    }
    
    return res.json({ message: 'Acta excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting acta:', error);
    return res.status(500).json({ error: 'Erro ao excluir acta' });
  }
};

export const getAllAcoes = async (req: Request, res: Response) => {
  try {
    const { acta_id, responsavel_id, status } = req.query;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    let query = `
      SELECT 
        aa.*,
        u.nome as responsavel_nome,
        a.numero_acta,
        r.titulo as reuniao_titulo
      FROM actas_acoes aa
      LEFT JOIN usuarios u ON aa.responsavel_id = u.id
      LEFT JOIN actas a ON aa.acta_id = a.id
      LEFT JOIN reunioes r ON a.reuniao_id = r.id
      WHERE 1=1
    `;
    
    const params: Record<string, any> = {};
    
    // Colaborador only sees actions from meetings they participated in
    if (userRole === 'colaborador' && userId) {
      query += ` AND EXISTS (
        SELECT 1 FROM reunioes_participantes rp 
        WHERE rp.reuniao_id = r.id AND rp.usuario_id = @user_id
      )`;
      params.user_id = userId;
    }
    
    if (acta_id) {
      query += ` AND aa.acta_id = @acta_id`;
      params.acta_id = acta_id;
    }
    
    if (responsavel_id) {
      query += ` AND aa.responsavel_id = @responsavel_id`;
      params.responsavel_id = responsavel_id;
    }
    
    if (status) {
      query += ` AND aa.status = @status`;
      params.status = status;
    }
    
    query += ` ORDER BY aa.prazo, aa.prioridade DESC`;
    
    const result = await executeQuery(query, Object.keys(params).length > 0 ? params : undefined);
    return res.json(result);
  } catch (error) {
    console.error('Error fetching acoes:', error);
    return res.status(500).json({ error: 'Erro ao buscar ações' });
  }
};

export const createAcao = async (req: Request, res: Response) => {
  try {
    const {
      acta_id,
      descricao,
      responsavel_id,
      prazo,
      prioridade,
      observacoes
    } = req.body;
    
    if (!acta_id || !descricao) {
      return res.status(400).json({ error: 'Campos obrigatórios: acta_id, descricao' });
    }
    
    const query = `
      INSERT INTO actas_acoes (
        acta_id, descricao, responsavel_id, prazo, prioridade, observacoes
      )
      OUTPUT INSERTED.*
      VALUES (
        @acta_id, @descricao, @responsavel_id, @prazo, @prioridade, @observacoes
      )
    `;
    
    const result = await executeQuery(query, {
      acta_id,
      descricao,
      responsavel_id,
      prazo,
      prioridade: prioridade || 'media',
      observacoes
    });
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating acao:', error);
    return res.status(500).json({ error: 'Erro ao criar ação' });
  }
};

export const updateAcao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      descricao,
      responsavel_id,
      prazo,
      status,
      prioridade,
      observacoes
    } = req.body;
    
    const userRole = req.headers['x-user-role'] as string;
    const isAdmin = userRole === 'admin';
    
    // Check if acao is completed - only admin can edit
    const acaoCheck = await executeQuery(
      'SELECT status FROM actas_acoes WHERE id = @id',
      { id }
    );
    
    if (acaoCheck.length === 0) {
      return res.status(404).json({ error: 'Ação não encontrada' });
    }
    
    if (acaoCheck[0].status === 'concluida' && !isAdmin) {
      return res.status(403).json({ 
        error: 'Apenas administradores podem editar ações concluídas' 
      });
    }
    
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    if (descricao !== undefined) {
      fields.push('descricao = @descricao');
      params.descricao = descricao;
    }
    if (responsavel_id !== undefined) {
      fields.push('responsavel_id = @responsavel_id');
      params.responsavel_id = responsavel_id;
    }
    if (prazo !== undefined) {
      fields.push('prazo = @prazo');
      params.prazo = prazo;
    }
    if (status !== undefined) {
      fields.push('status = @status');
      params.status = status;
    }
    if (prioridade !== undefined) {
      fields.push('prioridade = @prioridade');
      params.prioridade = prioridade;
    }
    if (observacoes !== undefined) {
      fields.push('observacoes = @observacoes');
      params.observacoes = observacoes;
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    fields.push('updated_at = GETDATE()');
    
    const query = `
      UPDATE actas_acoes
      SET ${fields.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Ação não encontrada' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating acao:', error);
    return res.status(500).json({ error: 'Erro ao atualizar ação' });
  }
};

export const deleteAcao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM actas_acoes OUTPUT DELETED.* WHERE id = @id',
      { id }
    );
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Ação não encontrada' });
    }
    
    return res.json({ message: 'Ação excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting acao:', error);
    return res.status(500).json({ error: 'Erro ao excluir ação' });
  }
};
