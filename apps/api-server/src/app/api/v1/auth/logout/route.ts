import { adminAuth } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('MISSING_TOKEN', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    // Revoke refresh tokens for the user
    await adminAuth.revokeRefreshTokens(uid);

    const responseData = {
      message: 'Logout exitoso',
      uid,
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 200 });
  } catch (error: any) {
    console.error('Logout error:', error);

    // Handle Firebase Auth errors
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        createErrorResponse('TOKEN_EXPIRED', 'Token expirado'),
        { status: 401 }
      );
    }

    if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json(
        createErrorResponse('INVALID_TOKEN', 'Token inválido'),
        { status: 401 }
      );
    }

    return NextResponse.json(
      createErrorResponse('LOGOUT_FAILED', 'Error en el logout'),
      { status: 500 }
    );
  }
}
