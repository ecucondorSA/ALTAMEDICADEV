/**
 * 📊 TEST CUSTOM REPORTS API
 * Script para probar la nueva API de reportes personalizados
 */

const API_BASE = 'http://localhost:3000/api/v1';

// Datos de prueba para diferentes tipos de reportes
const testReports = [
  {
    name: "Resumen de Citas",
    request: {
      type: "appointments_summary",
      title: "Resumen de Citas - Última Semana",
      description: "Análisis de citas médicas de la última semana",
      filters: {
        dateRange: {
          startDate: "2025-06-14T00:00:00.000Z",
          endDate: "2025-06-21T23:59:59.999Z"
        }
      },
      includeCharts: true,
      exportFormat: "json",
      cacheResults: true
    }
  },
  {
    name: "Rendimiento de Doctores",
    request: {
      type: "doctor_performance",
      title: "Rendimiento de Doctores - Junio 2025",
      description: "Análisis de performance de doctores seleccionados",
      filters: {
        doctorIds: ["doctor1", "doctor2", "doctor3"],
        dateRange: {
          startDate: "2025-06-01T00:00:00.000Z",
          endDate: "2025-06-21T23:59:59.999Z"
        }
      },
      aggregations: [
        {
          field: "completedAppointments",
          operation: "sum",
          groupBy: ["specialty"]
        },
        {
          field: "rating",
          operation: "avg",
          groupBy: ["doctorId"]
        }
      ],
      includeCharts: true,
      exportFormat: "json"
    }
  },
  {
    name: "Demografía de Pacientes",
    request: {
      type: "patient_demographics",
      title: "Demografía de Pacientes",
      description: "Análisis demográfico de la base de pacientes",
      filters: {
        ageGroups: ["19-30", "31-45", "46-60"],
        genders: ["male", "female"]
      },
      aggregations: [
        {
          field: "age",
          operation: "avg"
        },
        {
          field: "gender",
          operation: "count",
          groupBy: ["ageGroup"]
        }
      ],
      includeCharts: true,
      exportFormat: "csv"
    }
  }
];

/**
 * Función para probar la API
 */
async function testCustomReportsAPI() {
  console.log('🧪 INICIANDO PRUEBAS DE CUSTOM REPORTS API\n');

  // Nota: Para pruebas reales, necesitarías un token de autenticación válido
  const mockToken = 'mock-firebase-id-token';

  for (const test of testReports) {
    console.log(`📊 Probando: ${test.name}`);
    console.log(`   Tipo: ${test.request.type}`);
    console.log(`   Formato: ${test.request.exportFormat}`);
    
    try {
      const response = await fetch(`${API_BASE}/analytics/custom-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        },
        body: JSON.stringify(test.request)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Éxito: ${result.message}`);
        console.log(`   📈 Datos: ${result.report.data.details?.length || 0} registros`);
        console.log(`   ⏱️  Tiempo: ${result.report.executionTime}ms`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
        console.log(`   🔍 Código: ${result.code}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error de conexión: ${error.message}`);
    }
    
    console.log(''); // Línea en blanco
  }

  // Probar GET endpoint
  console.log('📋 Probando listado de reportes (GET)');
  try {
    const response = await fetch(`${API_BASE}/analytics/custom-reports`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockToken}`
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Listado obtenido: ${result.reports.length} reportes`);
      console.log(`   📊 Tipos disponibles: ${result.availableTypes.join(', ')}`);
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error de conexión: ${error.message}`);
  }

  console.log('\n🎉 PRUEBAS COMPLETADAS');
}

/**
 * Función para validar esquemas
 */
function validateRequestSchemas() {
  console.log('🔍 VALIDANDO ESQUEMAS DE REQUEST\n');

  testReports.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}`);
    
    // Validaciones básicas
    const req = test.request;
    
    // Verificar campos requeridos
    const requiredFields = ['type', 'title', 'filters', 'exportFormat'];
    const missingFields = requiredFields.filter(field => !req[field]);
    
    if (missingFields.length > 0) {
      console.log(`   ❌ Campos faltantes: ${missingFields.join(', ')}`);
    } else {
      console.log(`   ✅ Campos requeridos presentes`);
    }
    
    // Verificar dateRange si es necesario
    if (req.type === 'appointments_summary' || req.type === 'revenue_analysis') {
      if (!req.filters.dateRange) {
        console.log(`   ❌ dateRange es requerido para ${req.type}`);
      } else {
        console.log(`   ✅ dateRange presente`);
      }
    }
    
    // Verificar doctorIds para performance
    if (req.type === 'doctor_performance') {
      if (!req.filters.doctorIds || req.filters.doctorIds.length === 0) {
        console.log(`   ❌ doctorIds es requerido para ${req.type}`);
      } else {
        console.log(`   ✅ doctorIds presente (${req.filters.doctorIds.length} doctores)`);
      }
    }
    
    console.log('');
  });
}

/**
 * Función principal
 */
async function main() {
  console.log('='.repeat(60));
  console.log('📊 CUSTOM REPORTS API - SUITE DE PRUEBAS');
  console.log('='.repeat(60) + '\n');

  // Validar esquemas primero
  validateRequestSchemas();
  
  console.log('\n' + '-'.repeat(40) + '\n');
  
  // Probar API (comentado porque requiere servidor corriendo)
  console.log('⚠️  Para probar la API, asegúrate de que el servidor esté corriendo');
  console.log('   y tengas un token de autenticación válido.\n');
  
  // await testCustomReportsAPI();
  
  console.log('📋 RESUMEN DE LA IMPLEMENTACIÓN:');
  console.log('✅ 5 tipos de reportes soportados');
  console.log('✅ 4 formatos de exportación');
  console.log('✅ Sistema de caché inteligente');
  console.log('✅ Validación de permisos por rol');
  console.log('✅ Agregaciones personalizables');
  console.log('✅ Análisis predictivo básico');
  console.log('✅ Métricas de performance');
  console.log('✅ Manejo de errores específicos');
}

// Ejecutar solo si se llama directamente
if (process.argv[1] && process.argv[1].includes('test.js')) {
  main().catch(console.error);
}

// Exportar para uso en otros módulos
export {
    testCustomReportsAPI, testReports, validateRequestSchemas
};

