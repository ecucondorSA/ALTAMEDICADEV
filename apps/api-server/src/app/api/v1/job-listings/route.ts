/**
 * 💼 JOB LISTINGS API
 * CRUD operations for medical job positions
 * 
 * GET /api/v1/job-listings - List all job listings with filters
 * POST /api/v1/job-listings - Create new job listing
 */

import { verifyAuthToken } from '@/lib/simple-auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

const db = getFirestore();

// Types
interface JobListing {
  id: string;
  title: string;
  description: string;
  company: {
    id: string;
    name: string;
    logo?: string;
  };
  location: {
    city: string;
    state: string;
    country: string;
    remote: boolean;
  };
  position: {
    type: 'full_time' | 'part_time' | 'contract' | 'internship';
    specialty: string;
    experience_level: 'entry' | 'mid' | 'senior' | 'expert';
    salary: {
      min: number;
      max: number;
      currency: string;
    };
  };
  requirements: string[];
  benefits: string[];
  status: 'active' | 'paused' | 'closed' | 'filled';
  posted_at: string;
  expires_at: string;
  applications_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/v1/job-listings
 * List job listings with advanced filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const specialty = searchParams.get('specialty');
    const location = searchParams.get('location');
    const type = searchParams.get('type');
    const experience = searchParams.get('experience');
    const remote = searchParams.get('remote') === 'true';
    const company_id = searchParams.get('company_id');
    const status = searchParams.get('status') || 'active';
    const sort = searchParams.get('sort') || 'posted_at';
    const order = searchParams.get('order') || 'desc';    // Build query
    let query: any = db.collection('job_listings');

    // Apply filters
    if (specialty) {
      query = query.where('position.specialty', '==', specialty);
    }
    
    if (type) {
      query = query.where('position.type', '==', type);
    }
    
    if (experience) {
      query = query.where('position.experience_level', '==', experience);
    }
    
    if (remote) {
      query = query.where('location.remote', '==', true);
    }
    
    if (company_id) {
      query = query.where('company.id', '==', company_id);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }    // Apply sorting
    query = query.orderBy(sort, order);

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();    const job_listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as JobListing[];

    // Get total count for pagination
    const totalSnapshot = await db.collection('job_listings')
      .where('status', '==', status)
      .get();
    const total = totalSnapshot.size;

    // Filter by location if specified (text search)
    let filteredListings = job_listings;
    if (location) {
      const locationLower = location.toLowerCase();
      filteredListings = job_listings.filter(job => 
        job.location.city.toLowerCase().includes(locationLower) ||
        job.location.state.toLowerCase().includes(locationLower) ||
        job.location.country.toLowerCase().includes(locationLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        job_listings: filteredListings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          has_next: page * limit < total,
          has_prev: page > 1
        },
        filters: {
          specialty,
          location,
          type,
          experience,
          remote,
          company_id,
          status
        }
      }
    });

  } catch (error) {
    console.error('Job listings fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch job listings'
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/job-listings
 * Create new job listing (Companies/Admins only)
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

    // Check permissions (admin or company representative)
    if (!['admin', 'company'].includes(authResult.user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'company', 'location', 'position'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }

    // Validate company exists
    const companyDoc = await db.collection('companies').doc(body.company.id).get();
    if (!companyDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Company not found'
      }, { status: 400 });
    }

    const companyData = companyDoc.data();

    const now = new Date().toISOString();
    const expiresAt = body.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days default

    const jobListing: Omit<JobListing, 'id'> = {
      title: body.title,
      description: body.description,
      company: {
        id: body.company.id,
        name: companyData?.name || body.company.name,
        logo: companyData?.logo || body.company.logo
      },
      location: {
        city: body.location.city,
        state: body.location.state,
        country: body.location.country,
        remote: body.location.remote || false
      },
      position: {
        type: body.position.type || 'full_time',
        specialty: body.position.specialty,
        experience_level: body.position.experience_level || 'mid',
        salary: {
          min: body.position.salary?.min || 0,
          max: body.position.salary?.max || 0,
          currency: body.position.salary?.currency || 'USD'
        }
      },
      requirements: body.requirements || [],
      benefits: body.benefits || [],
      status: 'active',
      posted_at: now,
      expires_at: expiresAt,
      applications_count: 0,
      created_at: now,
      updated_at: now
    };

    // Create job listing
    const docRef = await db.collection('job_listings').add(jobListing);

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...jobListing
      },
      message: 'Job listing created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Job listing creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create job listing'
    }, { status: 500 });
  }
}
