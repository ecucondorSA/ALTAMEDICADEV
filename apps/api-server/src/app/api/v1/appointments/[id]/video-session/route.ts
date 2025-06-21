import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para iniciar sesión de video
const StartVideoSessionSchema = z.object({
  provider: z.enum(['webrtc', 'agora', 'zoom', 'meet']).default('webrtc'),
  quality: z.enum(['low', 'medium', 'high', 'auto']).default('auto'),
  enableRecording: z.boolean().default(false),
  enableScreenShare: z.boolean().default(true),
  maxDuration: z.number().min(5).max(180).default(60), // minutos
});

// Schema para actualizar sesión de video
const UpdateVideoSessionSchema = z.object({
  action: z.enum(['pause', 'resume', 'mute', 'unmute', 'enable_camera', 'disable_camera']),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = params;

    // Verificar que la cita existe
    const appointmentDoc = await adminDb.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
      return NextResponse.json(
        createErrorResponse('APPOINTMENT_NOT_FOUND', 'Cita no encontrada'),
        { status: 404 }
      );
    }

    const appointmentData = appointmentDoc.data();

    // Verificar que la cita es de tipo telemedicina
    if (appointmentData?.type !== 'telemedicine') {
      return NextResponse.json(
        createErrorResponse('INVALID_APPOINTMENT_TYPE', 'La cita debe ser de tipo telemedicina'),
        { status: 400 }
      );
    }

    // Buscar sesión de video existente
    const videoSessionQuery = adminDb
      .collection('video_sessions')
      .where('appointmentId', '==', appointmentId)
      .orderBy('createdAt', 'desc')
      .limit(1);

    const videoSessionSnapshot = await videoSessionQuery.get();

    if (videoSessionSnapshot.empty) {
      return NextResponse.json(
        createErrorResponse('VIDEO_SESSION_NOT_FOUND', 'No se encontró sesión de video para esta cita'),
        { status: 404 }
      );
    }

    const videoSessionDoc = videoSessionSnapshot.docs[0];
    const sessionData = videoSessionDoc.data();

    // Calcular duración y estado actual
    const now = new Date();
    const startedAt = sessionData.startedAt?.toDate?.() ?? new Date(sessionData.startedAt);
    const endedAt = sessionData.endedAt?.toDate?.() ?? null;
    
    const durationMinutes = endedAt 
      ? (endedAt.getTime() - startedAt.getTime()) / (1000 * 60)
      : (now.getTime() - startedAt.getTime()) / (1000 * 60);

    // Verificar si la sesión está activa
    const isActive = sessionData.status === 'active' && !endedAt;
    const isExpired = durationMinutes > (sessionData.maxDuration || 60);

    // Obtener información de participantes
    const [doctorDoc, patientDoc] = await Promise.all([
      adminDb.collection('users').doc(appointmentData.doctorId).get(),
      adminDb.collection('users').doc(appointmentData.patientId).get(),
    ]);

    const videoSession = {
      id: videoSessionDoc.id,
      appointmentId,
      status: isExpired ? 'expired' : sessionData.status,
      provider: sessionData.provider,
      quality: sessionData.quality,
      isActive,
      isExpired,
      
      // Información de tiempo
      startedAt: sessionData.startedAt?.toDate?.() ?? sessionData.startedAt,
      endedAt: sessionData.endedAt?.toDate?.() ?? null,
      durationMinutes: Math.round(durationMinutes * 100) / 100,
      maxDuration: sessionData.maxDuration,
      remainingMinutes: Math.max(0, (sessionData.maxDuration || 60) - durationMinutes),
      
      // URLs y conexión
      roomId: sessionData.roomId,
      joinUrls: sessionData.joinUrls,
      connectionInfo: sessionData.connectionInfo,
      
      // Características
      enableRecording: sessionData.enableRecording,
      enableScreenShare: sessionData.enableScreenShare,
      recordingUrl: sessionData.recordingUrl || null,
      
      // Participantes
      participants: {
        doctor: doctorDoc.exists ? {
          id: appointmentData.doctorId,
          firstName: doctorDoc.data()?.firstName,
          lastName: doctorDoc.data()?.lastName,
          email: doctorDoc.data()?.email,
          joinedAt: sessionData.doctorJoinedAt?.toDate?.() ?? null,
          isConnected: sessionData.doctorConnected ?? false,
        } : null,
        patient: patientDoc.exists ? {
          id: appointmentData.patientId,
          firstName: patientDoc.data()?.firstName,
          lastName: patientDoc.data()?.lastName,
          email: patientDoc.data()?.email,
          joinedAt: sessionData.patientJoinedAt?.toDate?.() ?? null,
          isConnected: sessionData.patientConnected ?? false,
        } : null,
      },
      
      // Metadata y configuración
      metadata: sessionData.metadata || {},
      createdAt: sessionData.createdAt?.toDate?.() ?? sessionData.createdAt,
      updatedAt: sessionData.updatedAt?.toDate?.() ?? sessionData.updatedAt,
    };

    return NextResponse.json(
      createSuccessResponse(videoSession),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching video session:', error);
    return NextResponse.json(
      createErrorResponse('FETCH_VIDEO_SESSION_FAILED', 'Error al obtener sesión de video'),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = params;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    // Verificar que la cita existe
    const appointmentDoc = await adminDb.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
      return NextResponse.json(
        createErrorResponse('APPOINTMENT_NOT_FOUND', 'Cita no encontrada'),
        { status: 404 }
      );
    }

    const appointmentData = appointmentDoc.data();

    // Verificar que la cita es de tipo telemedicina
    if (appointmentData?.type !== 'telemedicine') {
      return NextResponse.json(
        createErrorResponse('INVALID_APPOINTMENT_TYPE', 'La cita debe ser de tipo telemedicina'),
        { status: 400 }
      );
    }

    // Verificar que la cita está confirmada
    if (appointmentData?.status !== 'confirmed') {
      return NextResponse.json(
        createErrorResponse('APPOINTMENT_NOT_CONFIRMED', 'La cita debe estar confirmada'),
        { status: 400 }
      );
    }

    const body = await request.json();
    const sessionConfig = StartVideoSessionSchema.parse(body);

    // Verificar si ya existe una sesión activa
    const existingSessionQuery = adminDb
      .collection('video_sessions')
      .where('appointmentId', '==', appointmentId)
      .where('status', '==', 'active');

    const existingSessionSnapshot = await existingSessionQuery.get();

    if (!existingSessionSnapshot.empty) {
      return NextResponse.json(
        createErrorResponse('SESSION_ALREADY_ACTIVE', 'Ya existe una sesión de video activa para esta cita'),
        { status: 409 }
      );
    }

    // Generar datos de conexión según el proveedor
    const roomId = `room_${appointmentId}_${Date.now()}`;
    let connectionInfo = {};
    let joinUrls = {};

    switch (sessionConfig.provider) {
      case 'webrtc':
        connectionInfo = {
          signallingServer: 'wss://video.altamedica.com/signalling',
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:turn.altamedica.com', username: 'user', credential: 'pass' }
          ],
        };
        joinUrls = {
          doctor: `https://video.altamedica.com/room/${roomId}?role=doctor`,
          patient: `https://video.altamedica.com/room/${roomId}?role=patient`,
        };
        break;
      case 'agora':
        connectionInfo = {
          appId: 'agora_app_id_here',
          channelName: roomId,
          token: `temp_token_${Date.now()}`, // En producción, generar token real
        };
        joinUrls = {
          doctor: `https://app.altamedica.com/video/agora/${roomId}?role=doctor`,
          patient: `https://app.altamedica.com/video/agora/${roomId}?role=patient`,
        };
        break;
      case 'zoom':
        connectionInfo = {
          meetingId: roomId,
          password: 'meeting_password',
          zoomSdk: true,
        };
        joinUrls = {
          doctor: `https://zoom.us/j/${roomId}?pwd=meeting_password&role=1`,
          patient: `https://zoom.us/j/${roomId}?pwd=meeting_password&role=0`,
        };
        break;
      case 'meet':
        connectionInfo = {
          meetingCode: roomId,
          apiKey: 'google_meet_api_key',
        };
        joinUrls = {
          doctor: `https://meet.google.com/${roomId}`,
          patient: `https://meet.google.com/${roomId}`,
        };
        break;
    }

    // Crear la sesión de video
    const now = new Date();
    const videoSession = {
      appointmentId,
      status: 'active',
      provider: sessionConfig.provider,
      quality: sessionConfig.quality,
      
      // Configuración
      enableRecording: sessionConfig.enableRecording,
      enableScreenShare: sessionConfig.enableScreenShare,
      maxDuration: sessionConfig.maxDuration,
      
      // Conexión
      roomId,
      connectionInfo,
      joinUrls,
      
      // Participantes
      doctorConnected: false,
      patientConnected: false,
      doctorJoinedAt: null,
      patientJoinedAt: null,
      
      // Timestamps
      startedAt: now,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
      
      // Metadata
      metadata: {},
    };

    const docRef = await adminDb.collection('video_sessions').add(videoSession);

    // Actualizar el estado de la cita
    await adminDb.collection('appointments').doc(appointmentId).update({
      status: 'in_progress',
      videoSessionId: docRef.id,
      updatedAt: now,
    });

    return NextResponse.json(
      createSuccessResponse({
        id: docRef.id,
        ...videoSession,
        participants: {
          doctor: {
            id: appointmentData.doctorId,
            joinUrl: joinUrls.doctor,
          },
          patient: {
            id: appointmentData.patientId,
            joinUrl: joinUrls.patient,
          },
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error starting video session:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Configuración de sesión inválida', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('START_VIDEO_SESSION_FAILED', 'Error al iniciar sesión de video'),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = params;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const updateData = UpdateVideoSessionSchema.parse(body);

    // Buscar sesión activa
    const videoSessionQuery = adminDb
      .collection('video_sessions')
      .where('appointmentId', '==', appointmentId)
      .where('status', '==', 'active')
      .limit(1);

    const videoSessionSnapshot = await videoSessionQuery.get();

    if (videoSessionSnapshot.empty) {
      return NextResponse.json(
        createErrorResponse('VIDEO_SESSION_NOT_FOUND', 'No se encontró sesión de video activa'),
        { status: 404 }
      );
    }    const videoSessionDoc = videoSessionSnapshot.docs[0];

    // Preparar actualización según la acción
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    switch (updateData.action) {
      case 'pause':
        updateFields.status = 'paused';
        updateFields.pausedAt = new Date();
        break;
      case 'resume':
        updateFields.status = 'active';
        updateFields.resumedAt = new Date();
        break;
      case 'mute':
        updateFields['metadata.audioMuted'] = true;
        break;
      case 'unmute':
        updateFields['metadata.audioMuted'] = false;
        break;
      case 'enable_camera':
        updateFields['metadata.videoEnabled'] = true;
        break;
      case 'disable_camera':
        updateFields['metadata.videoEnabled'] = false;
        break;
    }

    // Agregar metadata adicional si se proporciona
    if (updateData.metadata) {
      Object.keys(updateData.metadata).forEach(key => {
        updateFields[`metadata.${key}`] = updateData.metadata![key];
      });
    }

    // Actualizar la sesión
    await adminDb.collection('video_sessions').doc(videoSessionDoc.id).update(updateFields);

    // Obtener datos actualizados
    const updatedDoc = await adminDb.collection('video_sessions').doc(videoSessionDoc.id).get();
    const updatedData = updatedDoc.data();

    return NextResponse.json(
      createSuccessResponse({
        id: videoSessionDoc.id,
        action: updateData.action,
        status: updatedData?.status,
        metadata: updatedData?.metadata || {},
        updatedAt: updatedData?.updatedAt?.toDate?.() ?? updatedData?.updatedAt,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating video session:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de actualización inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('UPDATE_VIDEO_SESSION_FAILED', 'Error al actualizar sesión de video'),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = params;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    // Buscar sesión activa
    const videoSessionQuery = adminDb
      .collection('video_sessions')
      .where('appointmentId', '==', appointmentId)
      .where('status', 'in', ['active', 'paused'])
      .limit(1);

    const videoSessionSnapshot = await videoSessionQuery.get();

    if (videoSessionSnapshot.empty) {
      return NextResponse.json(
        createErrorResponse('VIDEO_SESSION_NOT_FOUND', 'No se encontró sesión de video activa'),
        { status: 404 }
      );
    }

    const videoSessionDoc = videoSessionSnapshot.docs[0];
    const sessionData = videoSessionDoc.data();

    // Calcular duración final
    const now = new Date();
    const startedAt = sessionData.startedAt?.toDate?.() ?? new Date(sessionData.startedAt);
    const durationMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60);

    // Finalizar la sesión
    await adminDb.collection('video_sessions').doc(videoSessionDoc.id).update({
      status: 'ended',
      endedAt: now,
      finalDurationMinutes: Math.round(durationMinutes * 100) / 100,
      updatedAt: now,
    });

    // Actualizar el estado de la cita
    await adminDb.collection('appointments').doc(appointmentId).update({
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      createSuccessResponse({
        message: 'Sesión de video finalizada exitosamente',
        sessionId: videoSessionDoc.id,
        durationMinutes: Math.round(durationMinutes * 100) / 100,
        endedAt: now,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error ending video session:', error);
    return NextResponse.json(
      createErrorResponse('END_VIDEO_SESSION_FAILED', 'Error al finalizar sesión de video'),
      { status: 500 }
    );
  }
}
