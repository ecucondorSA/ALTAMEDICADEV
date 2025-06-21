/**
 * 🔔 BULK NOTIFICATION OPERATIONS
 * Mark all notifications as read for authenticated user
 * 
 * PUT /api/v1/notifications/mark-all-read
 */

import { verifyAuthToken } from '@/lib/simple-auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

const db = getFirestore();

/**
 * PUT /api/v1/notifications/mark-all-read
 * Mark all user notifications as read
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get all unread notifications for user
    const snapshot = await db.collection('notifications')
      .where('recipient_id', 'in', [authResult.user.id, 'all'])
      .where('is_read', '==', false)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No unread notifications found',
        data: { marked_count: 0 }
      });
    }

    // Batch update all notifications
    const batch = db.batch();
    const now = new Date().toISOString();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        is_read: true,
        read_at: now,
        updated_at: now
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${snapshot.size} notifications marked as read`,
      data: {
        marked_count: snapshot.size
      }
    });

  } catch (error) {
    console.error('Bulk mark read error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to mark notifications as read'
    }, { status: 500 });
  }
}
