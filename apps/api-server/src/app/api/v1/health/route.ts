import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Firebase health check
    let databaseStatus = 'healthy';
    try {
      await adminDb.collection('health').limit(1).get();
    } catch {
      databaseStatus = 'unhealthy';
    }

    const healthData = {
      status: databaseStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'api-server',
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: databaseStatus,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        },
        auth: 'healthy',
        api: 'healthy'
      }
    };

    const status = healthData.status === 'healthy' ? 200 : 503;
    return NextResponse.json(createSuccessResponse(healthData), { status });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      createErrorResponse('HEALTH_CHECK_FAILED', 'Health check failed'),
      { status: 500 }
    );
  }
}
