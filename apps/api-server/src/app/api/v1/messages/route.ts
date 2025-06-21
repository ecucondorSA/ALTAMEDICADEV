/**
 * 💬 MESSAGES API
 * User-to-user messaging and conversations
 * 
 * GET /api/v1/messages - List conversations for user
 * POST /api/v1/messages - Send new message
 */

import { verifyAuthToken } from '@/lib/simple-auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

const db = getFirestore();

// Types
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  recipient_id: string;
  recipient: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  content: string;
  type: 'text' | 'image' | 'file' | 'appointment_request';
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  participants: string[];
  participant_details: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  last_message: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  unread_count: number;
  type: 'direct' | 'group' | 'support';
  status: 'active' | 'archived' | 'blocked';
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/v1/messages
 * List conversations for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const type = searchParams.get('type'); // 'direct', 'group', 'support'
    const status = searchParams.get('status') || 'active';

    // Get conversations where user is a participant
    let query = db.collection('conversations')
      .where('participants', 'array-contains', authResult.user.id);

    // Apply filters
    if (type) {
      query = query.where('type', '==', type);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    // Sort by last message time
    query = query.orderBy('updated_at', 'desc');

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    
    const conversations = [];

    for (const doc of snapshot.docs) {
      const conversationData = doc.data();
      
      // Get unread count for this user
      const unreadSnapshot = await db.collection('messages')
        .where('conversation_id', '==', doc.id)
        .where('recipient_id', '==', authResult.user.id)
        .where('is_read', '==', false)
        .get();

      const conversation: Conversation = {
        id: doc.id,
        ...conversationData,
        unread_count: unreadSnapshot.size
      } as Conversation;

      conversations.push(conversation);
    }

    // Get total conversations count
    const totalSnapshot = await db.collection('conversations')
      .where('participants', 'array-contains', authResult.user.id)
      .where('status', '==', status)
      .get();
    const total = totalSnapshot.size;

    // Get total unread messages count
    const totalUnreadSnapshot = await db.collection('messages')
      .where('recipient_id', '==', authResult.user.id)
      .where('is_read', '==', false)
      .get();

    return NextResponse.json({
      success: true,
      data: {
        conversations,
        total_unread: totalUnreadSnapshot.size,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          has_next: page * limit < total,
          has_prev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Conversations fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch conversations'
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/messages
 * Send new message
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['recipient_id', 'content'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }

    // Validate recipient exists
    const recipientDoc = await db.collection('users').doc(body.recipient_id).get();
    if (!recipientDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Recipient not found'
      }, { status: 400 });
    }

    const recipientData = recipientDoc.data();
    const senderData = authResult.user;

    // Find or create conversation
    let conversationId = body.conversation_id;
    
    if (!conversationId) {
      // Look for existing conversation between these users
      const existingConversations = await db.collection('conversations')
        .where('participants', 'array-contains', authResult.user.id)
        .where('type', '==', 'direct')
        .get();

      let existingConversation = null;
      for (const doc of existingConversations.docs) {
        const data = doc.data();
        if (data.participants.includes(body.recipient_id) && data.participants.length === 2) {
          existingConversation = doc;
          break;
        }
      }

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const newConversation = {
          participants: [authResult.user.id, body.recipient_id],
          participant_details: [
            {
              id: senderData.id,
              name: senderData.name,
              role: senderData.role,
              avatar: senderData.avatar
            },
            {
              id: recipientData.id,
              name: recipientData.name,
              role: recipientData.role,
              avatar: recipientData.avatar
            }
          ],
          type: 'direct',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const conversationRef = await db.collection('conversations').add(newConversation);
        conversationId = conversationRef.id;
      }
    }

    const now = new Date().toISOString();

    // Create message
    const message: Omit<Message, 'id'> = {
      conversation_id: conversationId,
      sender_id: authResult.user.id,
      sender: {
        id: senderData.id,
        name: senderData.name,
        role: senderData.role,
        avatar: senderData.avatar
      },
      recipient_id: body.recipient_id,
      recipient: {
        id: recipientData.id,
        name: recipientData.name,
        role: recipientData.role,
        avatar: recipientData.avatar
      },
      content: body.content,
      type: body.type || 'text',
      metadata: body.metadata || {},
      is_read: false,
      created_at: now,
      updated_at: now
    };

    const messageRef = await db.collection('messages').add(message);

    // Update conversation with last message
    await db.collection('conversations').doc(conversationId).update({
      last_message: {
        content: body.content,
        sender_id: authResult.user.id,
        created_at: now
      },
      updated_at: now
    });

    return NextResponse.json({
      success: true,
      data: {
        id: messageRef.id,
        ...message,
        conversation_id: conversationId
      },
      message: 'Message sent successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Message send error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send message'
    }, { status: 500 });
  }
}
