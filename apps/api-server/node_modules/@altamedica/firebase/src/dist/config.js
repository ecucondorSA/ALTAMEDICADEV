"use strict";
exports.__esModule = true;
exports.storage = exports.db = exports.auth = void 0;
var app_1 = require("firebase/app");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var storage_1 = require("firebase/storage");
var firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAnpWXsurOBX3NyjYSBtFmWtOvLpeeTh88",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0079784791.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gen-lang-client-0079784791",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0079784791.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "186375390274",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:186375390274:web:2e7a6582b466cb2a8919db",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-X8FTKG2QT0"
};
// Initialize Firebase
var app = app_1.initializeApp(firebaseConfig);
// Initialize Firebase services
exports.auth = auth_1.getAuth(app);
exports.db = firestore_1.getFirestore(app);
exports.storage = storage_1.getStorage(app);
exports["default"] = app;
