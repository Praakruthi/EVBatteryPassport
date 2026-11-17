// Creates the batterypassport database, programmability objects and sample data.
// Usage:  npm run db:mysql
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const FILES = ['01_schema.sql', '02_programmability.sql', '03_seed.sql'];

// Minimal client-side parser: supports the DELIMITER command used for routines/triggers.
async function runSqlFile(conn, file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let delimiter = ';';
  let buffer = '';
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^DELIMITER\s+(\S+)$/i);
    if (m) { delimiter = m[1]; continue; }
    if (trimmed.startsWith('--')) continue;       // full-line comments
    buffer += line + '\n';
    if (trimmed.endsWith(delimiter)) {
      const stmt = buffer.trim().slice(0, -delimiter.length).trim();
      buffer = '';
      if (stmt) { await conn.query(stmt); count++; }
    }
  }
  return count;
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  });
  try {
    for (const f of FILES) {
      const n = await runSqlFile(conn, path.join(__dirname, '..', 'database', 'mysql', f));
      console.log(`  ✔ ${f}  (${n} statements)`);
    }
    console.log('\nMySQL database "batterypassport" is ready.');
  } catch (e) {
    console.error('\n✖ MySQL setup failed:', e.sqlMessage || e.message);
    if (/SUPER|log_bin_trust/i.test(e.message || '')) {
      console.error('  Hint: run  SET GLOBAL log_bin_trust_function_creators = 1;  or connect as root.');
    }
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
