/**
 * TEST SIMPLE DE LA API CUSTOM REPORTS
 */

// Probar con curl directo para eliminar variables
const { exec } = require('child_process');

const testCases = [
  {
    name: 'GET Health Check',
    command: 'curl -s "http://localhost:3001/api/v1/health"'
  },
  {
    name: 'GET Custom Reports (list)',
    command: 'curl -s -X GET "http://localhost:3001/api/v1/analytics/custom-reports" -H "Authorization: Bearer mock-token"'
  }
];

async function runTests() {
  console.log('🧪 PRUEBAS SIMPLES DE API');
  
  for (const test of testCases) {
    console.log(`\n📋 ${test.name}`);
    
    try {
      const result = await new Promise((resolve, reject) => {
        exec(test.command, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      
      console.log('✅ Response:', result);
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

runTests().catch(console.error);
