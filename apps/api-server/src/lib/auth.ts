import { verifyIdToken } from '@altamedica/firebase';
import { ForbiddenError, logger, UnauthorizedError } from '@altamedica/shared';
import type { UserRole } from '@altamedica/types';
import { NextRequest } from 'next/server';

export interface AuthContext {
  uid: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
}

export async function authenticateRequest(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decodedToken = await verifyIdToken(idToken);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: (decodedToken.role as UserRole) || 'patient',
      isEmailVerified: decodedToken.email_verified || false,
    };
  } catch (error) {
    logger.error('Token verification failed', error);
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function requireAuth(handler: (request: NextRequest, auth: AuthContext) => Promise<Response>) {
  return async (request: NextRequest) => {
    try {
      const auth = await authenticateRequest(request);
      return await handler(request, auth);
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        return Response.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          },
          { status: error.statusCode }
        );
      }

      logger.error('Authentication error', error);
      return Response.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        },
        { status: 500 }
      );
    }
  };
}

export function requireRole(roles: UserRole | UserRole[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return function (handler: (request: NextRequest, auth: AuthContext) => Promise<Response>) {
    return requireAuth(async (request: NextRequest, auth: AuthContext) => {
      if (!allowedRoles.includes(auth.role)) {
        throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      return await handler(request, auth);
    });
  };
}

export function optionalAuth(handler: (request: NextRequest, auth?: AuthContext) => Promise<Response>) {
  return async (request: NextRequest) => {
    try {
      const auth = await authenticateRequest(request);
      return await handler(request, auth);
    } catch (error) {
      // If authentication fails, continue without auth context
      return await handler(request, undefined);
    }
  };
}

export async function verifyAuthToken(request: NextRequest): Promise<{
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    avatar?: string;
    company_id?: string;
  };
  error?: string;
}> {
  try {
    const auth = await authenticateRequest(request);
    return {
      success: true,
      user: {
        id: auth.uid,
        email: auth.email,
        role: auth.role,
        name: auth.email.split('@')[0], // Simple fallback for name
        avatar: undefined,
        company_id: undefined
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}
