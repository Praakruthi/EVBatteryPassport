import mysql from 'mysql2/promise';

// One pool per server process (cached on globalThis so hot-reload does not leak connections).
function createPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'batterypassport',
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true, // DECIMAL columns come back as numbers
    dateStrings: true,    // DATE/DATETIME come back as 'YYYY-MM-DD[ HH:MM:SS]' strings
  });
}
export const pool = globalThis._bpMysqlPool ?? (globalThis._bpMysqlPool = createPool());

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

// CALL a stored procedure; returns the first row of the first result set (if the procedure SELECTs one).
export async function callProc(name, args = []) {
  if (!/^sp_[a-z_]+$/.test(name)) throw new Error('Invalid procedure name');
  const [res] = await pool.query(`CALL ${name}(${args.map(() => '?').join(', ')})`, args);
  return Array.isArray(res) && Array.isArray(res[0]) ? res[0][0] ?? null : null;
}

// Run several statements atomically (BEGIN ... COMMIT / ROLLBACK).
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
