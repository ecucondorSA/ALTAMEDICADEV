#!/usr/bin/env node
/**
 * 🔄 MONITOR AUTOMÁTICO: Creación de Base de Datos Firestore
 * Verifica cada 10 segundos hasta que la DB esté operativa
 */

import fetch from 'node-fetch';

let attempts = 0;
const maxAttempts = 30; // 5 minutos máximo

console.log('🔄 MONITOR: CREACIÓN DE BASE DE DATOS FIRESTORE');
console.log('='.repeat(50));
console.log('📍 PROYECTO ACTUALIZADO: altamedic-20f69');
console.log('🌐 Firebase Console: https://console.firebase.google.com/project/altamedic-20f69/firestore');
console.log('🔑 Service Accounts: https://console.cloud.google.com/iam-admin/serviceaccounts?project=altamedic-20f69');
console.log('');
console.log('📋 PASOS EN FIREBASE CONSOLE:');
console.log('   1. Hacer clic en "Create database"');
console.log('   2. Seleccionar "Start in production mode"');
console.log('   3. Elegir región (us-central1 recomendado)');
console.log('   4. Esperar a que se complete la creación');
console.log('');
console.log('⏰ Verificando cada 10 segundos...');
console.log('⚠️  Presiona Ctrl+C para detener');
console.log('');

async function checkDatabaseCreation() {
    attempts++;
    const timestamp = new Date().toLocaleTimeString();
    
    try {
        console.log(`🔍 [${timestamp}] Intento ${attempts}/${maxAttempts} - Verificando DB...`);
        
        const response = await fetch('http://localhost:3001/api/v1/health', {
            timeout: 5000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const dbStatus = data.checks.database;
        
        console.log(`   📊 Database: ${dbStatus}`);
        
        if (dbStatus === 'healthy') {
            console.log('');
            console.log('🎉 ¡ÉXITO! BASE DE DATOS FIRESTORE CREADA Y OPERATIVA');
            console.log('='.repeat(55));
            console.log('✅ Firestore está completamente funcional');
            console.log('✅ Todos los servicios están operativos');
            console.log('');
            console.log('🚀 PRÓXIMOS PASOS:');
            console.log('   1. Probar endpoints específicos');
            console.log('   2. Verificar reglas de seguridad');
            console.log('   3. Ejecutar tests de integración');
            console.log('');
            console.log('🔗 Verificar estado completo:');
            console.log('   curl http://localhost:3001/api/v1/health');
            process.exit(0);
        } else if (dbStatus === 'unhealthy') {
            // Verificar tipo de error específico
            const debugResponse = await fetch('http://localhost:3001/api/v1/debug-firestore');
            const debugData = await debugResponse.json();
            
            if (debugData.error?.code === 5) { // NOT_FOUND
                console.log(`   ⏳ Base de datos aún no existe - Continúa con la creación...`);
            } else {
                console.log(`   ❌ Error: ${debugData.error?.message || 'Unknown error'}`);
            }
        }
        
    } catch (error) {
        console.log(`   ❌ Error conectando: ${error.message}`);
        console.log(`   🔧 Verificar que el servidor esté corriendo en puerto 3001`);
    }
    
    if (attempts >= maxAttempts) {
        console.log('');
        console.log('⏰ TIEMPO LÍMITE ALCANZADO');
        console.log('');
        console.log('🔧 VERIFICACIONES MANUALES:');
        console.log('   1. ¿Se creó la base de datos en Firebase Console?');
        console.log('   2. ¿Está en la región correcta?');
        console.log('   3. ¿Las reglas están configuradas?');
        console.log('');
        console.log('🚀 COMANDOS DE VERIFICACIÓN:');
        console.log('   curl http://localhost:3001/api/v1/health');
        console.log('   curl http://localhost:3001/api/v1/debug-firestore');
        process.exit(1);
    }
}

// Verificación inicial
await checkDatabaseCreation();

// Verificaciones periódicas cada 10 segundos
const interval = setInterval(async () => {
    await checkDatabaseCreation();
}, 10000);

// Manejo de Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n🛑 MONITOR DETENIDO POR USUARIO');
    console.log('');
    console.log('📋 ESTADO ACTUAL:');
    console.log(`   Intentos realizados: ${attempts}`);
    console.log('   Base de datos: Pendiente de creación');
    console.log('');
    console.log('🔗 VERIFICAR MANUALMENTE:');
    console.log('   curl http://localhost:3001/api/v1/health');
    clearInterval(interval);
    process.exit(0);
});
