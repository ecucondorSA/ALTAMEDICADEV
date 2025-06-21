"use strict";
exports.__esModule = true;
exports.firebaseAdmin = exports.adminStorage = exports.adminDb = exports.adminAuth = void 0;
var app_1 = require("firebase-admin/app");
var auth_1 = require("firebase-admin/auth");
var firestore_1 = require("firebase-admin/firestore");
var storage_1 = require("firebase-admin/storage");
// Verificar que las variables de entorno están disponibles
if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID is required');
}
if (!process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('FIREBASE_CLIENT_EMAIL is required');
}
if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('FIREBASE_PRIVATE_KEY is required');
}
// Configurar Firebase Admin solo si no está ya inicializado
var firebaseAdmin;
exports.firebaseAdmin = firebaseAdmin;
if (app_1.getApps().length === 0) {
    exports.firebaseAdmin = firebaseAdmin = app_1.initializeApp({
        credential: app_1.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
}
else {
    exports.firebaseAdmin = firebaseAdmin = app_1.getApps()[0];
}
// Exportar instancias de los servicios
exports.adminAuth = auth_1.getAuth(firebaseAdmin);
exports.adminDb = firestore_1.getFirestore(firebaseAdmin);
exports.adminStorage = storage_1.getStorage(firebaseAdmin);
exports["default"] = firebaseAdmin;
