import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createPaginationMeta, createSuccessResponse, validatePagination } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para consulta de reseñas
const ReviewsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  rating: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  sortBy: z.enum(['newest', 'oldest', 'rating_high', 'rating_low']).optional().default('newest'),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: doctorId } = params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const queryData = ReviewsQuerySchema.parse(queryParams);
    const { page, limit } = validatePagination({
      page: queryData.page,
      limit: queryData.limit,
    });

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(doctorId).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    // Construir query de reseñas
    let query = adminDb
      .collection('reviews')
      .where('doctorId', '==', doctorId);

    // Aplicar filtro de calificación
    if (queryData.rating) {
      query = query.where('rating', '==', queryData.rating);
    }

    // Aplicar ordenamiento
    switch (queryData.sortBy) {
      case 'newest':
        query = query.orderBy('createdAt', 'desc');
        break;
      case 'oldest':
        query = query.orderBy('createdAt', 'asc');
        break;
      case 'rating_high':
        query = query.orderBy('rating', 'desc').orderBy('createdAt', 'desc');
        break;
      case 'rating_low':
        query = query.orderBy('rating', 'asc').orderBy('createdAt', 'desc');
        break;
    }

    // Obtener total para paginación
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Aplicar paginación
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const reviews = [];

    for (const doc of snapshot.docs) {
      const reviewData = doc.data();
      
      // Obtener información del paciente que hizo la reseña
      let patientInfo = null;
      if (reviewData.patientId) {
        try {
          const patientDoc = await adminDb.collection('users').doc(reviewData.patientId).get();
          if (patientDoc.exists) {
            const patientUserData = patientDoc.data();
            patientInfo = {
              id: reviewData.patientId,
              firstName: patientUserData?.firstName,
              lastName: patientUserData?.lastName,
              avatar: patientUserData?.avatar,
              // No incluir datos sensibles como email o teléfono
            };
          }
        } catch (error) {
          console.error(`Error fetching patient data for review:`, error);
        }
      }

      reviews.push({
        id: doc.id,
        ...reviewData,
        createdAt: reviewData.createdAt?.toDate?.() ?? reviewData.createdAt,
        updatedAt: reviewData.updatedAt?.toDate?.() ?? reviewData.updatedAt,
        patient: patientInfo,
      });
    }

    // Calcular estadísticas de reseñas
    const allReviewsSnapshot = await adminDb
      .collection('reviews')
      .where('doctorId', '==', doctorId)
      .get();

    const allReviews = allReviewsSnapshot.docs.map(doc => doc.data());
    
    const stats = {
      totalReviews: allReviews.length,
      averageRating: allReviews.length > 0 
        ? allReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / allReviews.length
        : 0,
      ratingDistribution: {
        5: allReviews.filter(r => r.rating === 5).length,
        4: allReviews.filter(r => r.rating === 4).length,
        3: allReviews.filter(r => r.rating === 3).length,
        2: allReviews.filter(r => r.rating === 2).length,
        1: allReviews.filter(r => r.rating === 1).length,
      },
    };

    // Actualizar estadísticas del doctor
    try {
      await adminDb.collection('doctors').doc(doctorId).update({
        rating: stats.averageRating,
        reviewCount: stats.totalReviews,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating doctor stats:', error);
    }

    const meta = createPaginationMeta(page, limit, total);

    return NextResponse.json(
      createSuccessResponse({
        reviews,
        stats,
      }, meta),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching doctor reviews:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de consulta inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_REVIEWS_FAILED', 'Error al obtener reseñas del doctor'),
      { status: 500 }
    );
  }
}

// Endpoint para crear una nueva reseña
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const { id: doctorId } = params;
    const body = await request.json();

    // Schema para crear reseña
    const CreateReviewSchema = z.object({
      patientId: z.string().min(1, 'ID del paciente es requerido'),
      appointmentId: z.string().min(1, 'ID de la cita es requerido'),
      rating: z.number().int().min(1).max(5),
      comment: z.string().optional(),
      categories: z.object({
        punctuality: z.number().int().min(1).max(5).optional(),
        communication: z.number().int().min(1).max(5).optional(),
        expertise: z.number().int().min(1).max(5).optional(),
        facilities: z.number().int().min(1).max(5).optional(),
      }).optional(),
    });

    const reviewData = CreateReviewSchema.parse(body);

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(doctorId).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    // Verificar que la cita existe y está completada
    const appointmentDoc = await adminDb.collection('appointments').doc(reviewData.appointmentId).get();
    if (!appointmentDoc.exists) {
      return NextResponse.json(
        createErrorResponse('APPOINTMENT_NOT_FOUND', 'Cita no encontrada'),
        { status: 404 }
      );
    }

    const appointmentData = appointmentDoc.data();
    if (appointmentData?.status !== 'completed') {
      return NextResponse.json(
        createErrorResponse('APPOINTMENT_NOT_COMPLETED', 'Solo se pueden reseñar citas completadas'),
        { status: 400 }
      );
    }

    // Verificar que no existe una reseña previa para esta cita
    const existingReviewSnapshot = await adminDb
      .collection('reviews')
      .where('appointmentId', '==', reviewData.appointmentId)
      .get();

    if (!existingReviewSnapshot.empty) {
      return NextResponse.json(
        createErrorResponse('REVIEW_EXISTS', 'Ya existe una reseña para esta cita'),
        { status: 409 }
      );
    }

    // Crear la reseña
    const now = new Date();
    const newReview = {
      ...reviewData,
      doctorId,
      createdAt: now,
      updatedAt: now,
    };

    const reviewRef = await adminDb.collection('reviews').add(newReview);

    return NextResponse.json(
      createSuccessResponse({
        id: reviewRef.id,
        ...newReview,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating review:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de reseña inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('CREATE_REVIEW_FAILED', 'Error al crear reseña'),
      { status: 500 }
    );
  }
}
