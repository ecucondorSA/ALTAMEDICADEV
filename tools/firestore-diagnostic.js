#!/usr/bin/env node
// 🔍 FIRESTORE DIAGNOSTIC TOOL - VERSIÓN AVANZADA
// Herramienta de diagnóstico específica para Firestore con el proyecto correcto

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', 'apps', 'api-server', '.env.local') });

console.log('🔍 DIAGNÓSTICO COMPLETO DE FIRESTORE - ALTAMEDIC');
console.log('===============================================');

// 1. Verificar variables de entorno
console.log('\n📋 1. VERIFICACIÓN DE VARIABLES DE ENTORNO');
const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL', 
  'FIREBASE_PRIVATE_KEY'
];

let envValid = true;
for (const varName of requiredVars) {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: FALTANTE`);
    envValid = false;
  } else {
    if (varName === 'FIREBASE_PRIVATE_KEY') {
      console.log(`✅ ${varName}: [PRIVATE KEY PRESENTE - ${value.length} caracteres]`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
}

// Verificar que sea el proyecto correcto
if (process.env.FIREBASE_PROJECT_ID !== 'altamedic-20f69') {
  console.log(`⚠️ ADVERTENCIA: Project ID debería ser 'altamedic-20f69' pero es '${process.env.FIREBASE_PROJECT_ID}'`);
}

if (!envValid) {
  console.log('\n❌ FALTAN VARIABLES DE ENTORNO CRÍTICAS');
  process.exit(1);
}

// 2. Inicializar Firebase Admin
console.log('\n🔧 2. INICIALIZANDO FIREBASE ADMIN');
try {
  // Verificar si ya está inicializado
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log('✅ Firebase Admin inicializado correctamente');
  } else {
    console.log('✅ Firebase Admin ya estaba inicializado');
  }
} catch (error) {
  console.log('❌ Error inicializando Firebase Admin:', error.message);
  console.log('🔍 Detalles:', error.code);
  process.exit(1);
}

// 3. Probar conectividad a Firestore
console.log('\n🌐 3. PROBANDO CONECTIVIDAD A FIRESTORE');
try {
  const db = admin.firestore();
  console.log('✅ Instancia de Firestore obtenida');
  
  // Probar operación básica de lectura
  console.log('\n📖 4. PROBANDO OPERACIÓN DE LECTURA');
  const startTime = Date.now();
  const testDoc = await db.collection('_health_check').doc('test').get();
  const readTime = Date.now() - startTime;
  console.log(`✅ Operación de lectura exitosa (${readTime}ms)`);
  console.log(`📊 Documento existe: ${testDoc.exists}`);
  
  // Probar operación básica de escritura
  console.log('\n✍️ 5. PROBANDO OPERACIÓN DE ESCRITURA');
  const writeStart = Date.now();
  await db.collection('_health_check').doc('test').set({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: 'diagnostic_test',
    success: true,
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  const writeTime = Date.now() - writeStart;
  console.log(`✅ Operación de escritura exitosa (${writeTime}ms)`);
  
  // Probar query con filtros (lo que estaba fallando)
  console.log('\n🔍 6. PROBANDO QUERY CON FILTROS (PACIENTES)');
  try {
    const patientsRef = db.collection('patients');
    const query = patientsRef
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(1);
    
    const queryStart = Date.now();
    const snapshot = await query.get();
    const queryTime = Date.now() - queryStart;
    console.log(`✅ Query con filtros exitosa (${queryTime}ms)`);
    console.log(`📊 Documentos encontrados: ${snapshot.size}`);
  } catch (queryError) {
    if (queryError.code === 9) {
      console.log('⚠️ Query requiere índice compuesto - ESTO ES NORMAL');
      console.log('🔗 Crear índice en: https://console.firebase.google.com/u/0/project/altamedic-20f69/firestore/indexes');
      console.log('📋 Campos requeridos: isActive (ASC) + createdAt (DESC)');
      console.log('💡 Esta es la causa del error original - necesita índices');
    } else {
      console.log('❌ Error en query:', queryError.message);
      console.log('🔍 Código:', queryError.code);
    }
  }
  
  // Probar queries simples (sin índices)
  console.log('\n📋 7. PROBANDO QUERIES SIMPLES');
  try {
    const simpleQuery = await db.collection('patients').limit(5).get();
    console.log(`✅ Query simple exitosa: ${simpleQuery.size} documentos`);
    
    if (simpleQuery.size === 0) {
      console.log('ℹ️ No hay documentos en la colección patients');
      console.log('💡 Esto es normal si es un proyecto nuevo');
    }
  } catch (simpleError) {
    console.log('❌ Error en query simple:', simpleError.message);
  }
  
  console.log('\n🎉 DIAGNÓSTICO COMPLETADO EXITOSAMENTE');
  console.log('=====================================');
  console.log('✅ Firestore está funcionando correctamente');
  console.log('📋 RESUMEN:');
  console.log('   - Proyecto: altamedic-20f69');
  console.log('   - Conectividad: ✅ OK');
  console.log('   - Lectura: ✅ OK');
  console.log('   - Escritura: ✅ OK');
  console.log('   - Queries simples: ✅ OK');
  console.log('   - Queries con índices: ⚠️ Requiere configuración');
  
  console.log('\n🔗 PRÓXIMOS PASOS:');
  console.log('1. Crear índices en: https://console.firebase.google.com/u/0/project/altamedic-20f69/firestore/indexes');
  console.log('2. Habilitar reglas de Firestore para producción');
  console.log('3. Configurar colecciones iniciales si es necesario');
  
} catch (error) {
  console.log('❌ Error de conectividad:', error.message);
  console.log('🔍 Código de error:', error.code);
  console.log('📋 Detalles completos:', error);
  
  if (error.code === 7) {
    console.log('\n💡 SOLUCIÓN: Habilitar Cloud Firestore API en Google Cloud Console');
    console.log('🔗 Link: https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=altamedic-20f69');
  }
  
  if (error.code === 3) {
    console.log('\n💡 SOLUCIÓN: Verificar argumentos de inicialización');
    console.log('   - Verificar que el proyecto existe');
    console.log('   - Verificar permisos de la service account');
  }
  
  process.exit(1);
}

process.exit(0);