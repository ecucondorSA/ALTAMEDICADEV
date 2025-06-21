import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createPaginationMeta, createSuccessResponse, validatePagination } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para crear empresa
const CreateCompanySchema = z.object({
  name: z.string().min(1, 'Nombre de la empresa es requerido'),
  description: z.string().optional(),
  type: z.enum(['clinic', 'hospital', 'healthcare_network', 'insurance', 'pharmacy']),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().default('Mexico'),
  }),
  contact: z.object({
    phone: z.string(),
    email: z.string().email(),
    website: z.string().url().optional(),
  }),
  specialties: z.array(z.string()).optional(),
  numberOfEmployees: z.number().min(1).optional(),
  licenseNumber: z.string().optional(),
  isVerified: z.boolean().default(false),
});

// Schema para búsqueda de empresas
const CompanySearchSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  type: z.enum(['clinic', 'hospital', 'healthcare_network', 'insurance', 'pharmacy']).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  isVerified: z.boolean().optional(),
  search: z.string().optional(),
  specialty: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const searchData = CompanySearchSchema.parse(queryParams);
    const { page, limit } = validatePagination({
      page: searchData.page,
      limit: searchData.limit,
    });

    // Construir query de Firestore
    let query = adminDb.collection('companies');

    // Aplicar filtros
    if (searchData.type) {
      query = query.where('type', '==', searchData.type);
    }

    if (searchData.isVerified !== undefined) {
      query = query.where('isVerified', '==', searchData.isVerified);
    }

    // Ordenar por fecha de creación
    query = query.orderBy('createdAt', 'desc');

    // Obtener total para paginación
    const totalSnapshot = await query.get();
    let companies = totalSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() ?? doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() ?? doc.data().updatedAt,
    }));

    // Aplicar filtros post-query
    if (searchData.search) {
      const searchTerm = searchData.search.toLowerCase();
      companies = companies.filter(company => 
        company.name.toLowerCase().includes(searchTerm) ||
        company.description?.toLowerCase().includes(searchTerm) ||
        company.address?.city.toLowerCase().includes(searchTerm)
      );
    }

    if (searchData.city) {
      companies = companies.filter(company => 
        company.address?.city.toLowerCase().includes(searchData.city!.toLowerCase())
      );
    }

    if (searchData.state) {
      companies = companies.filter(company => 
        company.address?.state.toLowerCase().includes(searchData.state!.toLowerCase())
      );
    }

    if (searchData.specialty) {
      companies = companies.filter(company => 
        company.specialties?.some((spec: string) => 
          spec.toLowerCase().includes(searchData.specialty!.toLowerCase())
        )
      );
    }

    const total = companies.length;

    // Aplicar paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCompanies = companies.slice(startIndex, endIndex);

    // Enriquecer con estadísticas
    const enrichedCompanies = await Promise.all(
      paginatedCompanies.map(async (company) => {
        // Obtener estadísticas de doctores y empleos
        const [doctorsSnapshot, jobsSnapshot] = await Promise.all([
          adminDb.collection('doctors').where('companyId', '==', company.id).get(),
          adminDb.collection('job-listings').where('companyId', '==', company.id).get(),
        ]);

        return {
          ...company,
          stats: {
            doctorsCount: doctorsSnapshot.size,
            activeJobsCount: jobsSnapshot.docs.filter(doc => doc.data().status === 'active').length,
            totalJobsCount: jobsSnapshot.size,
          },
        };
      })
    );

    const meta = createPaginationMeta(page, limit, total);

    return NextResponse.json(
      createSuccessResponse(enrichedCompanies, meta),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching companies:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_COMPANIES_FAILED', 'Error al obtener empresas'),
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
    const companyData = CreateCompanySchema.parse(body);

    // Verificar que no existe una empresa con el mismo nombre
    const existingCompany = await adminDb
      .collection('companies')
      .where('name', '==', companyData.name)
      .get();

    if (!existingCompany.empty) {
      return NextResponse.json(
        createErrorResponse('COMPANY_EXISTS', 'Ya existe una empresa con este nombre'),
        { status: 409 }
      );
    }

    // Crear la empresa
    const now = new Date();
    const company = {
      ...companyData,
      createdAt: now,
      updatedAt: now,
      stats: {
        doctorsCount: 0,
        totalJobsCount: 0,
        activeJobsCount: 0,
      },
    };

    const docRef = await adminDb.collection('companies').add(company);

    return NextResponse.json(
      createSuccessResponse({
        id: docRef.id,
        ...company,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating company:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de empresa inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('CREATE_COMPANY_FAILED', 'Error al crear empresa'),
      { status: 500 }
    );
  }
}
