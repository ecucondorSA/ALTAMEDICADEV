import { adminDb } from '@altamedica/firebase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔥 INICIANDO DIAGNÓSTICO DETALLADO DE FIRESTORE');
  
  try {
    // 1. Verificar configuración
    console.log('1️⃣ Verificando configuración...');
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    console.log('   Project ID:', projectId);
    console.log('   Client Email:', clientEmail);
    console.log('   Private Key presente:', !!process.env.FIREBASE_PRIVATE_KEY);
    
    // 2. Probar inicialización
    console.log('2️⃣ Probando inicialización...');
    const db = adminDb;
    console.log('   ✅ Firestore inicializado correctamente');
    
    // 3. Probar conectividad básica
    console.log('3️⃣ Probando conectividad básica...');
    const startTime = Date.now();
    const result = await db.collection('health').limit(1).get();
    const endTime = Date.now();
    
    console.log('   ✅ Conexión exitosa');
    console.log('   📊 Tiempo de respuesta:', (endTime - startTime), 'ms');
    console.log('   📄 Documentos encontrados:', result.size);
      const responseData: any = {
      status: 'success',
      config: {
        projectId,
        clientEmail,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
      },
      connection: {
        success: true,
        responseTime: endTime - startTime,
        documentsFound: result.size
      },
      documents: result.docs.map((doc: any) => ({ id: doc.id, data: doc.data() }))
    };
    
    // 4. Probar escritura
    console.log('4️⃣ Probando escritura...');
    const testDoc = {
      timestamp: new Date().toISOString(),
      status: 'test',
      message: 'Diagnóstico de conectividad desde API'
    };
    
    const writeResult = await db.collection('health').add(testDoc);
    console.log('   ✅ Escritura exitosa, ID:', writeResult.id);
    responseData.writeTest = { success: true, docId: writeResult.id };
    
    // 5. Limpiar documento de prueba
    await writeResult.delete();
    console.log('   🧹 Documento de prueba eliminado');
    
    console.log('🎉 DIAGNÓSTICO COMPLETO: Firestore funciona correctamente');
    
    return NextResponse.json(responseData);
      } catch (error: any) {
    console.error('❌ ERROR EN DIAGNÓSTICO:');
    console.error('   Mensaje:', error?.message);
    console.error('   Código:', error?.code);
    console.error('   Stack:', error?.stack);
    
    return NextResponse.json({
      status: 'error',
      error: {
        message: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN',
        stack: error?.stack
      },
      config: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      }
    }, { status: 500 });
  }
}
