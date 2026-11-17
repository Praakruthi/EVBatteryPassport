// =====================================================================
// BatteryPassport | MongoDB 7 | 01_setup.js
// Run in mongosh:   mongosh < database/mongo/01_setup.js
// (npm run db:mongo performs the same steps from Node and also seeds data)
// =====================================================================
use('batterypassport');

db.telemetry.drop();
db.createCollection('telemetry', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['battery_id', 'ts', 'temperature_c', 'voltage_v', 'current_a', 'soc_pct', 'soh_pct', 'cycle_count'],
      properties: {
        battery_id:    { bsonType: ['int', 'long'], minimum: 1, description: 'battery.battery_id in MySQL (soft reference)' },
        serial_number: { bsonType: 'string' },
        ts:            { bsonType: 'date' },
        temperature_c: { bsonType: ['double', 'int'], minimum: -40, maximum: 120 },
        voltage_v:     { bsonType: ['double', 'int'], minimum: 0, maximum: 1000 },
        current_a:     { bsonType: ['double', 'int'], minimum: -1000, maximum: 1000 },
        soc_pct:       { bsonType: ['double', 'int'], minimum: 0, maximum: 100 },
        soh_pct:       { bsonType: ['double', 'int'], minimum: 0, maximum: 100 },
        cycle_count:   { bsonType: ['int', 'long'], minimum: 0 },
        source:        { enum: ['SIMULATED', 'BMS', 'IMPORT'] },
        extra:         { bsonType: 'object', description: 'optional model-specific sensor fields' }
      }
    }
  },
  validationLevel: 'strict',
  validationAction: 'error'
});

// Compound index: serves "readings of battery X in a time range, newest first"
db.telemetry.createIndex({ battery_id: 1, ts: -1 }, { name: 'idx_battery_ts' });
// Unique index: one reading per battery per timestamp (prevents duplicate ingestion)
db.telemetry.createIndex({ battery_id: 1, ts: 1 }, { unique: true, name: 'uq_battery_ts' });
// Supports "all batteries hotter than X" scans
db.telemetry.createIndex({ temperature_c: -1 }, { name: 'idx_temp' });

// ---------------------------------------------------------------------
// Example documents
// ---------------------------------------------------------------------
// {
//   battery_id: 1, serial_number: "BP-CATL-NMC-0001", ts: ISODate("2026-10-30T09:00:00Z"),
//   temperature_c: 31.4, voltage_v: 362.8, current_a: -42.1, soc_pct: 71.5,
//   soh_pct: 91.4, cycle_count: 1079, source: "SIMULATED",
//   extra: { coolant_temp_c: 27.9 }
// }

// ---------------------------------------------------------------------
// Aggregation examples (also used by the Next.js API)
// ---------------------------------------------------------------------

// A1. Daily temperature / SOC summary for one battery over a time range
db.telemetry.aggregate([
  { $match: { battery_id: 1, ts: { $gte: ISODate('2026-09-01'), $lte: ISODate('2026-12-31') } } },
  { $group: {
      _id: { $dateTrunc: { date: '$ts', unit: 'day' } },
      avg_temp: { $avg: '$temperature_c' },
      max_temp: { $max: '$temperature_c' },
      min_soc:  { $min: '$soc_pct' },
      avg_voltage: { $avg: '$voltage_v' },
      readings: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]);

// A2. Fleet summary: hottest batteries (by peak temperature), with number of readings above 45 C
db.telemetry.aggregate([
  { $group: {
      _id: '$battery_id',
      avg_temp: { $avg: '$temperature_c' },
      peak_temp: { $max: '$temperature_c' },
      hot_readings: { $sum: { $cond: [{ $gt: ['$temperature_c', 45] }, 1, 0] } },
      readings: { $sum: 1 } } },
  { $sort: { peak_temp: -1 } }
]);

// A3. Threshold violations in a window (what the API raises as battery_alert rows in MySQL)
db.telemetry.find({ $or: [{ temperature_c: { $gt: 55 } }, { soc_pct: { $lt: 5 } }] }).sort({ ts: -1 }).limit(20);

// A4. Latest reading per battery
db.telemetry.aggregate([
  { $sort: { ts: -1 } },
  { $group: { _id: '$battery_id', last_ts: { $first: '$ts' }, soh_pct: { $first: '$soh_pct' }, soc_pct: { $first: '$soc_pct' } } }
]);

// A5. Validation test (expected to FAIL with "Document failed validation")
// db.telemetry.insertOne({ battery_id: 1, ts: new Date(), temperature_c: 500, voltage_v: 360, current_a: 0, soc_pct: 50, soh_pct: 90, cycle_count: 10 });
