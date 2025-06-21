/**
 * 📊 ANALYTICS CUSTOM REPORTS - UTILIDADES
 * Funciones de utilidad para procesamiento de reportes
 */

import {
    DynamicQuery,
    ExportFormat,
    OrderByClause,
    PredictiveAnalysis,
    ReportAggregation,
    ReportData,
    ReportFilters,
    ReportType,
    WhereClause
} from './types';

/**
 * Genera un ID único para el reporte
 */
export function generateReportId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `rpt_${timestamp}_${random}`;
}

/**
 * Genera una clave de caché basada en los parámetros del reporte
 */
export function generateCacheKey(type: ReportType, filters: ReportFilters, aggregations?: ReportAggregation[]): string {
  const filterHash = JSON.stringify(filters);
  const aggHash = aggregations ? JSON.stringify(aggregations) : '';
  const combined = `${type}_${filterHash}_${aggHash}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `cache_${Math.abs(hash)}_${Date.now()}`;
}

/**
 * Convierte filtros a query de Firestore
 */
export function filtersToFirestoreQuery(filters: ReportFilters): DynamicQuery {
  const where: WhereClause[] = [];
  const orderBy: OrderByClause[] = [];

  // Filtro de rango de fechas
  if (filters.dateRange) {
    where.push({
      field: 'createdat',
      operator: '>=',
      value: new Date(filters.dateRange.startDate)
    });
    where.push({
      field: 'createdat',
      operator: '<=',
      value: new Date(filters.dateRange.endDate)
    });
    orderBy.push({ field: 'createdat', direction: 'desc' });
  }

  // Filtros de arrays (IDs)
  if (filters.doctorIds && filters.doctorIds.length > 0) {
    where.push({
      field: 'doctorid',
      operator: 'in',
      value: filters.doctorIds
    });
  }

  if (filters.patientIds && filters.patientIds.length > 0) {
    where.push({
      field: 'patientid',
      operator: 'in',
      value: filters.patientIds
    });
  }

  if (filters.companyIds && filters.companyIds.length > 0) {
    where.push({
      field: 'companyid',
      operator: 'in',
      value: filters.companyIds
    });
  }

  // Filtros de estado
  if (filters.appointmentStatuses && filters.appointmentStatuses.length > 0) {
    where.push({
      field: 'status',
      operator: 'in',
      value: filters.appointmentStatuses
    });
  }

  // Filtros personalizados
  if (filters.customFilters) {
    Object.entries(filters.customFilters).forEach(([field, value]) => {
      if (value !== null && value !== undefined) {
        where.push({
          field,
          operator: Array.isArray(value) ? 'in' : '==',
          value
        });
      }
    });
  }

  return {
    collection: 'appointments', // Default collection
    fields: ['*'],
    where,
    orderBy,
    limit: 10000 // Default limit
  };
}

/**
 * Aplica agregaciones a los datos
 */
export function applyAggregations(data: any[], aggregations: ReportAggregation[]): Record<string, any> {
  const results: Record<string, any> = {};

  aggregations.forEach(agg => {
    const { field, operation, groupBy } = agg;

    if (groupBy && groupBy.length > 0) {
      // Agregación agrupada
      const grouped = groupDataBy(data, groupBy);
      results[`${field}_${operation}_by_${groupBy.join('_')}`] = 
        Object.entries(grouped).reduce((acc, [key, items]) => {
          acc[key] = calculateAggregation(items, field, operation);
          return acc;
        }, {} as Record<string, any>);
    } else {
      // Agregación simple
      results[`${field}_${operation}`] = calculateAggregation(data, field, operation);
    }
  });

  return results;
}

/**
 * Calcula una agregación específica
 */
function calculateAggregation(data: any[], field: string, operation: string): any {
  const values = data.map(item => item[field]).filter(val => val !== null && val !== undefined);

  switch (operation) {
    case 'count':
      return values.length;
    case 'sum':
      return values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    case 'avg':
      return values.length > 0 ? values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0) / values.length : 0;
    case 'min':
      return values.length > 0 ? Math.min(...values.map(v => parseFloat(v) || 0)) : 0;
    case 'max':
      return values.length > 0 ? Math.max(...values.map(v => parseFloat(v) || 0)) : 0;
    case 'distinct':
      return [...new Set(values)].length;
    default:
      return null;
  }
}

/**
 * Agrupa datos por campos específicos
 */
function groupDataBy(data: any[], fields: string[]): Record<string, any[]> {
  return data.reduce((groups, item) => {
    const key = fields.map(field => item[field] || 'unknown').join('_');
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, any[]>);
}

/**
 * Formatea datos para diferentes tipos de exportación
 */
export function formatDataForExport(data: ReportData, format: ExportFormat): any {
  switch (format) {
    case ExportFormat.JSON:
      return data;
    
    case ExportFormat.CSV:
      return convertToCSV(data.details);
    
    case ExportFormat.EXCEL:
      return {
        sheets: {
          'Summary': data.summary,
          'Details': data.details,
          'Aggregations': data.aggregations
        }
      };
    
    case ExportFormat.PDF:
      return {
        title: 'Reporte Médico Personalizado',
        sections: [
          { title: 'Resumen', content: data.summary },
          { title: 'Detalles', content: data.details },
          { title: 'Agregaciones', content: data.aggregations }
        ]
      };
    
    default:
      return data;
  }
}

/**
 * Convierte datos a formato CSV
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

/**
 * Calcula métricas de performance del reporte
 */
export function calculatePerformanceMetrics(startTime: Date, dataSize: number, queryCount: number) {
  const executionTime = Date.now() - startTime.getTime();
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

  return {
    executionTime,
    memoryUsage: Math.round(memoryUsage * 100) / 100,
    queryCount,
    dataSize,
    performanceScore: calculatePerformanceScore(executionTime, dataSize)
  };
}

/**
 * Calcula un score de performance (0-100)
 */
function calculatePerformanceScore(executionTime: number, dataSize: number): number {
  // Tiempo esperado basado en tamaño de datos
  const expectedTime = Math.max(100, dataSize * 0.1); // mínimo 100ms, +0.1ms por registro
  const efficiency = Math.min(100, (expectedTime / executionTime) * 100);
  return Math.round(efficiency);
}

/**
 * Genera análisis predictivo básico
 */
export function generatePredictiveAnalysis(data: any[], field: string): PredictiveAnalysis {
  if (data.length < 3) {
    return {
      trend: 'stable',
      confidence: 0,
      prediction: {
        nextPeriod: null,
        factors: ['Datos insuficientes'],
        recommendations: ['Recolectar más datos históricos']
      }
    };
  }

  // Análisis de tendencia simple (últimos 3 puntos)
  const recent = data.slice(-3).map(item => parseFloat(item[field]) || 0);
  const slope = (recent[2] - recent[0]) / 2;
  
  let trend: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(slope) < 0.1) {
    trend = 'stable';
  } else if (slope > 0) {
    trend = 'increasing';
  } else {
    trend = 'decreasing';
  }

  const confidence = Math.min(100, Math.max(0, 100 - (Math.abs(slope) * 10)));

  return {
    trend,
    confidence: Math.round(confidence),
    prediction: {
      nextPeriod: recent[2] + slope,
      factors: [`Tendencia ${trend}`, `Pendiente: ${slope.toFixed(2)}`],
      recommendations: generateRecommendations(trend, confidence)
    }
  };
}

/**
 * Genera recomendaciones basadas en tendencias
 */
function generateRecommendations(trend: string, confidence: number): string[] {
  const recommendations = [];

  if (trend === 'increasing') {
    recommendations.push('Monitorear el crecimiento sostenible');
    recommendations.push('Preparar recursos adicionales');
  } else if (trend === 'decreasing') {
    recommendations.push('Investigar causas de la disminución');
    recommendations.push('Implementar estrategias de mejora');
  } else {
    recommendations.push('Mantener el estado actual');
    recommendations.push('Buscar oportunidades de optimización');
  }

  if (confidence < 50) {
    recommendations.push('Recolectar más datos para mayor precisión');
  }

  return recommendations;
}

/**
 * Valida si un usuario tiene permisos para generar un reporte específico
 */
export function validateReportPermissions(
  userRole: string, 
  reportType: ReportType, 
  filters: ReportFilters,
  userCompanyId?: string
): { allowed: boolean; restrictions?: string[] } {
  const restrictions: string[] = [];

  // Permisos por rol
  switch (userRole) {
    case 'admin':
      return { allowed: true }; // Admin tiene acceso total

    case 'company_admin':
      // Solo datos de su empresa
      if (filters.companyIds && !filters.companyIds.includes(userCompanyId || '')) {
        restrictions.push('Solo puede acceder a datos de su empresa');
      }
      break;

    case 'doctor':
      // Solo sus propios datos y pacientes
      if (reportType === ReportType.REVENUE_ANALYSIS) {
        restrictions.push('Los doctores no pueden generar reportes de ingresos');
      }
      break;

    case 'patient':
      // Solo reportes muy limitados
      if (reportType !== ReportType.PATIENT_DEMOGRAPHICS) {
        restrictions.push('Los pacientes solo pueden generar reportes demográficos básicos');
      }
      break;

    default:
      return { allowed: false, restrictions: ['Rol no reconocido'] };
  }

  return {
    allowed: restrictions.length === 0,
    restrictions: restrictions.length > 0 ? restrictions : undefined
  };
}
