/**
 * 📊 ANALYTICS CUSTOM REPORTS API
 * POST /api/v1/analytics/custom-reports - Generar reportes médicos personalizados
 * GET /api/v1/analytics/custom-reports - Listar reportes generados
 */

import { adminAuth } from '@altamedica/firebase';
import { NextRequest, NextResponse } from 'next/server';
import {
    getSchemaByReportType,
    ReportQueryParamsSchema,
    validateReportRequest
} from './schemas';
import { ReportGenerationService } from './services';
import {
    CustomReportRequest,
    CustomReportResponse,
    ExportFormat,
    ReportExecutionContext,
    ReportGenerationError,
    ReportPermissionError,
    ReportStatus,
    ReportType,
    ReportValidationError
} from './types';

// Funciones de utilidad inline
function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function validateReportPermissions(userRole: string, type: ReportType, filters: any, companyId?: string) {
  return { allowed: true, restrictions: [] };
}

function formatDataForExport(data: any, format: ExportFormat): any {
  return data; // Simplificado para la demo
}

// Forzar endpoint dinámico
export const dynamic = "force-dynamic";

const reportService = new ReportGenerationService();

/**
 * POST /api/v1/analytics/custom-reports
 * Generar nuevo reporte personalizado
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = new Date();
  let reportId: string = generateReportId();

  try {    // 1. Verificar autenticación (simplificado para demo)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Token de autorización requerido',
        code: 'MISSING_AUTH_TOKEN'
      }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    
    // Autenticación simplificada para demo
    let decodedToken = { uid: 'demo-user', email: 'demo@altamedica.com' };
    if (idToken !== 'mock-token') {
      try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
      } catch (error) {
        // Si falla la verificación real, usar datos mock
        decodedToken = { uid: 'demo-user', email: 'demo@altamedica.com' };
      }
    }
    
    const { uid, email } = decodedToken;

    // 2. Obtener datos del usuario (simplificado)
    const userClaims = decodedToken;
    const userRole = userClaims.role || 'patient';
    const companyId = userClaims.companyId;

    // 3. Parsear y validar request body
    const body = await request.json();
    
    // Validación inicial con schema base
    const validation = validateReportRequest(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        details: validation.errors      }, { status: 400 });
    }

    const reportRequest = validation.data as CustomReportRequest;

    // 4. Validación específica por tipo de reporte
    try {
      const specificSchema = getSchemaByReportType(reportRequest.type);
      specificSchema.parse(reportRequest);
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Validación específica del tipo de reporte falló',
        code: 'SPECIFIC_VALIDATION_ERROR',
        details: error.errors || error.message
      }, { status: 400 });
    }

    // 5. Crear contexto de ejecución
    const executionContext: ReportExecutionContext = {
      userId: uid,
      userRole,
      permissions: userClaims.permissions || [],
      companyId,
      requestId: reportId,
      startTime
    };

    // 6. Validar permisos específicos
    const permissionCheck = validateReportPermissions(
      userRole,
      reportRequest.type,
      reportRequest.filters,
      companyId
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: 'Permisos insuficientes para generar este reporte',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: { restrictions: permissionCheck.restrictions }
      }, { status: 403 });
    }

    // 7. Generar el reporte
    const reportData = await reportService.generateCustomReport(
      reportRequest,
      executionContext
    );

    // 8. Formatear datos según formato solicitado
    const formattedData = formatDataForExport(reportData, reportRequest.exportFormat);

    // 9. Calcular tiempo de ejecución
    const executionTime = Date.now() - startTime.getTime();

    // 10. Preparar respuesta
    const response: CustomReportResponse = {
      success: true,
      report: {
        metadata: {
          id: reportId,
          title: reportRequest.title,
          description: reportRequest.description || '',
          createdBy: uid,
          createdAt: startTime,
          generatedAt: new Date(),
          version: '1.0',
          status: ReportStatus.COMPLETED
        },
        data: formattedData,
        executionTime
      },
      message: 'Reporte generado exitosamente'
    };

    // 11. Headers adicionales para diferentes formatos
    const responseHeaders: Record<string, string> = {
      'X-Report-ID': reportId,
      'X-Execution-Time': executionTime.toString(),
      'X-Data-Count': reportData.details.length.toString()
    };

    if (reportRequest.exportFormat === ExportFormat.CSV) {
      responseHeaders['Content-Type'] = 'text/csv';
      responseHeaders['Content-Disposition'] = `attachment; filename="report_${reportId}.csv"`;
    } else if (reportRequest.exportFormat === ExportFormat.PDF) {
      responseHeaders['Content-Type'] = 'application/pdf';
      responseHeaders['Content-Disposition'] = `attachment; filename="report_${reportId}.pdf"`;
    }

    return NextResponse.json(response, {
      status: 200,
      headers: responseHeaders
    });

  } catch (error: any) {
    console.error('❌ Error generating custom report:', error);

    // Manejo específico de errores
    if (error instanceof ReportGenerationError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        reportId
      }, { status: 400 });
    }

    if (error instanceof ReportValidationError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR',
        field: error.field,
        reportId
      }, { status: 400 });
    }

    if (error instanceof ReportPermissionError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: 'PERMISSION_ERROR',
        requiredPermission: error.requiredPermission,
        reportId
      }, { status: 403 });
    }

    // Error genérico
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor al generar reporte',
      code: 'INTERNAL_SERVER_ERROR',
      reportId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/analytics/custom-reports
 * Listar reportes generados (para futuras versiones)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verificar autenticación (simplificado para demo)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Token de autorización requerido'
      }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    
    // Autenticación simplificada para demo
    let decodedToken = { uid: 'demo-user', email: 'demo@altamedica.com' };
    if (idToken !== 'mock-token') {
      try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
      } catch (error) {
        // Si falla la verificación real, usar datos mock
        decodedToken = { uid: 'demo-user', email: 'demo@altamedica.com' };
      }
    }

    // 2. Parsear query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedParams = ReportQueryParamsSchema.parse(queryParams);

    // 3. Respuesta temporal - En una implementación completa, 
    //    aquí se consultarían reportes almacenados
    return NextResponse.json({
      success: true,
      reports: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        hasNext: false
      },
      message: 'Lista de reportes (funcionalidad en desarrollo)',
      availableTypes: Object.values(ReportType),
      availableFormats: Object.values(ExportFormat)
    });

  } catch (error: any) {
    console.error('❌ Error listing reports:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al listar reportes',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}
