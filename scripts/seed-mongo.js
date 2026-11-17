// Creates the telemetry collection (validator + indexes) and loads simulated readings.
// Usage:  npm run db:mongo
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB = process.env.MONGODB_DB || 'batterypassport';

// Must stay consistent with the SOH/cycle values in database/mysql/03_seed.sql
const PROFILES = [
  { id: 1, serial: 'BP-CATL-NMC-0001', volt: 355, chem: 'NMC', soh: 91.4, cycles: 1080, base: 31, live: true },
  { id: 5, serial: 'BP-LGES-E78-0005', volt: 400, chem: 'NMC', soh: 95.1, cycles: 520, base: 29, live: true, spike: 56.4 },
  { id: 7, serial: 'BP-BYD-LFP-0007', volt: 400, chem: 'LFP', soh: 94.8, cycles: 880, base: 30, live: true },
  { id: 9, serial: 'BP-TATA-LFP-0009', volt: 330, chem: 'LFP', soh: 96.5, cycles: 600, base: 29, live: true },
  { id: 2, serial: 'BP-CATL-NMC-0002', volt: 355, chem: 'NMC', soh: 68.2, cycles: 1650, base: 33, end: '2024-08-05T12:00:00Z', stepH: 6 },
  { id: 6, serial: 'BP-PANA-NCA-0006', volt: 350, chem: 'NCA', soh: 71.0, cycles: 1100, base: 36, end: '2024-11-15T12:00:00Z', stepH: 6, spike: 63.4 },
];

function rng(seed) {                       // deterministic PRNG so every run gives the same data
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r2 = (x) => Math.round(x * 100) / 100;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function generate(p) {
  const rand = rng(p.id * 7919);
  const stepH = p.stepH || 3;
  const days = 45;
  const n = Math.floor((days * 24) / stepH);
  const endMs = p.live ? Date.now() : new Date(p.end).getTime();
  const docs = [];
  for (let i = 0; i < n; i++) {
    const ts = new Date(Math.floor((endMs - (n - 1 - i) * stepH * 3600e3) / 1000) * 1000);
    const h = ts.getUTCHours() + ts.getUTCMinutes() / 60;
    const w = 2 * Math.PI * (h - 6) / 24 + p.id;
    const soc = clamp(55 + 38 * Math.sin(w) + (rand() - 0.5) * 6, 8, 98);
    const current = clamp(-70 * Math.cos(w) + (rand() - 0.5) * 20, -200, 200);
    const volt = p.volt * (0.86 + 0.16 * soc / 100) + (rand() - 0.5) * 3;
    let temp = p.base + 4 * Math.sin(2 * Math.PI * (h - 14) / 24) + 6 * Math.abs(current) / 180 + (rand() - 0.5) * 1.6;
    if (p.spike && i === n - 20) temp = p.spike;
    const back = (n - 1 - i) / (n - 1);
    const doc = {
      battery_id: p.id, serial_number: p.serial, ts,
      temperature_c: r2(temp), voltage_v: r2(volt), current_a: r2(current), soc_pct: r2(soc),
      soh_pct: r2(p.soh + back * 0.15), cycle_count: p.cycles - Math.round(back * 22),
      source: 'SIMULATED',
      extra: p.chem === 'LFP' ? { cell_voltage_delta_mv: r2(8 + rand() * 6) } : { coolant_temp_c: r2(temp - 6 + (rand() - 0.5)) },
    };
    docs.push(doc);
  }
  return docs;
}

(async () => {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    const db = client.db(DB);
    await db.collection('telemetry').drop().catch(() => {});
    await db.createCollection('telemetry', {
      validator: { $jsonSchema: {
        bsonType: 'object',
        required: ['battery_id', 'ts', 'temperature_c', 'voltage_v', 'current_a', 'soc_pct', 'soh_pct', 'cycle_count'],
        properties: {
          battery_id: { bsonType: ['int', 'long'], minimum: 1 },
          serial_number: { bsonType: 'string' },
          ts: { bsonType: 'date' },
          temperature_c: { bsonType: ['double', 'int'], minimum: -40, maximum: 120 },
          voltage_v: { bsonType: ['double', 'int'], minimum: 0, maximum: 1000 },
          current_a: { bsonType: ['double', 'int'], minimum: -1000, maximum: 1000 },
          soc_pct: { bsonType: ['double', 'int'], minimum: 0, maximum: 100 },
          soh_pct: { bsonType: ['double', 'int'], minimum: 0, maximum: 100 },
          cycle_count: { bsonType: ['int', 'long'], minimum: 0 },
          source: { enum: ['SIMULATED', 'BMS', 'IMPORT'] },
          extra: { bsonType: 'object' },
        } } },
      validationLevel: 'strict', validationAction: 'error',
    });
    const col = db.collection('telemetry');
    await col.createIndex({ battery_id: 1, ts: -1 }, { name: 'idx_battery_ts' });
    await col.createIndex({ battery_id: 1, ts: 1 }, { unique: true, name: 'uq_battery_ts' });
    await col.createIndex({ temperature_c: -1 }, { name: 'idx_temp' });
    let total = 0;
    for (const p of PROFILES) {
      const docs = generate(p);
      await col.insertMany(docs);
      total += docs.length;
      console.log(`  ✔ battery ${p.id} (${p.serial}): ${docs.length} readings`);
    }
    console.log(`\nMongoDB "${DB}.telemetry" is ready with ${total} readings.`);
  } catch (e) {
    console.error('\n✖ MongoDB setup failed:', e.message);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
