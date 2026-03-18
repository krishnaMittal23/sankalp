import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getBookmarkedJobs(uniquePresence) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'AI_Interview');
    
    const jobs = await db
      .collection('BookmarkedJobs')
      .find({ uniquePresence })
      .toArray();
    
    return jobs.map(job => ({
      jobId: job.jobId,
      title: job.title,
      company: job.company,
      link: job.link,
      createdAt: job.createdAt
    }));
  } catch (error) {
    console.error('Error fetching bookmarked jobs:', error);
    throw error;
  }
}

export async function getUserSkills(uniquePresence) {
  try {
    const client = await clientPromise;
    console.log('uniquePresence:', uniquePresence);
    const db = client.db(process.env.MONGODB_DB_NAME || 'AI_Interview');

    const allCollections = await db.listCollections().toArray();

    const goalDoc = await db
      .collection('Goals')
      .findOne({ uniquePresence });
    
    if (!goalDoc || !goalDoc.skills) {
      return [];
    }
    
    return goalDoc.skills;
  } catch (error) {
    console.error('Error fetching user skills:', error);
    throw error;
  }
}
