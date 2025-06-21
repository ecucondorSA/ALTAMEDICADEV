"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
exports.__esModule = true;
exports.getFirebaseApp = exports.getFirebaseStorage = exports.getFirebaseFirestore = exports.getFirebaseAuth = exports.initializeFirebase = void 0;
var app_1 = require("firebase/app");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var storage_1 = require("firebase/storage");
// Default configuration for development
var defaultConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "altamedica-apis.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "altamedica-apis",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "altamedica-apis.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:demo",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};
// Firebase app instance
var app;
var auth;
var firestore;
var storage;
// Initialize Firebase
function initializeFirebase(config) {
    if (app_1.getApps().length === 0) {
        app = app_1.initializeApp(config || defaultConfig);
    }
    else {
        app = app_1.getApps()[0];
    }
    // Initialize services
    auth = auth_1.getAuth(app);
    firestore = firestore_1.getFirestore(app);
    storage = storage_1.getStorage(app);
    // Connect to emulators in development
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        connectToEmulators();
    }
    return app;
}
exports.initializeFirebase = initializeFirebase;
// Connect to Firebase emulators
function connectToEmulators() {
    try {
        // Connect Auth emulator
        if (!auth._delegate._authCredentialsProvider._emulatorHostAndPort) {
            auth_1.connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        }
        // Connect Firestore emulator
        if (!firestore._delegate._databaseId.projectId.includes('localhost')) {
            firestore_1.connectFirestoreEmulator(firestore, 'localhost', 8080);
        }
        // Connect Storage emulator
        if (!storage._delegate._host.includes('localhost')) {
            storage_1.connectStorageEmulator(storage, 'localhost', 9199);
        }
    }
    catch (error) {
        console.log('Emulators already connected or not available:', error);
    }
}
// Export services
function getFirebaseAuth() {
    if (!auth) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    return auth;
}
exports.getFirebaseAuth = getFirebaseAuth;
function getFirebaseFirestore() {
    if (!firestore) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    return firestore;
}
exports.getFirebaseFirestore = getFirebaseFirestore;
function getFirebaseStorage() {
    if (!storage) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    return storage;
}
exports.getFirebaseStorage = getFirebaseStorage;
function getFirebaseApp() {
    if (!app) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    return app;
}
exports.getFirebaseApp = getFirebaseApp;
// Re-export Firebase types and functions for convenience
var auth_2 = require("firebase/auth");
__createBinding(exports, auth_2, "createUserWithEmailAndPassword");
__createBinding(exports, auth_2, "onAuthStateChanged");
__createBinding(exports, auth_2, "sendEmailVerification");
__createBinding(exports, auth_2, "sendPasswordResetEmail");
__createBinding(exports, auth_2, "signInWithEmailAndPassword");
__createBinding(exports, auth_2, "signOut");
__createBinding(exports, auth_2, "updateProfile");
__createBinding(exports, auth_2, "type");
__createBinding(exports, auth_2, "type");
var firestore_2 = require("firebase/firestore");
__createBinding(exports, firestore_2, "addDoc");
__createBinding(exports, firestore_2, "arrayRemove");
__createBinding(exports, firestore_2, "arrayUnion");
__createBinding(exports, firestore_2, "collection");
__createBinding(exports, firestore_2, "deleteDoc");
__createBinding(exports, firestore_2, "doc");
__createBinding(exports, firestore_2, "getDoc");
__createBinding(exports, firestore_2, "getDocs");
__createBinding(exports, firestore_2, "increment");
__createBinding(exports, firestore_2, "limit");
__createBinding(exports, firestore_2, "onSnapshot");
__createBinding(exports, firestore_2, "orderBy");
__createBinding(exports, firestore_2, "query");
__createBinding(exports, firestore_2, "serverTimestamp");
__createBinding(exports, firestore_2, "setDoc");
__createBinding(exports, firestore_2, "startAfter");
__createBinding(exports, firestore_2, "updateDoc");
__createBinding(exports, firestore_2, "where");
__createBinding(exports, firestore_2, "type");
__createBinding(exports, firestore_2, "CollectionReference");
__createBinding(exports, firestore_2, "type");
__createBinding(exports, firestore_2, "type");
__createBinding(exports, firestore_2, "DocumentReference");
__createBinding(exports, firestore_2, "type");
__createBinding(exports, firestore_2, "DocumentSnapshot");
__createBinding(exports, firestore_2, "type");
__createBinding(exports, firestore_2, "Query");
__createBinding(exports, firestore_2, "type");
__createBinding(exports, firestore_2, "QuerySnapshot");
var storage_2 = require("firebase/storage");
__createBinding(exports, storage_2, "deleteObject");
__createBinding(exports, storage_2, "getDownloadURL");
__createBinding(exports, storage_2, "listAll");
__createBinding(exports, storage_2, "ref");
__createBinding(exports, storage_2, "uploadBytes");
__createBinding(exports, storage_2, "uploadString");
__createBinding(exports, storage_2, "type");
__createBinding(exports, storage_2, "type");
