import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para actualizar empresa
const UpdateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['clinic', 'hospital', 'healthcare_network', 'insurance', 'pharmacy']).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
  }).optional(),
  specialties: z.array(z.string()).optional(),
  numberOfEmployees: z.number().min(1).optional(),
  licenseNumber: z.string().optional(),
  isVerified: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "Al menos un campo debe ser proporcionado para actualizar"
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Obtener empresa
    const companyDoc = await adminDb.collection('companies').doc(id).get();
    if (!companyDoc.exists) {
      return NextResponse.json(
        createErrorResponse('COMPANY_NOT_FOUND', 'Empresa no encontrada'),
        { status: 404 }
      );
    }

    const companyData = companyDoc.data()!;

    // Obtener estadísticas detalladas
    const [doctorsSnapshot, jobsSnapshot, appointmentsSnapshot] = await Promise.all([
      adminDb.collection('doctors').where('companyId', '==', id).get(),
      adminDb.collection('job-listings').where('companyId', '==', id).get(),
      adminDb.collection('appointments').where('companyId', '==', id).get(),
    ]);    const doctors = doctorsSnapshot.docs.map((doc: {id: string; data: () => any}) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const jobs = jobsSnapshot.docs.map((doc: {id: string; data: () => any}) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() ?? doc.data().createdAt,
    }));

    const appointments = appointmentsSnapshot.docs.map((doc: {id: string; data: () => any}) => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate?.() ?? doc.data().scheduledAt,
    }));

    // Calcular estadísticas
    const verifiedDoctors = doctors.filter((doc: {isVerified: boolean}) => doc.isVerified).length;
    const activeJobs = jobs.filter((job: {status: string}) => job.status === 'active').length;
    const completedAppointments = appointments.filter((apt: {status: string}) => apt.status === 'completed').length;

    const company = {
      id: companyDoc.id,
      ...companyData,
      createdAt: companyData.createdAt?.toDate?.() ?? companyData.createdAt,
      updatedAt: companyData.updatedAt?.toDate?.() ?? companyData.updatedAt,
      
      // Estadísticas detalladas
      stats: {
        doctors: {
          total: doctors.length,
          verified: verifiedDoctors,
          unverified: doctors.length - verifiedDoctors,
        },
        jobs: {
          total: jobs.length,
          active: activeJobs,
          closed: jobs.length - activeJobs,
        },
        appointments: {
          total: appointments.length,
          completed: completedAppointments,
          cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
        },
      },

      // Doctores recientes
      recentDoctors: doctors
        .sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() ?? new Date(a.createdAt);
          const bDate = b.createdAt?.toDate?.() ?? new Date(b.createdAt);
          return bDate.getTime() - aDate.getTime();
        })
        .slice(0, 5),

      // Trabajos activos
      activeJobs: jobs
        .filter(job => job.status === 'active')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    };

    return NextResponse.json(
      createSuccessResponse(company),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      createErrorResponse('FETCH_COMPANY_FAILED', 'Error al obtener empresa'),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Validar datos de actualización
    const updateData = UpdateCompanySchema.parse(body);

    // Verificar que la empresa existe
    const companyDoc = await adminDb.collection('companies').doc(id).get();
    if (!companyDoc.exists) {
      return NextResponse.json(
        createErrorResponse('COMPANY_NOT_FOUND', 'Empresa no encontrada'),
        { status: 404 }
      );
    }

    // Si se actualiza el nombre, verificar que no existe otra empresa con el mismo nombre
    if (updateData.name) {
      const existingCompany = await adminDb
        .collection('companies')
        .where('name', '==', updateData.name)
        .get();

      const hasConflict = existingCompany.docs.some(doc => doc.id !== id);
      if (hasConflict) {
        return NextResponse.json(
          createErrorResponse('COMPANY_NAME_EXISTS', 'Ya existe otra empresa con este nombre'),
          { status: 409 }
        );
      }
    }

    // Actualizar empresa
    const now = new Date();
    await adminDb.collection('companies').doc(id).update({
      ...updateData,
      updatedAt: now,
    });

    // Obtener empresa actualizada
    const updatedDoc = await adminDb.collection('companies').doc(id).get();
    const updatedData = updatedDoc.data()!;

    return NextResponse.json(
      createSuccessResponse({
        id,
        ...updatedData,
        createdAt: updatedData.createdAt?.toDate?.() ?? updatedData.createdAt,
        updatedAt: updatedData.updatedAt?.toDate?.() ?? updatedData.updatedAt,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating company:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de actualización inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('UPDATE_COMPANY_FAILED', 'Error al actualizar empresa'),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const { id } = params;

    // Verificar que la empresa existe
    const companyDoc = await adminDb.collection('companies').doc(id).get();
    if (!companyDoc.exists) {
      return NextResponse.json(
        createErrorResponse('COMPANY_NOT_FOUND', 'Empresa no encontrada'),
        { status: 404 }
      );
    }

    // Verificar que no hay doctores activos asociados
    const doctorsSnapshot = await adminDb
      .collection('doctors')
      .where('companyId', '==', id)
      .get();

    if (!doctorsSnapshot.empty) {
      return NextResponse.json(
        createErrorResponse('COMPANY_HAS_DOCTORS', 'No se puede eliminar una empresa con doctores asociados'),
        { status: 409 }
      );
    }

    // Soft delete - marcar como inactiva
    await adminDb.collection('companies').doc(id).update({
      isActive: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      createSuccessResponse({ message: 'Empresa eliminada exitosamente' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      createErrorResponse('DELETE_COMPANY_FAILED', 'Error al eliminar empresa'),
      { status: 500 }
    );
  }
}
