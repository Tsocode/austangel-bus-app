// services/firebase.ts

import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore } from 'firebase/firestore';

// Prefer env-backed config so keys can vary per environment; fall back to static config so dev still boots.
const envConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const fallbackConfig: FirebaseOptions = {
  apiKey: 'AIzaSyDzYIy3bPjJD5DJPBjNqQWzuWjbkL3Vj_o',
  authDomain: 'austangels.firebaseapp.com',
  projectId: 'austangels',
  storageBucket: 'austangels.firebasestorage.app',
  messagingSenderId: '503665611421',
  appId: '1:503665611421:web:7584e208551f51e3517a74',
};

const requiredKeys: (keyof FirebaseOptions)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const hasEnvConfig = requiredKeys.every((key) => !!envConfig[key]);
const firebaseConfig: FirebaseOptions = hasEnvConfig ? envConfig : fallbackConfig;

if (!hasEnvConfig) {
  console.warn(
    'Firebase env vars missing; using fallback config. Set EXPO_PUBLIC_FIREBASE_* to override.'
  );
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
// `initializeAuth` is optional on web/Expo; `getAuth` will create an instance if none exists.
// Using this guard avoids calling `initializeAuth` twice during fast refresh.
auth = getApps().length ? getAuth(app) : initializeAuth(app);

const db: Firestore = getFirestore(app);
const realtimeDb: Database = getDatabase(app);

export { app, auth, db, realtimeDb };
