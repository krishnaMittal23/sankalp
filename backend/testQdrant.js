import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

async function testQdrant() {
  try {
    console.log('Testing Qdrant connection...');
    console.log('URL:', process.env.QDRANT_URL);
    
    // Test connection
    const collections = await client.getCollections();
    console.log('✅ Connected! Collections:', collections);
    
    // Try to create collection
    await client.createCollection('test_collection', {
      vectors: { size: 768, distance: 'Cosine' }
    });
    console.log('✅ Collection created');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testQdrant();