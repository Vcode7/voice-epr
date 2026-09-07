import { MongoClient, Db } from 'mongodb';

/**
 * Normalizes MongoDB connection strings to avoid corporate DNS / VPN SRV query failures.
 * Corporate networks frequently drop or fail `_mongodb._tcp` SRV queries (querySrv ENOTFOUND).
 * By transforming to direct replica set member addresses, standard DNS A records are used instead.
 */
function normalizeMongoUri(rawUri: string): string {
  if (!rawUri) return '';
  if (rawUri.includes('voice.npbofxl.mongodb.net')) {
    const match = rawUri.match(/mongodb(?:\+srv)?:\/\/([^@]+)@(?:voice\.npbofxl\.mongodb\.net|ac-v9lniup-shard-00-[^:]+)(.*)/);
    if (match) {
      const credentials = match[1];
      return `mongodb://${credentials}@ac-v9lniup-shard-00-00.npbofxl.mongodb.net:27017,ac-v9lniup-shard-00-01.npbofxl.mongodb.net:27017,ac-v9lniup-shard-00-02.npbofxl.mongodb.net:27017/voice_epr_db?ssl=true&replicaSet=atlas-910fv7-shard-0&authSource=admin&retryWrites=true&w=majority`;
    }
  }
  return rawUri;
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient | null> | null = null;

export async function getMongoClient(): Promise<MongoClient | null> {
  const rawUri = process.env.MONGODB_URI || '';
  const uri = normalizeMongoUri(rawUri);
  if (!uri || uri.trim() === '') {
    return null;
  }

  const options = {
    serverSelectionTimeoutMS: 6000,
    connectTimeoutMS: 10000,
  };

  try {
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect().catch((err) => {
        console.warn('[MongoDB] Connection unavailable or blocked by network, using in-memory store:', err.message);
        clientPromise = null;
        return null;
      });
    }
    const resolvedClient = await clientPromise;
    return resolvedClient;
  } catch (err: any) {
    console.warn('[MongoDB] Error connecting to MongoDB:', err?.message || err);
    clientPromise = null;
    return null;
  }
}

export async function getDb(dbName: string = 'voice_epr_db'): Promise<Db | null> {
  try {
    const mongoClient = await getMongoClient();
    if (!mongoClient) return null;
    return mongoClient.db(dbName);
  } catch (err: any) {
    console.warn('[MongoDB] Failed to acquire database handle:', err?.message || err);
    return null;
  }
}
