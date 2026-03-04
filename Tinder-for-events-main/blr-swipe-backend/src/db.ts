import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let connecting: Promise<typeof mongoose> | null = null;

async function startInMemory(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  return mongod.getUri();
}

async function getWorkingUri(): Promise<string> {
  const configured = process.env.MONGODB_URI;

  // Atlas or custom URI — use directly
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured;
  }

  // Try configured local URI first
  if (configured) {
    try {
      const test = new mongoose.mongo.MongoClient(configured, { serverSelectionTimeoutMS: 2000 });
      await test.connect();
      await test.close();
      return configured;
    } catch {
      console.warn('[DB] Local MongoDB unavailable, falling back to in-memory...');
    }
  }

  // Fall back to in-memory MongoDB
  const uri = await startInMemory();
  console.log('[DB] Using in-memory MongoDB (data resets on restart)');
  return uri;
}

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;

  if (!connecting) {
    connecting = (async () => {
      const uri = await getWorkingUri();
      return mongoose.connect(uri, { bufferCommands: false })
        .then((m) => {
          console.log('[DB] Connected');
          return m;
        })
        .catch((err) => {
          console.error('[DB] Connection failed:', err.message);
          connecting = null;
          throw err;
        });
    })();
  }
  return connecting;
}
