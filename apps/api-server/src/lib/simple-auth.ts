/**
 * Simple Auth Helper for New Endpoints
 * Temporary auth utility until package dependencies are resolved
 */

import { NextRequest } from 'next/server';

export interface SimpleUser {
  id: string;
  email: string;
  role: 'admin' | 'doctor' | 'patient' | 'company';
  name: string;
  avatar?: string;
  company_id?: string;
}

export async function verifyAuthToken(request: NextRequest): Promise<{
  success: boolean;
  user?: SimpleUser;
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      };
    }

    // For now, return a mock user until proper auth is integrated
    // In production, this should verify the JWT token
    const token = authHeader.substring(7);
    
    if (!token || token === '') {
      return {
        success: false,
        error: 'Invalid token'
      };
    }

    // Mock user - replace with actual JWT verification
    return {
      success: true,
      user: {
        id: 'mock-user-id',
        email: 'test@altamedica.com',
        role: 'admin',
        name: 'Admin User',
        avatar: undefined,
        company_id: undefined
      }
    };

  } catch (error) {
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}
