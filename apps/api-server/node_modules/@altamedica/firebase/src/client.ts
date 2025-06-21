import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';

// Firebase configuration interface
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Default configuration for development
const defaultConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "altamedica-apis.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "altamedica-apis",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "altamedica-apis.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:demo",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Firebase app instance
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

// Initialize Firebase
export function initializeFirebase(config?: FirebaseConfig): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(config || defaultConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize services
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);

  // Connect to emulators in development
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    connectToEmulators();
  }

  return app;
}

// Connect to Firebase emulators
function connectToEmulators() {
  try {
    // Connect Auth emulator
    if (!auth._delegate._authCredentialsProvider._emulatorHostAndPort) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }

    // Connect Firestore emulator
    if (!firestore._delegate._databaseId.projectId.includes('localhost')) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }

    // Connect Storage emulator
    if (!storage._delegate._host.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
  } catch (error) {
    console.log('Emulators already connected or not available:', error);
  }
}

// Export services
export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firestore;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return storage;
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return app;
}

// Re-export Firebase types and functions for convenience
export {
    createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile, type User,
    type UserCredential
} from 'firebase/auth';

export {
    addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc,
    getDoc,
    getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAfter, updateDoc, where, type CollectionReference, type DocumentData, type DocumentReference, type DocumentSnapshot, type Query, type QuerySnapshot
} from 'firebase/firestore';

export {
    deleteObject, getDownloadURL, listAll, ref,
    uploadBytes,
    uploadString, type StorageReference,
    type UploadResult
} from 'firebase/storage';

