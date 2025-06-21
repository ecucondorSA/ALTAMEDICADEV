import { adminAuth, adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { VerifyTokenSchema } from '@altamedica/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input using Zod schema
    const { idToken } = VerifyTokenSchema.parse(body);

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;

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

    // Update user metadata
    await adminDb.collection('users').doc(uid).update({
      'metadata.lastSignIn': new Date(),
      'metadata.signInCount': (userData.metadata?.signInCount || 0) + 1,
      updatedAt: new Date(),
    });

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

    // Generate new custom token
    const customToken = await adminAuth.createCustomToken(uid, {
      role: userData.role,
      altamedicaUser: true,
    });

    const responseData = {
      user: {
        uid,
        email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        emailVerified: userData.emailVerified,
        phoneNumber: userData.phoneNumber,
        isActive: userData.isActive,
        metadata: userData.metadata,
      },
      roleProfile,
      customToken,
      message: 'Login exitoso',
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 200 });
  } catch (error: any) {
    console.error('Login error:', error);

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

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de entrada inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('LOGIN_FAILED', 'Error en el login'),
      { status: 500 }
    );
  }
}
