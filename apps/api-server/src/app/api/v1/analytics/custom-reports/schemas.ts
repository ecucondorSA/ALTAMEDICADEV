/**
 * 📊 ANALYTICS CUSTOM REPORTS - ESQUEMAS VALIDACIÓN
 * Esquemas Zod para validación de entrada y salida
 */

import { z } from 'zod';
import { ExportFormat, ReportType } from './types';

// Schema base para fechas
const DateRangeSchema = z.object({
  startDate: z.string().datetime('Fecha de inicio inválida'),
  endDate: z.string().datetime('Fecha de fin inválida')
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'La fecha de inicio debe ser anterior a la fecha de fin', path: ['dateRange'] }
);

// Schema para filtros de reporte
const ReportFiltersSchema = z.object({
  dateRange: DateRangeSchema.optional(),
  doctorIds: z.array(z.string().min(1)).optional(),
  patientIds: z.array(z.string().min(1)).optional(),
  specialties: z.array(z.string().min(1)).optional(),
  companyIds: z.array(z.string().min(1)).optional(),
  appointmentStatuses: z.array(z.enum(['scheduled', 'completed', 'cancelled', 'no_show'])).optional(),
  ageGroups: z.array(z.enum(['0-18', '19-30', '31-45', '46-60', '60+'])).optional(),
  genders: z.array(z.enum(['male', 'female', 'other'])).optional(),
  customFilters: z.record(z.any()).optional()
});

// Schema para agregaciones
const ReportAggregationSchema = z.object({
  field: z.string().min(1, 'Campo de agregación requerido'),
  operation: z.enum(['count', 'sum', 'avg', 'min', 'max', 'distinct']),
  groupBy: z.array(z.string()).optional(),
  having: z.record(z.any()).optional()
});

// Schema para ejecución programada
const ScheduledExecutionSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  timezone: z.string().min(1, 'Zona horaria requerida')
});

// Schema principal para request de reporte personalizado
export const CustomReportRequestSchema = z.object({
  type: z.nativeEnum(ReportType),
  title: z.string().min(1, 'Título requerido').max(200, 'Título muy largo'),
  description: z.string().max(1000, 'Descripción muy larga').optional(),
  filters: ReportFiltersSchema,
  aggregations: z.array(ReportAggregationSchema).optional(),
  includeCharts: z.boolean().default(false),
  exportFormat: z.nativeEnum(ExportFormat).default(ExportFormat.JSON),
  cacheResults: z.boolean().default(true),
  scheduledExecution: ScheduledExecutionSchema.optional()
}).refine(
  (data) => {
    // Validación condicional: si incluye charts, debe tener agregaciones
    if (data.includeCharts && (!data.aggregations || data.aggregations.length === 0)) {
      return false;
    }
    return true;
  },
  { message: 'Los gráficos requieren al menos una agregación', path: ['includeCharts'] }
);

// Schema para query parameters de la API
export const ReportQueryParamsSchema = z.object({
  cached: z.string().optional().transform(val => val === 'true'),
  format: z.nativeEnum(ExportFormat).optional(),
  preview: z.string().optional().transform(val => val === 'true'),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  async: z.string().optional().transform(val => val === 'true')
});

// Schema para respuesta de lista de reportes
export const ReportListResponseSchema = z.object({
  success: z.boolean(),
  reports: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.nativeEnum(ReportType),
    status: z.enum(['generating', 'completed', 'failed', 'cached']),
    createdAt: z.date(),
    generatedAt: z.date().optional(),
    createdBy: z.string(),
    description: z.string().optional()
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasNext: z.boolean()
  }),
  message: z.string()
});

// Schema para validación de permisos
export const ReportPermissionSchema = z.object({
  userId: z.string().min(1),
  userRole: z.enum(['admin', 'doctor', 'patient', 'company_admin']),
  companyId: z.string().optional(),
  requestedReportType: z.nativeEnum(ReportType),
  requestedFilters: ReportFiltersSchema
});

// Schemas específicos por tipo de reporte
export const AppointmentsSummarySchema = z.object({
  type: z.literal(ReportType.APPOINTMENTS_SUMMARY),
  filters: ReportFiltersSchema.extend({
    dateRange: DateRangeSchema // Obligatorio para este tipo
  })
});

export const DoctorPerformanceSchema = z.object({
  type: z.literal(ReportType.DOCTOR_PERFORMANCE),
  filters: ReportFiltersSchema.extend({
    doctorIds: z.array(z.string().min(1)).min(1, 'Al menos un doctor requerido')
  })
});

export const PatientDemographicsSchema = z.object({
  type: z.literal(ReportType.PATIENT_DEMOGRAPHICS),
  filters: ReportFiltersSchema
});

export const RevenueAnalysisSchema = z.object({
  type: z.literal(ReportType.REVENUE_ANALYSIS),
  filters: ReportFiltersSchema.extend({
    dateRange: DateRangeSchema, // Obligatorio
    companyIds: z.array(z.string().min(1)).optional()
  })
});

export const SpecialtiesOverviewSchema = z.object({
  type: z.literal(ReportType.SPECIALTIES_OVERVIEW),
  filters: ReportFiltersSchema
});

export const CustomQuerySchema = z.object({
  type: z.literal(ReportType.CUSTOM_QUERY),
  filters: ReportFiltersSchema,
  customQuery: z.object({
    collection: z.string().min(1),
    fields: z.array(z.string().min(1)).min(1),
    where: z.array(z.object({
      field: z.string().min(1),
      operator: z.enum(['==', '!=', '<', '<=', '>', '>=', 'in', 'not-in', 'array-contains']),
      value: z.any()
    })).optional(),
    orderBy: z.array(z.object({
      field: z.string().min(1),
      direction: z.enum(['asc', 'desc'])
    })).optional(),
    limit: z.number().int().positive().max(10000).optional()
  })
});

// Function para validación específica por tipo
export function getSchemaByReportType(type: ReportType) {
  switch (type) {
    case ReportType.APPOINTMENTS_SUMMARY:
      return AppointmentsSummarySchema;
    case ReportType.DOCTOR_PERFORMANCE:
      return DoctorPerformanceSchema;
    case ReportType.PATIENT_DEMOGRAPHICS:
      return PatientDemographicsSchema;
    case ReportType.REVENUE_ANALYSIS:
      return RevenueAnalysisSchema;
    case ReportType.SPECIALTIES_OVERVIEW:
      return SpecialtiesOverviewSchema;
    case ReportType.CUSTOM_QUERY:
      return CustomQuerySchema;
    default:
      return CustomReportRequestSchema;
  }
}

// Schema para export request
export const ExportRequestSchema = z.object({
  reportId: z.string().min(1),
  format: z.nativeEnum(ExportFormat),
  includeRawData: z.boolean().default(false),
  compressOutput: z.boolean().default(true)
});

// Helpers de validación
export const validateReportRequest = (data: any) => {
  try {
    return {
      success: true,
      data: CustomReportRequestSchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      };
    }
    throw error;
  }
};

export const validateReportPermissions = (data: any) => {
  try {
    return {
      success: true,
      data: ReportPermissionSchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors
      };
    }
    throw error;
  }
};
