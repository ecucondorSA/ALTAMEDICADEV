import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createPaginationMeta, createSuccessResponse, validatePagination } from '@altamedica/shared';
import { CreatePatientProfileSchema } from '@altamedica/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para query parameters de búsqueda de pacientes
const PatientSearchSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  gender: z.enum(['male', 'female', 'other']).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  isActive: z.string().optional().transform(val => val === 'true'),
  hasInsurance: z.string().optional().transform(val => val === 'true'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validar parámetros de búsqueda
    const searchData = PatientSearchSchema.parse(queryParams);
    const { page, limit } = validatePagination({
      page: searchData.page,
      limit: searchData.limit,
    });

    // Construir query de Firestore
    let query = adminDb.collection('patients');

    // Aplicar filtros
    if (searchData.gender) {
      query = query.where('gender', '==', searchData.gender);
    }

    if (searchData.bloodType) {
      query = query.where('bloodType', '==', searchData.bloodType);
    }

    if (searchData.isActive !== undefined) {
      query = query.where('isActive', '==', searchData.isActive);
    }

    // Ordenar por fecha de creación
    query = query.orderBy('createdAt', 'desc');

    // Obtener total de documentos para paginación
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Aplicar paginación
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const patients = [];

    for (const doc of snapshot.docs) {
      const patientData = doc.data();
      
      // Aplicar filtro de búsqueda por texto (post-query)
      if (searchData.search) {
        const searchTerm = searchData.search.toLowerCase();
        const searchableText = `${patientData.firstName ?? ''} ${patientData.lastName ?? ''} ${patientData.email ?? ''}`.toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          continue;
        }
      }

      // Aplicar filtro de seguro (post-query)
      if (searchData.hasInsurance !== undefined) {
        const hasInsurance = patientData.insurance && Object.keys(patientData.insurance).length > 0;
        if (searchData.hasInsurance && !hasInsurance) continue;
        if (!searchData.hasInsurance && hasInsurance) continue;
      }

      // Obtener datos del usuario asociado
      const userDoc = await adminDb.collection('users').doc(doc.id).get();
      const userData = userDoc.data();

      if (userData) {
        patients.push({
          id: doc.id,
          ...patientData,
          // Incluir datos del usuario (datos no sensibles)
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          avatar: userData.avatar,
          isActive: userData.isActive,
          createdAt: patientData.createdAt?.toDate?.() ?? patientData.createdAt,
          updatedAt: patientData.updatedAt?.toDate?.() ?? patientData.updatedAt,
        });
      }
    }

    // Crear metadata de paginación
    const meta = createPaginationMeta(page, limit, total);

    return NextResponse.json(
      createSuccessResponse(patients, meta),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching patients:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_PATIENTS_FAILED', 'Error al obtener lista de pacientes'),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validar datos del paciente
    const patientData = CreatePatientProfileSchema.parse(body);

    // Verificar que el usuario existe y es paciente
    const userDoc = await adminDb.collection('users').doc(body.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        createErrorResponse('USER_NOT_FOUND', 'Usuario no encontrado'),
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (userData?.role !== 'patient') {
      return NextResponse.json(
        createErrorResponse('INVALID_ROLE', 'El usuario debe tener rol de paciente'),
        { status: 400 }
      );
    }

    // Verificar que no existe un perfil de paciente para este usuario
    const existingPatient = await adminDb.collection('patients').doc(body.uid).get();
    if (existingPatient.exists) {
      return NextResponse.json(
        createErrorResponse('PATIENT_PROFILE_EXISTS', 'Ya existe un perfil de paciente para este usuario'),
        { status: 409 }
      );
    }

    // Crear el perfil de paciente
    const now = new Date();
    const patientProfile = {
      ...patientData,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection('patients').doc(body.uid).set(patientProfile);

    return NextResponse.json(
      createSuccessResponse({
        id: body.uid,
        ...patientProfile,
        // Incluir datos del usuario
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        avatar: userData.avatar,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating patient profile:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos del paciente inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('CREATE_PATIENT_FAILED', 'Error al crear perfil de paciente'),
      { status: 500 }
    );
  }
}
