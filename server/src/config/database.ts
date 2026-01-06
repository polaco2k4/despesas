import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.SQL_SERVER || 'localhost\\SQLEXPRESS',
  database: process.env.SQL_DATABASE || 'DESPESAS',
  authentication: process.env.SQL_TRUSTED_CONNECTION === 'true' 
    ? {
        type: 'ntlm',
        options: {
          domain: process.env.SQL_DOMAIN || '',
          userName: process.env.SQL_USER || '',
          password: process.env.SQL_PASSWORD || '',
        }
      }
    : {
        type: 'default',
        options: {
          userName: process.env.SQL_USER || '',
          password: process.env.SQL_PASSWORD || '',
        }
      },
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    useUTC: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 30000,
  connectionTimeout: 30000,
};

let pool: sql.ConnectionPool | null = null;

export const getConnection = async (): Promise<sql.ConnectionPool> => {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ Conectado ao SQL Server Express');
  }
  return pool;
};

export const closeConnection = async (): Promise<void> => {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Conexão com SQL Server fechada');
  }
};

export const executeQuery = async <T = any>(
  query: string,
  params?: Record<string, any>
): Promise<T[]> => {
  const connection = await getConnection();
  const request = connection.request();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
  }

  const result = await request.query(query);
  return result.recordset;
};

export { sql };
