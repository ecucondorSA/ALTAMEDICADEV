/**
 * 💬 CONVERSATION MESSAGES API
 * 
 * GET /api/v1/messages/[conversationId] - Get messages in conversation
 * PUT /api/v1/messages/[conversationId]/read - Mark all messages as read
 */

import { verifyAuthToken } from '@/lib/simple-auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

const db = getFirestore();

interface ConversationParams {
  params: {
    conversationId: string;
  };
}

/**
 * GET /api/v1/messages/[conversationId]
 * Get messages in a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: ConversationParams
) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { conversationId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Verify user is participant in conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 });
    }

    const conversationData = conversationDoc.data();
    
    if (!conversationData?.participants.includes(authResult.user.id)) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Get messages in conversation
    let query = db.collection('messages')
      .where('conversation_id', '==', conversationId)
      .orderBy('created_at', 'desc');

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Reverse to show oldest first
    messages.reverse();

    // Get total messages count
    const totalSnapshot = await db.collection('messages')
      .where('conversation_id', '==', conversationId)
      .get();
    const total = totalSnapshot.size;

    // Mark messages as read for current user
    const unreadMessages = await db.collection('messages')
      .where('conversation_id', '==', conversationId)
      .where('recipient_id', '==', authResult.user.id)
      .where('is_read', '==', false)
      .get();

    if (!unreadMessages.empty) {
      const batch = db.batch();
      const now = new Date().toISOString();

      unreadMessages.docs.forEach(doc => {
        batch.update(doc.ref, {
          is_read: true,
          read_at: now,
          updated_at: now
        });
      });

      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          id: conversationDoc.id,
          ...conversationData
        },
        messages,
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
    console.error('Conversation messages fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch conversation messages'
    }, { status: 500 });
  }
}

/**
 * PUT /api/v1/messages/[conversationId]
 * Update conversation settings
 */
export async function PUT(
  request: NextRequest,
  { params }: ConversationParams
) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { conversationId } = params;
    const body = await request.json();

    // Verify user is participant in conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 });
    }

    const conversationData = conversationDoc.data();
    
    if (!conversationData?.participants.includes(authResult.user.id)) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Prepare updates
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Handle status change (archive, block)
    if (body.status && ['active', 'archived', 'blocked'].includes(body.status)) {
      updates.status = body.status;
    }

    // Update conversation
    await db.collection('conversations').doc(conversationId).update(updates);

    // Get updated data
    const updatedDoc = await db.collection('conversations').doc(conversationId).get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json({
      success: true,
      data: updatedData,
      message: 'Conversation updated successfully'
    });

  } catch (error) {
    console.error('Conversation update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update conversation'
    }, { status: 500 });
  }
}
