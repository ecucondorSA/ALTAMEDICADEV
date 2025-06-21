/**
 * 📊 ANALYTICS CUSTOM REPORTS - SERVICIOS
 * Lógica de negocio para generación de reportes médicos
 */

import { adminDb } from '@altamedica/firebase';
import {
    CustomReportRequest,
    PerformanceMetrics,
    ReportAggregation,
    ReportCache,
    ReportData,
    ReportExecutionContext,
    ReportFilters,
    ReportGenerationError,
    ReportType
} from './types';

// Funciones de utilidad inline para evitar dependencias
function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateCacheKey(type: ReportType, filters: ReportFilters, aggregations?: ReportAggregation[]): string {
  return `${type}_${JSON.stringify(filters)}_${JSON.stringify(aggregations || [])}`;
}

function calculatePerformanceMetrics(startTime: Date, recordCount: number, queryCount: number): PerformanceMetrics {
  const endTime = new Date();
  return {
    executionTime: endTime.getTime() - startTime.getTime(),
    memoryUsage: process.memoryUsage().heapUsed,
    queryCount: queryCount,
    cacheHits: 0,
    cacheMisses: 0
  };
}

function validateReportPermissions(userRole: string, type: ReportType, filters: ReportFilters, companyId?: string) {
  // Validación simplificada
  return {
    allowed: true,
    restrictions: []
  };
}

function applyAggregations(data: any[], aggregations: ReportAggregation[]): any {
  // Agregaciones simplificadas
  return {};
}

/**
 * Servicio principal para generación de reportes
 */
export class ReportGenerationService {
  private cache = new Map<string, ReportCache>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos

