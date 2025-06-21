import { adminAuth, adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { RegisterSchema } from '@altamedica/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input using Zod schema
    const validatedData = RegisterSchema.parse(body);
    const { email, password, firstName, lastName, role, phoneNumber } = validatedData;

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      phoneNumber,
      emailVerified: false,
    });

    // Set custom claims based on role
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role,
      altamedicaUser: true,
      createdAt: Date.now(),
    });

    // Save user profile in Firestore
    const userProfile = {
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      role,
      phoneNumber: phoneNumber || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false,
      isActive: true,
      metadata: {
        lastSignIn: null,
        signInCount: 0,
      },
    };

    await adminDb.collection('users').doc(userRecord.uid).set(userProfile);

    // Create role-specific profile
    if (role === 'doctor') {
      await adminDb.collection('doctors').doc(userRecord.uid).set({
        userId: userRecord.uid,
        specialties: [],
        license: null,
        education: [],
        experience: [],
        availability: {},
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        createdAt: new Date(),
      });
    } else if (role === 'patient') {
      await adminDb.collection('patients').doc(userRecord.uid).set({
        userId: userRecord.uid,
        dateOfBirth: null,
        gender: null,
        bloodType: null,
        allergies: [],
        medications: [],
        emergencyContact: null,
        medicalHistory: [],
        createdAt: new Date(),
      });
    } else if (role === 'company') {
      await adminDb.collection('companies').doc(userRecord.uid).set({
        userId: userRecord.uid,
        companyName: `${firstName} ${lastName}`,
        industry: null,
        size: null,
        description: null,
        website: null,
        address: null,
        isVerified: false,
        subscription: 'basic',
        createdAt: new Date(),
      });
    }

    // Generate custom token for immediate login
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    const responseData = {
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role,
        emailVerified: userRecord.emailVerified,
      },
      customToken,
      message: 'Usuario registrado exitosamente',
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        createErrorResponse('EMAIL_EXISTS', 'El email ya está registrado'),
        { status: 409 }
      );
    }

    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        createErrorResponse('INVALID_EMAIL', 'Email inválido'),
        { status: 400 }
      );
    }

    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        createErrorResponse('WEAK_PASSWORD', 'La contraseña debe tener al menos 6 caracteres'),
        { status: 400 }
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
      createErrorResponse('REGISTRATION_FAILED', 'Error en el registro'),
      { status: 500 }
    );
  }
}
