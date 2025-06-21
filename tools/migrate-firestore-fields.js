#!/usr/bin/env node
// 🔄 MIGRACIÓN DE DATOS FIRESTORE - CASE CORRECTION
// Script para migrar campos de mayúscula a minúscula

import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', 'apps', 'api-server', '.env.local') });

console.log('🔄 MIGRACIÓN DE CAMPOS FIRESTORE');
console.log('===============================');

// Inicializar Firebase Admin
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

async function migratePatientFields() {
  try {
    console.log('\n📊 1. OBTENIENDO DOCUMENTOS DE PACIENTES');
    const patientsSnapshot = await db.collection('patients').get();
    console.log(`📋 Total documentos: ${patientsSnapshot.size}`);
    
    if (patientsSnapshot.size === 0) {
      console.log('ℹ️ No hay documentos para migrar');
      return true;
    }
    
    console.log('\n🔄 2. MIGRANDO CAMPOS...');
    let migrated = 0;
    let skipped = 0;
    
    const batch = db.batch();
    
    for (const doc of patientsSnapshot.docs) {
      const data = doc.data();
      const updates = {};
      let hasUpdates = false;
      
      // Migrar createdAt → createdat
      if (data.createdAt && !data.createdat) {
        updates.createdat = data.createdAt;
        hasUpdates = true;
      }
      
      // Migrar updatedAt → updatedat
      if (data.updatedAt && !data.updatedat) {
        updates.updatedat = data.updatedAt;
        hasUpdates = true;
      }
      
      // Migrar isActive → isactive
      if (data.isActive !== undefined && data.isactive === undefined) {
        updates.isactive = data.isActive;
        hasUpdates = true;
      }
      
      if (hasUpdates) {
        batch.update(doc.ref, updates);
        console.log(`✅ Migrando documento: ${doc.id}`);
        migrated++;
      } else {
        console.log(`⏭️ Saltando documento: ${doc.id} (ya migrado)`);
        skipped++;
      }
    }
    
    if (migrated > 0) {
      console.log(`\n💾 3. APLICANDO ${migrated} ACTUALIZACIONES...`);
      await batch.commit();
      console.log('✅ Migración completada exitosamente');
    } else {
      console.log('\n✅ No se requieren migraciones');
    }
    
    console.log('\n📊 RESUMEN:');
    console.log(`   - Migrados: ${migrated}`);
    console.log(`   - Saltados: ${skipped}`);
    console.log(`   - Total: ${patientsSnapshot.size}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    return false;
  }
}

// Función para crear datos de prueba con case correcto
async function createTestPatient() {
  try {
    console.log('\n🧪 4. CREANDO PACIENTE DE PRUEBA');
    
    const testPatient = {
      userId: 'test-user-' + Date.now(),
      email: 'test@altamedica.com',
      name: 'Paciente de Prueba',
      isactive: true,
      createdat: admin.firestore.FieldValue.serverTimestamp(),
      updatedat: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const docRef = await db.collection('patients').add(testPatient);
    console.log(`✅ Paciente de prueba creado: ${docRef.id}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error creando paciente de prueba:', error.message);
    return false;
  }
}

// Ejecutar migración
migratePatientFields().then(async (success) => {
  if (success) {
    await createTestPatient();
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Crear índices en Firebase Console:');
    console.log('   - isactive (ASC) + createdat (DESC)');
    console.log('   - createdat (DESC) - single field');
    console.log('2. Probar API: curl http://localhost:3001/api/v1/patients');
    console.log('3. Verificar que queries funcionen correctamente');
  }
  process.exit(success ? 0 : 1);
});
