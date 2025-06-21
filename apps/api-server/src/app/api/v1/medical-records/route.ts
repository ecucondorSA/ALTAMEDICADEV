import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createPaginationMeta, createSuccessResponse, validatePagination } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para crear récord médico
const CreateMedicalRecordSchema = z.object({
  patientId: z.string().min(1, 'ID del paciente es requerido'),
  doctorId: z.string().min(1, 'ID del doctor es requerido'),
  appointmentId: z.string().optional(),
  type: z.enum(['consultation', 'diagnosis', 'treatment', 'lab_result', 'imaging', 'surgery', 'emergency']),
  title: z.string().min(1, 'Título es requerido'),
  description: z.string().min(1, 'Descripción es requerida'),
  diagnosis: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
  treatments: z.array(z.string()).optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
  })).optional(),
  vitals: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.number().optional(),
    temperature: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  labResults: z.array(z.object({
    test: z.string(),
    result: z.string(),
    normalRange: z.string().optional(),
  })).optional(),
  attachments: z.array(z.string()).optional(),
  isConfidential: z.boolean().default(false),
});

// Schema para búsqueda de récords médicos
const MedicalRecordSearchSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  type: z.enum(['consultation', 'diagnosis', 'treatment', 'lab_result', 'imaging', 'surgery', 'emergency']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validar parámetros de búsqueda
    const searchData = MedicalRecordSearchSchema.parse(queryParams);
    const { page, limit } = validatePagination({
      page: searchData.page,
      limit: searchData.limit,
    });

    // Construir query de Firestore
    let query = adminDb.collection('medical_records');

    // Aplicar filtros
    if (searchData.patientId) {
      query = query.where('patientId', '==', searchData.patientId);
    }

    if (searchData.doctorId) {
      query = query.where('doctorId', '==', searchData.doctorId);
    }

    if (searchData.type) {
      query = query.where('type', '==', searchData.type);
    }

    // Filtros por fecha
    if (searchData.startDate && searchData.endDate) {
      const startDate = new Date(searchData.startDate);
      const endDate = new Date(searchData.endDate);
      query = query.where('createdAt', '>=', startDate).where('createdAt', '<=', endDate);
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
    const medicalRecords = [];

    for (const doc of snapshot.docs) {
      const recordData = doc.data();
      
      // Aplicar filtro de búsqueda por texto (post-query)
      if (searchData.search) {
        const searchTerm = searchData.search.toLowerCase();
        const searchableText = `${recordData.title} ${recordData.description}`.toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          continue;
        }
      }

      // Obtener información del doctor y paciente
      const [doctorDoc, patientDoc] = await Promise.all([
        adminDb.collection('users').doc(recordData.doctorId).get(),
        adminDb.collection('users').doc(recordData.patientId).get(),
      ]);

      medicalRecords.push({
        id: doc.id,
        ...recordData,
        createdAt: recordData.createdAt?.toDate?.() ?? recordData.createdAt,
        updatedAt: recordData.updatedAt?.toDate?.() ?? recordData.updatedAt,
        doctor: doctorDoc.exists ? {
          id: recordData.doctorId,
          firstName: doctorDoc.data()?.firstName,
          lastName: doctorDoc.data()?.lastName,
          email: doctorDoc.data()?.email,
        } : null,
        patient: patientDoc.exists ? {
          id: recordData.patientId,
          firstName: patientDoc.data()?.firstName,
          lastName: patientDoc.data()?.lastName,
          email: patientDoc.data()?.email,
        } : null,
      });
    }

    // Crear metadata de paginación
    const meta = createPaginationMeta(page, limit, total);

    return NextResponse.json(
      createSuccessResponse(medicalRecords, meta),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching medical records:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_MEDICAL_RECORDS_FAILED', 'Error al obtener récords médicos'),
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
    
    // Validar datos del récord médico
    const recordData = CreateMedicalRecordSchema.parse(body);

    // Verificar que el doctor y paciente existen
    const [doctorDoc, patientDoc] = await Promise.all([
      adminDb.collection('users').doc(recordData.doctorId).get(),
      adminDb.collection('users').doc(recordData.patientId).get(),
    ]);

    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    if (!patientDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'),
        { status: 404 }
      );
    }

    // Crear el récord médico
    const now = new Date();
    const medicalRecord = {
      ...recordData,
      recordNumber: `MR-${Date.now()}`,
      digitalSignature: `DR_${recordData.doctorId}_${Date.now()}`, // Simulación de firma digital
      encrypted: true, // Indicador de encriptación PHI
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection('medical_records').add(medicalRecord);

    return NextResponse.json(
      createSuccessResponse({
        id: docRef.id,
        ...medicalRecord,
        doctor: {
          id: recordData.doctorId,
          firstName: doctorDoc.data()?.firstName,
          lastName: doctorDoc.data()?.lastName,
          email: doctorDoc.data()?.email,
        },
        patient: {
          id: recordData.patientId,
          firstName: patientDoc.data()?.firstName,
          lastName: patientDoc.data()?.lastName,
          email: patientDoc.data()?.email,
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating medical record:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos del récord médico inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('CREATE_MEDICAL_RECORD_FAILED', 'Error al crear récord médico'),
      { status: 500 }
    );
  }
}
