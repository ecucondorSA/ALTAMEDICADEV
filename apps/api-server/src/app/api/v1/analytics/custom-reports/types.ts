/**
 * 📊 ANALYTICS CUSTOM REPORTS - TIPOS
 * Definiciones de tipos para reportes médicos personalizados
 */

export interface ReportMetadata {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  generatedAt: Date;
  version: string;
  status: ReportStatus;
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CACHED = 'cached'
}

export enum ReportType {
  APPOINTMENTS_SUMMARY = 'appointments_summary',
  DOCTOR_PERFORMANCE = 'doctor_performance',
  PATIENT_DEMOGRAPHICS = 'patient_demographics',
  REVENUE_ANALYSIS = 'revenue_analysis',
  SPECIALTIES_OVERVIEW = 'specialties_overview',
  CUSTOM_QUERY = 'custom_query'
}

export enum ExportFormat {
  JSON = 'json',
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel'
}

export interface ReportFilters {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  doctorIds?: string[];
  patientIds?: string[];
  specialties?: string[];
  companyIds?: string[];
  appointmentStatuses?: string[];
  ageGroups?: string[];
  genders?: string[];
  customFilters?: Record<string, any>;
}

export interface ReportAggregation {
  field: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  groupBy?: string[];
  having?: Record<string, any>;
}

export interface ReportChart {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  xAxis: string;
  yAxis: string;
  data: any[];
}

export interface ReportData {
  summary: Record<string, any>;
  details: any[];
  aggregations: Record<string, any>;
  charts?: ReportChart[];
  rawData?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export interface CustomReportRequest {
  type: ReportType;
  title: string;
  description?: string;
  filters: ReportFilters;
  aggregations?: ReportAggregation[];
  includeCharts?: boolean;
  exportFormat: ExportFormat;
  cacheResults?: boolean;
  scheduledExecution?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
  };
}

export interface CustomReportResponse {
  success: boolean;
  report: {
    metadata: ReportMetadata;
    data: ReportData;
    exportUrl?: string;
    cacheKey?: string;
    executionTime: number;
  };
  message: string;
}

export interface ReportCache {
  key: string;
  reportId: string;
  data: ReportData;
  expiresAt: Date;
  hitCount: number;
  lastAccessed: Date;
}

export interface ReportExecutionContext {
  userId: string;
  userRole: string;
  permissions: string[];
  companyId?: string;
  requestId: string;
  startTime: Date;
}

// Tipos para queries dinámicas
export interface DynamicQuery {
  collection: string;
  fields: string[];
  where: WhereClause[];
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
}

export interface WhereClause {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains';
  value: any;
}

export interface OrderByClause {
  field: string;
  direction: 'asc' | 'desc';
}

// Tipos para análisis predictivos
export interface PredictiveAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  prediction: {
    nextPeriod: any;
    factors: string[];
    recommendations: string[];
  };
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  queryCount: number;
  cacheHits: number;
  cacheMisses: number;
}

// Error types específicos
export class ReportGenerationError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'ReportGenerationError';
  }
}

export class ReportValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ReportValidationError';
  }
}

export class ReportPermissionError extends Error {
  constructor(message: string, public requiredPermission: string) {
    super(message);
    this.name = 'ReportPermissionError';
  }
}
