/**
 * Utilitário de sanitização para prevenir código malicioso
 * Protege contra XSS, SQL Injection e outros ataques
 */

/**
 * Remove tags HTML e scripts potencialmente perigosos
 */
export const sanitizeHtml = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

/**
 * Sanitiza strings para prevenir SQL Injection
 */
export const sanitizeSql = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/exec\s/gi, '')
    .replace(/execute\s/gi, '')
    .replace(/drop\s/gi, '')
    .replace(/delete\s/gi, '')
    .replace(/insert\s/gi, '')
    .replace(/update\s/gi, '')
    .trim();
};

/**
 * Sanitiza entrada de texto geral
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

/**
 * Valida e sanitiza email
 */
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Email inválido');
  }
  
  return sanitized;
};

/**
 * Sanitiza número de telefone
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
};

/**
 * Sanitiza URL
 */
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  
  const sanitized = url.trim();
  
  if (sanitized.match(/^(javascript|data|vbscript):/i)) {
    throw new Error('URL inválida');
  }
  
  return sanitized;
};

/**
 * Sanitiza objeto recursivamente
 */
export const sanitizeObject = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return sanitizeInput(obj);
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  
  return sanitized;
};

/**
 * Valida comprimento de string
 */
export const validateLength = (input: string, min: number = 0, max: number = 1000): boolean => {
  if (!input || typeof input !== 'string') return false;
  return input.length >= min && input.length <= max;
};

/**
 * Detecta padrões suspeitos
 */
export const detectMaliciousPatterns = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i,
    /\.\.\/\.\.\//,
    /union\s+select/i,
    /drop\s+table/i,
    /exec\s*\(/i
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(input));
};

/**
 * Sanitiza campos específicos de solicitação de viatura
 */
export const sanitizeSolicitacaoFields = (data: any): any => {
  return {
    destino: data.destino ? sanitizeInput(data.destino) : '',
    motivo: data.motivo ? sanitizeInput(data.motivo) : '',
    observacoes: data.observacoes ? sanitizeInput(data.observacoes) : '',
    tipo_viatura: data.tipo_viatura ? sanitizeInput(data.tipo_viatura) : null,
    numero_passageiros: data.numero_passageiros ? parseInt(data.numero_passageiros) : 0,
    data_inicio: data.data_inicio,
    data_fim: data.data_fim,
    solicitante_id: data.solicitante_id,
    veiculo_atribuido_id: data.veiculo_atribuido_id,
    condutor_atribuido_id: data.condutor_atribuido_id,
    status: data.status ? sanitizeInput(data.status) : 'pendente'
  };
};

/**
 * Sanitiza campos de acta
 */
export const sanitizeActaFields = (data: any): any => {
  return {
    titulo: data.titulo ? sanitizeInput(data.titulo) : '',
    descricao: data.descricao ? sanitizeInput(data.descricao) : '',
    local: data.local ? sanitizeInput(data.local) : '',
    observacoes: data.observacoes ? sanitizeInput(data.observacoes) : '',
    data_reuniao: data.data_reuniao,
    hora_inicio: data.hora_inicio,
    hora_fim: data.hora_fim,
    tipo: data.tipo ? sanitizeInput(data.tipo) : '',
    status: data.status ? sanitizeInput(data.status) : 'rascunho'
  };
};
