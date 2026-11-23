// services/firebase.ts

import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
} from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { connectDatabaseEmulator, Database, getDatabase } from 'firebase/database';
import { connectFirestoreEmulator, Firestore, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, Functions, getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

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
// The React Native entry point exports this helper, but Firebase's shared
// TypeScript declarations currently omit it from the `firebase/auth` barrel.
const getReactNativePersistence = (FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof ReactNativeAsyncStorage) => any;
}).getReactNativePersistence;

let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (error) {
    // Fast refresh can re-evaluate this module after Auth was already initialized.
    if ((error as { code?: string })?.code !== 'auth/already-initialized') throw error;
    auth = getAuth(app);
  }
}

const db: Firestore = getFirestore(app);
const realtimeDb: Database = getDatabase(app);
const functions: Functions = getFunctions(app);

if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ??
    (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
  connectDatabaseEmulator(realtimeDb, emulatorHost, 9000);
  connectFunctionsEmulator(functions, emulatorHost, 5001);
}

export { app, auth, db, realtimeDb, functions };
