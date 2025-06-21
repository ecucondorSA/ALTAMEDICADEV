/**
 * 🔔 NOTIFICATIONS API
 * Manage user notifications and alerts
 * 
 * GET /api/v1/notifications - List user notifications
 * POST /api/v1/notifications - Create new notification (Admin only)
 */

import { verifyAuthToken } from '@/lib/simple-auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

const db = getFirestore();

// Types
interface Notification {
  id: string;
  recipient_id: string;
  recipient_type: 'user' | 'doctor' | 'patient' | 'company' | 'all';
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'appointment' | 'prescription' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, unknown>;
  action_url?: string;
  action_text?: string;
  is_read: boolean;
  read_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/v1/notifications
 * List notifications for authenticated user
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
    const unread_only = searchParams.get('unread_only') === 'true';
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');

    // Build query for user's notifications
    let query = db.collection('notifications');

    // Filter by recipient
    query = query.where('recipient_id', 'in', [authResult.user.id, 'all']);

    // Filter by read status
    if (unread_only) {
      query = query.where('is_read', '==', false);
    }

    // Filter by type
    if (type) {
      query = query.where('type', '==', type);
    }

    // Filter by priority
    if (priority) {
      query = query.where('priority', '==', priority);
    }

    // Check for expired notifications
    const now = new Date().toISOString();
    query = query.where('expires_at', '>', now);

    // Sort by creation date (newest first)
    query = query.orderBy('created_at', 'desc');

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];

    // Get unread count
    const unreadSnapshot = await db.collection('notifications')
      .where('recipient_id', 'in', [authResult.user.id, 'all'])
      .where('is_read', '==', false)
      .where('expires_at', '>', now)
      .get();

    const unread_count = unreadSnapshot.size;

    // Get total count for pagination
    const totalSnapshot = await db.collection('notifications')
      .where('recipient_id', 'in', [authResult.user.id, 'all'])
      .where('expires_at', '>', now)
      .get();
    const total = totalSnapshot.size;

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unread_count,
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
    console.error('Notifications fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch notifications'
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/notifications
 * Create new notification (Admin/System only)
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

    // Check permissions (admin only for manual notifications)
    if (authResult.user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'message', 'recipient_id', 'type'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }

    // Validate enum values
    const validTypes = ['info', 'warning', 'success', 'error', 'appointment', 'prescription', 'system'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const validRecipientTypes = ['user', 'doctor', 'patient', 'company', 'all'];

    if (!validTypes.includes(body.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid notification type'
      }, { status: 400 });
    }

    const priority = body.priority || 'medium';
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid priority level'
      }, { status: 400 });
    }

    const recipientType = body.recipient_type || 'user';
    if (!validRecipientTypes.includes(recipientType)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid recipient type'
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const expiresAt = body.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days default

    const notification: Omit<Notification, 'id'> = {
      recipient_id: body.recipient_id,
      recipient_type: recipientType,
      title: body.title,
      message: body.message,
      type: body.type,
      priority,
      data: body.data || {},
      action_url: body.action_url,
      action_text: body.action_text,
      is_read: false,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now
    };

    // Handle bulk notifications for 'all' recipients
    if (body.recipient_id === 'all') {
      // Create notification template
      const notifications = [];
      
      // Get all active users if sending to all
      const usersSnapshot = await db.collection('users')
        .where('status', '==', 'active')
        .get();

      for (const userDoc of usersSnapshot.docs) {
        notifications.push({
          ...notification,
          recipient_id: userDoc.id
        });
      }

      // Batch create notifications
      const batch = db.batch();
      notifications.forEach(notif => {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, notif);
      });

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `${notifications.length} notifications created successfully`,
        data: {
          notifications_sent: notifications.length
        }
      }, { status: 201 });

    } else {
      // Single notification
      const docRef = await db.collection('notifications').add(notification);

      return NextResponse.json({
        success: true,
        data: {
          id: docRef.id,
          ...notification
        },
        message: 'Notification created successfully'
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Notification creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create notification'
    }, { status: 500 });
  }
}
