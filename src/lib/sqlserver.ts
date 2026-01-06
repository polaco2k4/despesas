import sql from 'mssql';

const config: sql.config = {
  server: import.meta.env.VITE_SQL_SERVER || 'localhost\\SQLEXPRESS',
  database: import.meta.env.VITE_SQL_DATABASE || 'DESPESAS',
  user: import.meta.env.VITE_SQL_USER,
  password: import.meta.env.VITE_SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export const getConnection = async (): Promise<sql.ConnectionPool> => {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
};

export const closeConnection = async (): Promise<void> => {
  if (pool) {
    await pool.close();
    pool = null;
  }
};

export const executeQuery = async <T = any>(query: string, params?: Record<string, any>): Promise<T[]> => {
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

export const executeStoredProcedure = async <T = any>(
  procedureName: string,
  params?: Record<string, any>
): Promise<T[]> => {
  const connection = await getConnection();
  const request = connection.request();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
  }
  
  const result = await request.execute(procedureName);
  return result.recordset;
};

export { sql };