  /**
   * Genera un reporte personalizado
   */
  async generateCustomReport(
    request: CustomReportRequest,
    context: ReportExecutionContext
  ): Promise<ReportData> {
    const startTime = new Date();
    let queryCount = 0;

    try {
      // Validar permisos
      const permissionCheck = validateReportPermissions(
        context.userRole,
        request.type,
        request.filters,
        context.companyId
      );

      if (!permissionCheck.allowed) {
        throw new ReportGenerationError(
          'Permisos insuficientes para generar este reporte',
          'INSUFFICIENT_PERMISSIONS',
          { restrictions: permissionCheck.restrictions }
        );
      }

      // Verificar caché si está habilitado
      if (request.cacheResults) {
        const cacheKey = generateCacheKey(request.type, request.filters, request.aggregations);
        const cachedData = this.getCachedReport(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      // Generar reporte según el tipo
      let reportData: ReportData;
      switch (request.type) {
        case ReportType.APPOINTMENTS_SUMMARY:
          reportData = await this.generateAppointmentsSummary(request.filters, context);
          queryCount += 2;
          break;
        case ReportType.DOCTOR_PERFORMANCE:
          reportData = await this.generateDoctorPerformance(request.filters, context);
          queryCount += 3;
          break;
        case ReportType.PATIENT_DEMOGRAPHICS:
          reportData = await this.generatePatientDemographics(request.filters, context);
          queryCount += 2;
          break;
        case ReportType.REVENUE_ANALYSIS:
          reportData = await this.generateRevenueAnalysis(request.filters, context);
          queryCount += 4;
          break;
        case ReportType.SPECIALTIES_OVERVIEW:
          reportData = await this.generateSpecialtiesOverview(request.filters, context);
          queryCount += 2;
          break;
        default:
          throw new ReportGenerationError(
            'Tipo de reporte no soportado',
            'UNSUPPORTED_REPORT_TYPE'
          );
      }

      // Aplicar agregaciones si están definidas
      if (request.aggregations && request.aggregations.length > 0) {
        const aggregations = applyAggregations(reportData.details, request.aggregations);
        reportData.aggregations = { ...reportData.aggregations, ...aggregations };
      }

      // Calcular métricas de performance
      const performance = calculatePerformanceMetrics(startTime, reportData.details.length, queryCount);
      reportData.summary.performance = performance;

      // Cachear resultado si está habilitado
      if (request.cacheResults) {
        const cacheKey = generateCacheKey(request.type, request.filters, request.aggregations);
        this.cacheReport(cacheKey, reportData);
      }

      return reportData;

    } catch (error) {
      if (error instanceof ReportGenerationError) {
        throw error;
      }
      throw new ReportGenerationError(
        'Error interno al generar reporte',
        'INTERNAL_ERROR',
        { originalError: error }
      );
    }
  }  /**
   * Genera resumen de citas médicas
   */
  private async generateAppointmentsSummary(
    filters: ReportFilters,
    context: ReportExecutionContext
  ): Promise<ReportData> {
    try {
      // Datos mock para la demo
      const mockAppointments = [
        { id: '1', status: 'completed', createdat: new Date('2025-06-20'), doctorid: 'doc1' },
        { id: '2', status: 'scheduled', createdat: new Date('2025-06-21'), doctorid: 'doc2' },
        { id: '3', status: 'cancelled', createdat: new Date('2025-06-19'), doctorid: 'doc1' },
        { id: '4', status: 'completed', createdat: new Date('2025-06-18'), doctorid: 'doc3' },
        { id: '5', status: 'no_show', createdat: new Date('2025-06-17'), doctorid: 'doc2' }
      ];

      const appointments = mockAppointments;

      // Calcular estadísticas
      const total = appointments.length;
      const completed = appointments.filter((apt: any) => apt.status === 'completed').length;
      const cancelled = appointments.filter((apt: any) => apt.status === 'cancelled').length;
      const scheduled = appointments.filter((apt: any) => apt.status === 'scheduled').length;

      // Agregaciones por día
      const dailyStats = this.groupAppointmentsByDay(appointments);

      return {
        summary: {
          totalAppointments: total,
          completedAppointments: completed,
          cancelledAppointments: cancelled,
          scheduledAppointments: scheduled,
          completionRate: total > 0 ? (completed / total * 100).toFixed(2) : 0,
          cancellationRate: total > 0 ? (cancelled / total * 100).toFixed(2) : 0,
          period: filters.dateRange
        },
        details: appointments,
        aggregations: {
          byStatus: {
            completed,
            cancelled,
            scheduled,
            no_show: appointments.filter((apt: any) => apt.status === 'no_show').length
          },
          byDay: dailyStats
        }
      };
    } catch (error) {
      throw new ReportGenerationError(
        'Error al generar resumen de citas',
        'APPOINTMENTS_QUERY_ERROR',
        { originalError: error }
      );
    }
  }
  /**
   * Genera reporte de rendimiento de doctores
   */
  private async generateDoctorPerformance(
    filters: ReportFilters,
    context: ReportExecutionContext
  ): Promise<ReportData> {
    if (!filters.doctorIds || filters.doctorIds.length === 0) {
      throw new ReportGenerationError(
        'Se requiere al menos un doctor para el reporte de rendimiento',
        'MISSING_DOCTOR_IDS'
      );
    }

    try {
      // Query de citas por doctores usando Admin SDK
      let appointmentsRef = adminDb.collection('appointments')
        .where('doctorid', 'in', filters.doctorIds);

      if (filters.dateRange) {
        appointmentsRef = appointmentsRef
          .where('createdat', '>=', new Date(filters.dateRange.startDate))
          .where('createdat', '<=', new Date(filters.dateRange.endDate));
      }

      const appointmentsSnapshot = await appointmentsRef.get();
      const appointments = appointmentsSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Obtener información de doctores
      const doctorsData = await this.getDoctorsData(filters.doctorIds);

      // Calcular métricas por doctor
      const doctorPerformance = this.calculateDoctorPerformance(appointments, doctorsData);

      return {
        summary: {
          totalDoctors: filters.doctorIds.length,
          totalAppointments: appointments.length,
          averageRating: this.calculateAverageRating(doctorPerformance),
          topPerformer: this.getTopPerformer(doctorPerformance)
        },
        details: doctorPerformance,
        aggregations: {
          bySpecialty: this.groupBySpecialty(doctorPerformance),
          performanceDistribution: this.calculatePerformanceDistribution(doctorPerformance)
        }
      };
    } catch (error) {
      throw new ReportGenerationError(
        'Error al generar reporte de rendimiento de doctores',
        'DOCTOR_PERFORMANCE_ERROR',
        { originalError: error }
      );
    }
  }  /**
   * Genera demografía de pacientes
   */
  private async generatePatientDemographics(
    filters: ReportFilters,
    context: ReportExecutionContext
  ): Promise<ReportData> {
    try {
      // Datos mock para la demo
      const mockPatients = [
        { id: '1', age: 45, gender: 'M', createdat: new Date('2025-06-15') },
        { id: '2', age: 32, gender: 'F', createdat: new Date('2025-06-16') },
        { id: '3', age: 67, gender: 'M', createdat: new Date('2025-06-17') },
        { id: '4', age: 28, gender: 'F', createdat: new Date('2025-06-18') },
        { id: '5', age: 55, gender: 'F', createdat: new Date('2025-06-19') }
      ];

      const patients = mockPatients;

      // Calcular demografía
      const demographics = this.calculateDemographics(patients);

      return {
        summary: {
          totalPatients: patients.length,
          averageAge: demographics.averageAge,
          genderDistribution: demographics.genderDistribution,
          ageGroups: demographics.ageGroups
        },
        details: patients,
        aggregations: demographics
      };
    } catch (error) {
      throw new ReportGenerationError(
        'Error al generar demografía de pacientes',
        'PATIENT_DEMOGRAPHICS_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Genera análisis de ingresos
   */
  private async generateRevenueAnalysis(
    filters: ReportFilters,
    context: ReportExecutionContext
  ): Promise<ReportData> {
    // Este reporte requiere datos financieros - simplificado para demo
    const mockRevenueData = {
      summary: {
        totalRevenue: 125000,
        averagePerAppointment: 180,
        growthRate: 12.5,
        period: filters.dateRange
      },
      details: [],
      aggregations: {
        byMonth: {},
        bySpecialty: {},
        byDoctor: {}
      }
    };

    return mockRevenueData;
  }
  /**
   * Genera resumen de especialidades
   */
  private async generateSpecialtiesOverview(
    filters: ReportFilters,
    context: ReportExecutionContext
  ): Promise<ReportData> {
    try {
      // Query de doctores para obtener especialidades usando Admin SDK
      const doctorsSnapshot = await adminDb.collection('doctors').get();
      const doctors = doctorsSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      const specialtyStats = this.calculateSpecialtyStatistics(doctors);

      return {
        summary: {
          totalSpecialties: Object.keys(specialtyStats).length,
          totalDoctors: doctors.length,
          mostPopularSpecialty: this.getMostPopularSpecialty(specialtyStats)
        },
        details: doctors,
        aggregations: {
          bySpecialty: specialtyStats
        }
      };
    } catch (error) {
      throw new ReportGenerationError(
        'Error al generar resumen de especialidades',
        'SPECIALTIES_OVERVIEW_ERROR',
        { originalError: error }
      );
    }
  }

  // Métodos de utilidad privados
  private groupAppointmentsByDay(appointments: any[]) {
    return appointments.reduce((acc: any, apt: any) => {
      const date = new Date(apt.createdat).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { total: 0, completed: 0, cancelled: 0 };
      }
      acc[date].total++;
      if (apt.status === 'completed') acc[date].completed++;
      if (apt.status === 'cancelled') acc[date].cancelled++;
      return acc;
    }, {});
  }

  private async getDoctorsData(doctorIds: string[]) {
    try {
      const doctorsRef = adminDb.collection('doctors')
        .where('id', 'in', doctorIds);
      const snapshot = await doctorsRef.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      // Si falla la query por ID, intentar con __name__
      const doctorsPromises = doctorIds.map(async (id) => {
        const doc = await adminDb.collection('doctors').doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      });
      const results = await Promise.all(doctorsPromises);
      return results.filter(doc => doc !== null);
    }
  }

  private calculateDoctorPerformance(appointments: any[], doctors: any[]) {
    return doctors.map(doctor => {
      const doctorAppointments = appointments.filter(apt => apt.doctorid === doctor.id);
      const completed = doctorAppointments.filter(apt => apt.status === 'completed').length;
      
      return {
        ...doctor,
        totalAppointments: doctorAppointments.length,
        completedAppointments: completed,
        completionRate: doctorAppointments.length > 0 ? (completed / doctorAppointments.length * 100) : 0,
        averageRating: doctor.rating || 0
      };
    });
  }

  private calculateAverageRating(performance: any[]) {
    const ratings = performance.map(p => p.averageRating).filter(r => r > 0);
    return ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(2) : 0;
  }

  private getTopPerformer(performance: any[]) {
    return performance.reduce((top, current) => 
      current.completionRate > (top?.completionRate || 0) ? current : top, null
    );
  }

  private groupBySpecialty(performance: any[]) {
    return performance.reduce((acc, doctor) => {
      const specialty = doctor.specialty || 'General';
      if (!acc[specialty]) {
        acc[specialty] = { count: 0, totalAppointments: 0, averageRating: 0 };
      }
      acc[specialty].count++;
      acc[specialty].totalAppointments += doctor.totalAppointments;
      acc[specialty].averageRating += doctor.averageRating;
      return acc;
    }, {});
  }

  private calculatePerformanceDistribution(performance: any[]) {
    const distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
    performance.forEach(p => {
      if (p.completionRate >= 90) distribution.excellent++;
      else if (p.completionRate >= 75) distribution.good++;
      else if (p.completionRate >= 60) distribution.average++;
      else distribution.poor++;
    });
    return distribution;
  }

  private calculateDemographics(patients: any[]) {
    const totalPatients = patients.length;
    if (totalPatients === 0) {
      return {
        averageAge: 0,
        genderDistribution: {},
        ageGroups: {}
      };
    }

    // Calcular edad promedio
    const ages = patients.map(p => p.age || 0).filter(age => age > 0);
    const averageAge = ages.length > 0 ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0;

    // Distribución por género
    const genderDistribution = patients.reduce((acc, p) => {
      const gender = p.gender || 'unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});

    // Grupos de edad
    const ageGroups = patients.reduce((acc, p) => {
      const age = p.age || 0;
      let group = 'unknown';
      if (age <= 18) group = '0-18';
      else if (age <= 30) group = '19-30';
      else if (age <= 45) group = '31-45';
      else if (age <= 60) group = '46-60';
      else group = '60+';
      
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});

    return {
      averageAge,
      genderDistribution,
      ageGroups
    };
  }

  private calculateSpecialtyStatistics(doctors: any[]) {
    return doctors.reduce((acc, doctor) => {
      const specialty = doctor.specialty || 'General';
      if (!acc[specialty]) {
        acc[specialty] = {
          count: 0,
          averageRating: 0,
          verified: 0
        };
      }
      acc[specialty].count++;
      acc[specialty].averageRating += (doctor.rating || 0);
      if (doctor.isverified) acc[specialty].verified++;
      return acc;
    }, {});
  }

  private getMostPopularSpecialty(stats: any) {
    return Object.entries(stats).reduce((most: any, [specialty, data]: [string, any]) => 
      data.count > (most?.count || 0) ? { specialty, ...data } : most, null
    );
  }

  // Métodos de caché
  private getCachedReport(cacheKey: string): ReportData | null {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      cached.hitCount++;
      cached.lastAccessed = new Date();
      return cached.data;
    }
    this.cache.delete(cacheKey);
    return null;
  }

  private cacheReport(cacheKey: string, data: ReportData): void {
    const cacheEntry: ReportCache = {
      key: cacheKey,
      reportId: generateReportId(),
      data,
      expiresAt: new Date(Date.now() + this.CACHE_TTL),
      hitCount: 0,
      lastAccessed: new Date()
    };
    this.cache.set(cacheKey, cacheEntry);

    // Limpiar caché expirado
    this.cleanExpiredCache();
  }

  private cleanExpiredCache(): void {
    const now = new Date();
    for (const [key, cache] of this.cache.entries()) {
      if (cache.expiresAt <= now) {
        this.cache.delete(key);      }
    }
  }

  private calculateDemographics(patients: any[]) {
    const avgAge = patients.reduce((sum, p) => sum + (p.age || 0), 0) / patients.length;
    const genderCount = patients.reduce((acc, p) => {
      acc[p.gender] = (acc[p.gender] || 0) + 1;
      return acc;
    }, {});
    
    const ageGroups = patients.reduce((acc, p) => {
      const age = p.age || 0;
      const group = age < 18 ? 'pediatric' : age < 65 ? 'adult' : 'senior';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});

    return {
      averageAge: Math.round(avgAge),
      genderDistribution: genderCount,
      ageGroups: ageGroups
    };
  }
}
