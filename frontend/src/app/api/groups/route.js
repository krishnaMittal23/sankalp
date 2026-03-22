import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb.js';
import predefinedGroups from '@/data/predefinedGroups.js';

async function authenticateRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Authorization header missing');

  const uniquePresence = authHeader.split('Bearer ')[1];
  if (!uniquePresence) throw new Error('Unauthorized - No token provided');

  return uniquePresence;
}

async function seedGroups(groupsCollection) {
  const existing = await groupsCollection.countDocuments();
  if (existing > 0) return;

  const docs = predefinedGroups.map((g) => ({
    ...g,
    members: [],
    createdAt: new Date(),
  }));

  await groupsCollection.insertMany(docs);
  console.log(`✅ Seeded ${docs.length} predefined groups`);
}

// GET — List all groups with member count and user's join status
export async function GET(request) {
  try {
    const uniquePresence = await authenticateRequest(request);

    const client = await clientPromise;
    const db = client.db('AI_Interview');
    const groupsCollection = db.collection('Groups');

    await seedGroups(groupsCollection);

    const groups = await groupsCollection.find({}).toArray();

    const data = groups.map((g) => ({
      _id: g._id.toString(),
      slug: g.slug,
      name: g.name,
      description: g.description,
      icon: g.icon,
      memberCount: g.members?.length || 0,
      isMember: g.members?.includes(uniquePresence) || false,
    }));

    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Groups GET error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message, data: [] },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// POST — Join a group
export async function POST(request) {
  try {
    const uniquePresence = await authenticateRequest(request);

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { status: 'error', message: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const { groupId } = body;
    if (!groupId) {
      return NextResponse.json(
        { status: 'error', message: 'groupId is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('AI_Interview');
    const groupsCollection = db.collection('Groups');
    const { ObjectId } = await import('mongodb');

    const result = await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $addToSet: { members: uniquePresence } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      message: 'Joined group successfully',
    });
  } catch (error) {
    console.error('Groups POST error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// DELETE — Leave a group
export async function DELETE(request) {
  try {
    const uniquePresence = await authenticateRequest(request);

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { status: 'error', message: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const { groupId } = body;
    if (!groupId) {
      return NextResponse.json(
        { status: 'error', message: 'groupId is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('AI_Interview');
    const groupsCollection = db.collection('Groups');
    const { ObjectId } = await import('mongodb');

    await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $pull: { members: uniquePresence } }
    );

    return NextResponse.json({
      status: 'success',
      message: 'Left group successfully',
    });
  } catch (error) {
    console.error('Groups DELETE error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
