#!/usr/bin/env node
// 🔧 FIRESTORE FIELD CASE CORRECTION TOOL
// Herramienta para verificar y corregir case sensitivity en campos de Firestore

import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', 'apps', 'api-server', '.env.local') });

console.log('🔧 CORRECCIÓN DE CASE SENSITIVITY - FIRESTORE');
console.log('============================================');

// Inicializar Firebase Admin si no está ya inicializado
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

// Mapeo de campos incorrectos a correctos
const fieldCorrections = {
  'createdAt': 'createdat',
  'updatedAt': 'updatedat',
  'isActive': 'isactive',
  'firstName': 'firstname', 
  'lastName': 'lastname'
};

async function analyzeAndCorrectFields() {
  try {
    console.log('\n📊 1. ANALIZANDO ESTRUCTURA DE CAMPOS ACTUAL');
    
    // Verificar colección de pacientes
    const patientsSnapshot = await db.collection('patients').limit(10).get();
    console.log(`📋 Documentos en patients: ${patientsSnapshot.size}`);
    
    if (patientsSnapshot.size > 0) {
      const sampleDoc = patientsSnapshot.docs[0];
      const data = sampleDoc.data();
      
      console.log('\n🔍 CAMPOS ENCONTRADOS EN MUESTRA:');
      Object.keys(data).forEach(field => {
        const hasCorrection = fieldCorrections[field];
        if (hasCorrection) {
          console.log(`⚠️  ${field} → debería ser: ${hasCorrection}`);
        } else {
          console.log(`✅ ${field}`);
        }
      });
      
      console.log('\n📝 ESTRUCTURA DE DOCUMENTO EJEMPLO:');
      console.log(JSON.stringify(data, null, 2));
    }
    
    console.log('\n🏗️ 2. RECOMENDACIONES DE ÍNDICES');
    console.log('================================');
    console.log('Para Firebase Console (usar exact case):');
    console.log('1. isactive (ASC) + createdat (DESC)');
    console.log('2. isactive (ASC) + updatedat (DESC)');
    console.log('3. Single field: createdat (DESC)');
    console.log('4. Single field: updatedat (DESC)');
    
    console.log('\n🔗 CREAR ÍNDICES EN:');
    console.log('https://console.firebase.google.com/u/0/project/altamedic-20f69/firestore/indexes');
    
    console.log('\n💡 3. VERIFICANDO QUERIES CON CASE CORRECTO');
    
    // Probar query con campos en lowercase
    try {
      const correctedQuery = await db.collection('patients')
        .where('isactive', '==', true)
        .limit(1)
        .get();
      
      console.log(`✅ Query con isactive: ${correctedQuery.size} documentos`);
    } catch (error) {
      console.log(`❌ Query con isactive falló: ${error.message}`);
    }
    
    // Probar query con createdat
    try {
      const createQuery = await db.collection('patients')
        .orderBy('createdat', 'desc')
        .limit(1)
        .get();
      
      console.log(`✅ Query con createdat: ${createQuery.size} documentos`);
    } catch (error) {
      console.log(`❌ Query con createdat falló: ${error.message}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error analizando campos:', error.message);
    return false;
  }
}

// Función para generar código de API corregido
function generateCorrectedApiCode() {
  console.log('\n💻 4. CÓDIGO DE API CORREGIDO');
  console.log('=============================');
  
  const correctedQuery = `
// QUERY CORREGIDA PARA PACIENTES (case-sensitive)
let query = adminDb.collection('patients');

// Filtros con case correcto
if (searchData.isActive !== undefined) {
  query = query.where('isactive', '==', searchData.isActive);
}

// Ordenar por fecha de creación (case correcto)
query = query.orderBy('createdat', 'desc');

// Al crear documentos, usar lowercase
const patientProfile = {
  ...patientData,
  isactive: true,
  createdat: admin.firestore.FieldValue.serverTimestamp(),
  updatedat: admin.firestore.FieldValue.serverTimestamp(),
};`;
  
  console.log(correctedQuery);
  
  console.log('\n📋 ÍNDICES REQUERIDOS:');
  console.log('1. isactive (ASC) + createdat (DESC)');
  console.log('2. createdat (DESC) - single field');
}

// Ejecutar análisis
analyzeAndCorrectFields().then(success => {
  if (success) {
    generateCorrectedApiCode();
    console.log('\n🎯 RESUMEN DE ACCIONES REQUERIDAS:');
    console.log('1. Crear índices en Firebase Console con case exacto');
    console.log('2. Actualizar código API para usar campos lowercase');
    console.log('3. Verificar que nuevos documentos usen case correcto');
  }
  process.exit(success ? 0 : 1);
});
