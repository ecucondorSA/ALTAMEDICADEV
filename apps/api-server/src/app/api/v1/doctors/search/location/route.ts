import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createPaginationMeta, createSuccessResponse, validatePagination } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para búsqueda por ubicación
const LocationSearchSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  latitude: z.string().transform(val => parseFloat(val)),
  longitude: z.string().transform(val => parseFloat(val)),
  radiusKm: z.string().optional().transform(val => val ? parseFloat(val) : 10),
  specialty: z.string().optional(),
  isVerified: z.string().optional().transform(val => val === 'true'),
  minRating: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  sortBy: z.enum(['distance', 'rating', 'reviews', 'price']).optional().default('distance'),
});

interface DoctorWithDistance {
  id: string;
  distance: number;
  [key: string]: any;
}

// Función para calcular distancia entre dos puntos geográficos
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const searchData = LocationSearchSchema.parse(queryParams);
    const { page, limit } = validatePagination({
      page: searchData.page,
      limit: searchData.limit,
    });

    const { latitude, longitude, radiusKm } = searchData;

    // Construir query base
    let query = adminDb.collection('doctors');

    // Aplicar filtros
    if (searchData.specialty) {
      query = query.where('specialties', 'array-contains', searchData.specialty);
    }

    if (searchData.isVerified !== undefined) {
      query = query.where('isVerified', '==', searchData.isVerified);
    }

    if (searchData.minRating !== undefined) {
      query = query.where('rating', '>=', searchData.minRating);
    }

    const snapshot = await query.get();
    const doctorsWithDistance: DoctorWithDistance[] = [];

    for (const doc of snapshot.docs) {
      const doctorData = doc.data();
      
      // Obtener datos del usuario
      const userDoc = await adminDb.collection('users').doc(doc.id).get();
      const userData = userDoc.data();

      // Verificar si el doctor tiene ubicación
      if (doctorData.location && doctorData.location.latitude && doctorData.location.longitude) {
        const distance = calculateDistance(
          latitude,
          longitude,
          doctorData.location.latitude,
          doctorData.location.longitude
        );

        // Filtrar por radio
        if (distance <= radiusKm) {
          // Obtener información de la clínica/consultorio si existe
          let clinicInfo = null;
          if (doctorData.clinicId) {
            try {
              const clinicDoc = await adminDb.collection('clinics').doc(doctorData.clinicId).get();
              if (clinicDoc.exists) {
                const clinicData = clinicDoc.data();
                clinicInfo = {
                  id: doctorData.clinicId,
                  name: clinicData?.name,
                  address: clinicData?.address,
                  phone: clinicData?.phone,
                  facilities: clinicData?.facilities,
                };
              }
            } catch (error) {
              console.error('Error fetching clinic data:', error);
            }
          }

          doctorsWithDistance.push({
            id: doc.id,
            distance: Math.round(distance * 100) / 100, // Redondear a 2 decimales
            ...doctorData,
            // Datos del usuario
            firstName: userData?.firstName,
            lastName: userData?.lastName,
            email: userData?.email,
            phone: userData?.phone,
            avatar: userData?.avatar,
            // Información de la clínica
            clinic: clinicInfo,
            // Convertir timestamps
            createdAt: doctorData.createdAt?.toDate?.() ?? doctorData.createdAt,
            updatedAt: doctorData.updatedAt?.toDate?.() ?? doctorData.updatedAt,
          });
        }
      }
    }

    // Aplicar ordenamiento
    doctorsWithDistance.sort((a, b) => {
      switch (searchData.sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'reviews':
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        case 'price':
          return (a.consultationFee ?? 0) - (b.consultationFee ?? 0);
        default:
          return a.distance - b.distance;
      }
    });

    const total = doctorsWithDistance.length;

    // Aplicar paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDoctors = doctorsWithDistance.slice(startIndex, endIndex);

    // Calcular estadísticas
    const stats = {
      totalDoctors: total,
      averageDistance: doctorsWithDistance.length > 0 
        ? doctorsWithDistance.reduce((sum, doc) => sum + doc.distance, 0) / doctorsWithDistance.length
        : 0,
      nearestDoctor: doctorsWithDistance.length > 0 ? doctorsWithDistance[0] : null,
      specialties: [...new Set(doctorsWithDistance.flatMap(doc => doc.specialties ?? []))],
      searchRadius: radiusKm,
      searchLocation: { latitude, longitude },
    };

    const meta = createPaginationMeta(page, limit, total);

    return NextResponse.json(
      createSuccessResponse({
        doctors: paginatedDoctors,
        stats,
      }, meta),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error searching doctors by location:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('LOCATION_SEARCH_FAILED', 'Error en la búsqueda por ubicación'),
      { status: 500 }
    );
  }
}
