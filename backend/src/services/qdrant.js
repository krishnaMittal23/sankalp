import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

const client = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = 'interview_memories';
const VECTOR_SIZE = 768;

export async function initQdrant() {
  try {
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