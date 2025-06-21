import { adminAuth, adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

    // Get user profile from Firestore
    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        createErrorResponse('USER_NOT_FOUND', 'Usuario no encontrado'),
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Check if user is active
    if (!userData?.isActive) {
      return NextResponse.json(
        createErrorResponse('USER_INACTIVE', 'Usuario inactivo'),
        { status: 403 }
      );
    }

    // Get role-specific profile
    let roleProfile = null;
    if (userData.role === 'doctor') {
      const doctorDoc = await adminDb.collection('doctors').doc(uid).get();
      roleProfile = doctorDoc.exists ? doctorDoc.data() : null;
    } else if (userData.role === 'patient') {
      const patientDoc = await adminDb.collection('patients').doc(uid).get();
      roleProfile = patientDoc.exists ? patientDoc.data() : null;
    } else if (userData.role === 'company') {
      const companyDoc = await adminDb.collection('companies').doc(uid).get();
      roleProfile = companyDoc.exists ? companyDoc.data() : null;
    }

    const responseData = {
      user: {
        uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        emailVerified: userData.emailVerified,
        phoneNumber: userData.phoneNumber,
        isActive: userData.isActive,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        metadata: userData.metadata,
      },
      roleProfile,
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 200 });
  } catch (error: any) {
    console.error('Get user error:', error);

    // Handle Firebase Auth errors
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        createErrorResponse('TOKEN_EXPIRED', 'Token expirado'),
        { status: 401 }
      );
    }

    if (error.code === 'auth/id-token-revoked') {
      return NextResponse.json(
        createErrorResponse('TOKEN_REVOKED', 'Token revocado'),
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
      createErrorResponse('GET_USER_FAILED', 'Error al obtener información del usuario'),
      { status: 500 }
    );
  }
}
