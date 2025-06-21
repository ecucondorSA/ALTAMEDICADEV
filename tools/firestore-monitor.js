#!/usr/bin/env node
/**
 * 🔄 MONITOR EN TIEMPO REAL - Estado de Firestore
 * Verifica automáticamente cada 15 segundos hasta que Firestore esté healthy
 */

import fetch from 'node-fetch';

let attempts = 0;
const maxAttempts = 40; // 10 minutos máximo

console.log('🔄 MONITOR DE FIRESTORE EN TIEMPO REAL');
console.log('=====================================');
console.log('⏰ Verificando cada 15 segundos...');
console.log('⚠️  Presiona Ctrl+C para detener');
console.log('');

async function checkFirestoreStatus() {
    attempts++;
    const timestamp = new Date().toLocaleTimeString();
    
    try {
        console.log(`🔍 [${timestamp}] Intento ${attempts}/${maxAttempts} - Verificando...`);
        
        const response = await fetch('http://localhost:3001/api/v1/health', {
            timeout: 5000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const dbStatus = data.checks.database;
        const authStatus = data.checks.auth;
        const apiStatus = data.checks.api;
        
        console.log(`   📊 DB: ${dbStatus} | Auth: ${authStatus} | API: ${apiStatus}`);
        
        if (dbStatus === 'healthy') {
            console.log('');
            console.log('🎉 ¡ÉXITO! FIRESTORE ESTÁ FUNCIONANDO');
            console.log('====================================');
            console.log('✅ Todos los servicios están operativos');
            console.log('');
            console.log('🚀 PRÓXIMOS PASOS:');
            console.log('   1. Probar endpoints específicos');
            console.log('   2. Verificar funcionalidad completa');
            console.log('   3. Ejecutar tests de integración');
            process.exit(0);
        } else {
            console.log(`   ⏳ Esperando habilitación de la API...`);
        }
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log(`   🔧 Verificar que el servidor esté corriendo en puerto 3001`);
    }
    
    if (attempts >= maxAttempts) {
        console.log('');
        console.log('⏰ TIEMPO LÍMITE ALCANZADO');
        console.log('');
        console.log('🔧 SOLUCIONES MANUALES:');
        console.log('   1. Verificar que habilitaste la API en Google Cloud Console');
        console.log('   2. Esperar hasta 10 minutos para propagación');
        console.log('   3. Ejecutar: curl http://localhost:3001/api/v1/health');
        console.log('   4. Si persiste, revisar configuración de Service Account');
        process.exit(1);
    }
}

// Verificación inicial
await checkFirestoreStatus();

// Verificaciones periódicas
const interval = setInterval(async () => {
    await checkFirestoreStatus();
}, 15000);
