import { MongoClient } from 'mongodb';

export async function telemetryCollection() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set (see .env.example)');
  if (!globalThis._bpMongo) globalThis._bpMongo = new MongoClient(process.env.MONGODB_URI).connect();
  const client = await globalThis._bpMongo;
  return client.db(process.env.MONGODB_DB || 'batterypassport').collection('telemetry');
}
