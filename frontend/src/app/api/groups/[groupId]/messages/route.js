import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb.js';
import { ObjectId } from 'mongodb';

async function authenticateRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Authorization header missing');

  const uniquePresence = authHeader.split('Bearer ')[1];
  if (!uniquePresence) throw new Error('Unauthorized - No token provided');

  return uniquePresence;
}

// GET — Fetch group message history
export async function GET(request, { params }) {
  try {
    const uniquePresence = await authenticateRequest(request);
    const { groupId } = await params;

    if (!groupId) {
      return NextResponse.json(
        { status: 'error', message: 'groupId is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('AI_Interview');

    // Verify user is a member
    const group = await db.collection('Groups').findOne({
      _id: new ObjectId(groupId),
      members: uniquePresence,
    });

    if (!group) {
      return NextResponse.json(
        { status: 'error', message: 'Group not found or not a member' },
        { status: 403 }
      );
    }

    const messages = await db
      .collection('Chats')
      .find({ groupId })
      .sort({ timestamp: 1 })
      .toArray();

    // Mark messages as read by this user
    if (messages.length > 0) {
      await db.collection('Chats').updateMany(
        {
          groupId,
          'readBy.userId': { $ne: uniquePresence },
        },
        {
          $addToSet: { readBy: { userId: uniquePresence, readAt: new Date() } },
        }
      );
    }

    return NextResponse.json({ status: 'success', data: messages });
  } catch (error) {
    console.error('Group messages GET error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message, data: [] },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// POST — Send a group message (REST fallback)
export async function POST(request, { params }) {
  try {
    const uniquePresence = await authenticateRequest(request);
    const { groupId } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { status: 'error', message: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const { senderName, message } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { status: 'error', message: 'message is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('AI_Interview');

    // Verify membership
    const group = await db.collection('Groups').findOne({
      _id: new ObjectId(groupId),
      members: uniquePresence,
    });

    if (!group) {
      return NextResponse.json(
        { status: 'error', message: 'Group not found or not a member' },
        { status: 403 }
      );
    }

    const chatMessage = {
      _id: new ObjectId(),
      senderId: uniquePresence,
      senderName: senderName || 'Unknown',
      groupId,
      message: message.trim(),
      timestamp: new Date(),
      readBy: [{ userId: uniquePresence, readAt: new Date() }],
    };

    await db.collection('Chats').insertOne(chatMessage);

    return NextResponse.json({
      status: 'success',
      message: 'Message sent',
      data: chatMessage,
    });
  } catch (error) {
    console.error('Group message POST error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
