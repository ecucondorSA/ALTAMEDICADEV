/**
 * 💼 INDIVIDUAL JOB LISTING API
 * 
 * GET /api/v1/job-listings/[id] - Get specific job listing
 * PUT /api/v1/job-listings/[id] - Update job listing  
 * DELETE /api/v1/job-listings/[id] - Close/remove job listing
 */

import { verifyAuthToken } from '@/lib/simple-auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

const db = getFirestore();

interface JobParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/job-listings/[id]
 * Get specific job listing with application stats
 */
export async function GET(
  request: NextRequest,
  { params }: JobParams
) {
  try {
    const { id } = params;

    const jobDoc = await db.collection('job_listings').doc(id).get();
    
    if (!jobDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Job listing not found'
      }, { status: 404 });
    }

    const jobData = { id: jobDoc.id, ...jobDoc.data() };

    // Get application statistics (if requested)
    const includeStats = new URL(request.url).searchParams.get('include_stats') === 'true';
    
    if (includeStats) {
      const applicationsSnapshot = await db.collection('job_applications')
        .where('job_listing_id', '==', id)
        .get();
      
      const applications = applicationsSnapshot.docs.map(doc => doc.data());
      
      const stats = {
        total_applications: applications.length,
        status_breakdown: {
          pending: applications.filter(app => app.status === 'pending').length,
          reviewing: applications.filter(app => app.status === 'reviewing').length,
          interviewed: applications.filter(app => app.status === 'interviewed').length,
          hired: applications.filter(app => app.status === 'hired').length,
          rejected: applications.filter(app => app.status === 'rejected').length
        },
        recent_applications: applications.slice(0, 5)
      };

      jobData.application_stats = stats;
    }

    return NextResponse.json({
      success: true,
      data: jobData
    });

  } catch (error) {
    console.error('Job listing fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch job listing'
    }, { status: 500 });
  }
}

/**
 * PUT /api/v1/job-listings/[id]
 * Update job listing (Company/Admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: JobParams
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

    // Get existing job listing
    const jobDoc = await db.collection('job_listings').doc(id).get();
    
    if (!jobDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Job listing not found'
      }, { status: 404 });
    }

    const jobData = jobDoc.data();

    // Check permissions
    const isAdmin = authResult.user.role === 'admin';
    const isCompanyOwner = authResult.user.role === 'company' && 
                          authResult.user.company_id === jobData?.company?.id;

    if (!isAdmin && !isCompanyOwner) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }    // Prepare update data
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'location', 'position', 
      'requirements', 'benefits', 'status', 'expires_at'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate status changes
    if (body.status && !['active', 'paused', 'closed', 'filled'].includes(body.status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status value'
      }, { status: 400 });
    }

    // Update job listing
    await db.collection('job_listings').doc(id).update(updates);

    // Get updated data
    const updatedDoc = await db.collection('job_listings').doc(id).get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json({
      success: true,
      data: updatedData,
      message: 'Job listing updated successfully'
    });

  } catch (error) {
    console.error('Job listing update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update job listing'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/job-listings/[id]
 * Close/remove job listing (Company/Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: JobParams
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

    // Get existing job listing
    const jobDoc = await db.collection('job_listings').doc(id).get();
    
    if (!jobDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Job listing not found'
      }, { status: 404 });
    }

    const jobData = jobDoc.data();

    // Check permissions
    const isAdmin = authResult.user.role === 'admin';
    const isCompanyOwner = authResult.user.role === 'company' && 
                          authResult.user.company_id === jobData?.company?.id;

    if (!isAdmin && !isCompanyOwner) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Check if permanent deletion is requested
    const permanent = new URL(request.url).searchParams.get('permanent') === 'true';

    if (permanent && authResult.user.role === 'admin') {
      // Permanent deletion (admin only)
      await db.collection('job_listings').doc(id).delete();
      
      return NextResponse.json({
        success: true,
        message: 'Job listing permanently deleted'
      });
    } else {
      // Soft delete - mark as closed
      await db.collection('job_listings').doc(id).update({
        status: 'closed',
        updated_at: new Date().toISOString(),
        closed_at: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Job listing closed successfully'
      });
    }

  } catch (error) {
    console.error('Job listing deletion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete job listing'
    }, { status: 500 });
  }
}
