import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

function normalizeQdrantUrl(rawUrl) {
  const fallback = 'http://localhost:6333';
  if (!rawUrl) return fallback;

  try {
    const parsed = new URL(rawUrl);
    const isCloudHost = parsed.hostname.endsWith('.cloud.qdrant.io');

    // Managed Qdrant Cloud endpoints generally use HTTPS without port 6333.
    if (isCloudHost && parsed.port === '6333') {
      parsed.port = '';
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return rawUrl;
  }
}

const qdrantUrl = normalizeQdrantUrl(process.env.QDRANT_URL);
let clientConfig = {
  url: qdrantUrl,
  apiKey: process.env.QDRANT_API_KEY,
};

try {
  const parsed = new URL(qdrantUrl);
  const isCloudHost = parsed.hostname.endsWith('.cloud.qdrant.io');

  if (isCloudHost) {
    clientConfig = {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 443,
      https: true,
      apiKey: process.env.QDRANT_API_KEY,
      checkCompatibility: false,
    };
  }
} catch {
  // Keep default URL-based client config when parsing fails.
}

const client = new QdrantClient(clientConfig);

const COLLECTION_NAME = 'interview_memories';
const VECTOR_SIZE = 768;

export async function initQdrant() {
  try {
    console.log('🔗 Qdrant URL:', qdrantUrl);
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (!exists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine'
        }
      });
      console.log("✅ Qdrant collection created:", COLLECTION_NAME);
    } else {
      console.log("✅ Qdrant collection already exists:", COLLECTION_NAME);
    }
  } catch (error) {
    console.error("Qdrant initialization error:", error.message);
    throw error;
  }
}

export async function storeInQdrant(userId, type, text, embedding, metadata = {}) {
  try {
    const pointId = `${userId}_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await client.upsert(COLLECTION_NAME, {
      points: [{
        id: pointId,
        vector: embedding,
        payload: {
          userId,
          type,
          text,
          ...metadata,
          timestamp: new Date().toISOString()
        }
      }]
    });
    
    console.log(`✅ Stored in Qdrant: ${type} for user ${userId}`);
    return pointId;
  } catch (error) {
    console.error("❌ Error storing in Qdrant:", error.message);
    throw error;
  }
}

export async function searchQdrant(userId, queryEmbedding, limit = 5) {
  const results = await client.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    filter: {
      must: [{ key: 'userId', match: { value: userId } }]
    },
    limit
  });
  
  return results.map(r => r.payload);
}