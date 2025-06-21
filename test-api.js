/**
 * 🧪 TEST API CUSTOM REPORTS
 * Script para probar la API directamente
 */

const API_BASE = 'http://localhost:3001/api/v1';

async function testAPI() {
  console.log('🧪 PROBANDO API CUSTOM REPORTS\n');  const testData = {
    type: "appointments_summary",
    title: "Test Report - Appointments",
    description: "Reporte de prueba para citas médicas",
    filters: {
      dateRange: {
        startDate: "2025-06-14T00:00:00.000Z",
        endDate: "2025-06-21T23:59:59.999Z"
      }
    },
    exportFormat: "json",
    includeCharts: true,
    aggregations: [
      {
        field: "status",
        operation: "count",
        groupBy: ["status"]
      }
    ]
  };

  try {
    // Test POST
    console.log('📊 Probando POST /analytics/custom-reports');
    const response = await fetch(`${API_BASE}/analytics/custom-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  try {
    // Test GET
    console.log('\n📋 Probando GET /analytics/custom-reports');
    const response = await fetch(`${API_BASE}/analytics/custom-reports`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock-token'
      }
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testAPI();
