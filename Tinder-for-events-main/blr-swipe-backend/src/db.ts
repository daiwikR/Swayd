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
  const isLocalUri = !configured || configured.includes('localhost') || configured.includes('127.0.0.1');

  // Serverless (Vercel): a real cluster URI is mandatory — there is no local
  // or in-memory MongoDB, and each invocation would lose in-memory data anyway.
  if (process.env.VERCEL && isLocalUri) {
    throw new Error(
      '[DB] Set MONGODB_URI to a reachable cluster (e.g. MongoDB Atlas) in your Vercel project env vars.'
    );
  }

  // Atlas or custom URI — use directly
  if (configured && !isLocalUri) {
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

  // Fall back to in-memory MongoDB (local dev only)
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
