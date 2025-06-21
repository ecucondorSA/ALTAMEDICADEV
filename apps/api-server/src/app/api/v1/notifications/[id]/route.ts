/**
 * 🔔 INDIVIDUAL NOTIFICATION API
 * 
 * GET /api/v1/notifications/[id] - Get specific notification
 * PUT /api/v1/notifications/[id]/read - Mark notification as read
 * DELETE /api/v1/notifications/[id] - Delete notification
 */

import { verifyAuthToken } from '@/lib/simple-auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

const db = getFirestore();

interface NotificationParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/notifications/[id]
 * Get specific notification (owner only)
 */
export async function GET(
  request: NextRequest,
  { params }: NotificationParams
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

    const { id } = params;

    const notificationDoc = await db.collection('notifications').doc(id).get();
    
    if (!notificationDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Notification not found'
      }, { status: 404 });
    }

    const notificationData = notificationDoc.data();

    // Check if user owns this notification
    const isOwner = notificationData?.recipient_id === authResult.user.id || 
                   notificationData?.recipient_id === 'all';
    const isAdmin = authResult.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: notificationDoc.id,
        ...notificationData
      }
    });

  } catch (error) {
    console.error('Notification fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch notification'
    }, { status: 500 });
  }
}

/**
 * PUT /api/v1/notifications/[id]
 * Update notification (mark as read, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: NotificationParams
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

    const { id } = params;
    const body = await request.json();

    // Get existing notification
    const notificationDoc = await db.collection('notifications').doc(id).get();
    
    if (!notificationDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Notification not found'
      }, { status: 404 });
    }

    const notificationData = notificationDoc.data();

    // Check if user owns this notification
    const isOwner = notificationData?.recipient_id === authResult.user.id || 
                   notificationData?.recipient_id === 'all';
    const isAdmin = authResult.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Prepare update data
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Handle marking as read
    if (body.is_read !== undefined) {
      updates.is_read = body.is_read;
      if (body.is_read) {
        updates.read_at = new Date().toISOString();
      } else {
        updates.read_at = null;
      }
    }

    // Update notification
    await db.collection('notifications').doc(id).update(updates);

    // Get updated data
    const updatedDoc = await db.collection('notifications').doc(id).get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json({
      success: true,
      data: updatedData,
      message: 'Notification updated successfully'
    });

  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update notification'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/notifications/[id]
 * Delete notification (owner or admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: NotificationParams
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

    const { id } = params;

    // Get existing notification
    const notificationDoc = await db.collection('notifications').doc(id).get();
    
    if (!notificationDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Notification not found'
      }, { status: 404 });
    }

    const notificationData = notificationDoc.data();

    // Check if user owns this notification
    const isOwner = notificationData?.recipient_id === authResult.user.id || 
                   notificationData?.recipient_id === 'all';
    const isAdmin = authResult.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Delete notification
    await db.collection('notifications').doc(id).delete();

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Notification deletion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete notification'
    }, { status: 500 });
  }
}
