import { adminDb } from '@altamedica/firebase';
import { 
  createErrorResponse, 
  createPaginationMeta, 
  createSuccessResponse, 
  validatePagination,
  processFirestoreDoc,
  type FirestoreDocumentSnapshot
} from '@altamedica/shared';
import { CreateDoctorProfileSchema, SpecialtySchema } from '@altamedica/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para query parameters de búsqueda
const DoctorSearchSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  specialty: SpecialtySchema.optional(),
  companyId: z.string().optional(),
  city: z.string().optional(),
  isVerified: z.string().optional().transform(val => val === 'true'),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validar parámetros de búsqueda
    const searchData = DoctorSearchSchema.parse(queryParams);
    const { page, limit } = validatePagination({
      page: searchData.page,
      limit: searchData.limit,
    });

    // Construir query de Firestore
    let query = adminDb.collection('doctors');

    // Aplicar filtros
    if (searchData.specialty) {
      query = query.where('specialties', 'array-contains', searchData.specialty);
    }

    if (searchData.companyId) {
      query = query.where('companyId', '==', searchData.companyId);
    }

    if (searchData.isVerified !== undefined) {
      query = query.where('isVerified', '==', searchData.isVerified);
    }

    // Ordenar por fecha de creación
    query = query.orderBy('createdAt', 'desc');

    // Obtener total de documentos para paginación
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Aplicar paginación
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);    const snapshot = await query.get();
    const doctors = [];

    for (const doc of snapshot.docs) {
      const doctorData = processFirestoreDoc(doc as FirestoreDocumentSnapshot);
      
      // Aplicar filtro de búsqueda por texto (post-query)
      if (searchData.search) {
        const searchTerm = searchData.search.toLowerCase();
        const searchableText = `${doctorData.firstName ?? ''} ${doctorData.lastName ?? ''} ${doctorData.bio ?? ''}`.toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          continue;
        }
      }

      // Obtener datos del usuario asociado
      const userDoc = await adminDb.collection('users').doc(doc.id).get();
      const userData = userDoc.exists ? processFirestoreDoc(userDoc as FirestoreDocumentSnapshot) : null;

      if (userData) {
        doctors.push({
          id: doc.id,
          ...doctorData,
          // Incluir datos del usuario
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          avatar: userData.avatar,
          createdAt: doctorData.createdAt,
          updatedAt: doctorData.updatedAt,
        });
      }
    }

    // Crear metadata de paginación
    const meta = createPaginationMeta(page, limit, total);

    return NextResponse.json(
      createSuccessResponse(doctors, meta),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching doctors:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_DOCTORS_FAILED', 'Error al obtener lista de doctores'),
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
    
    // Validar datos del doctor
    const doctorData = CreateDoctorProfileSchema.parse(body);    // Verificar que el usuario existe y es doctor
    const userDoc = await adminDb.collection('users').doc(body.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        createErrorResponse('USER_NOT_FOUND', 'Usuario no encontrado'),
        { status: 404 }
      );
    }

    const userData = processFirestoreDoc(userDoc as FirestoreDocumentSnapshot);
    if (userData?.role !== 'doctor') {
      return NextResponse.json(
        createErrorResponse('INVALID_ROLE', 'El usuario debe tener rol de doctor'),
        { status: 400 }
      );
    }

    // Verificar que no existe un perfil de doctor para este usuario
    const existingDoctor = await adminDb.collection('doctors').doc(body.uid).get();
    if (existingDoctor.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_PROFILE_EXISTS', 'Ya existe un perfil de doctor para este usuario'),
        { status: 409 }
      );
    }

    // Crear el perfil de doctor
    const now = new Date();
    const doctorProfile = {
      ...doctorData,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection('doctors').doc(body.uid).set(doctorProfile);

    return NextResponse.json(
      createSuccessResponse({
        id: body.uid,
        ...doctorProfile,
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
    console.error('Error creating doctor profile:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos del doctor inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('CREATE_DOCTOR_FAILED', 'Error al crear perfil de doctor'),
      { status: 500 }
    );
  }
}
