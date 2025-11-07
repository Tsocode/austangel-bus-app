// services/firebase.ts

import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyDzYIy3bPjJD5DJPBjNqQWzuWjbkL3Vj_o',
  authDomain: 'austangels.firebaseapp.com',
  projectId: 'austangels',
  storageBucket: 'austangels.firebasestorage.app',
  messagingSenderId: '503665611421',
  appId: '1:503665611421:web:7584e208551f51e3517a74',
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(app);
} catch {
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);
const realtimeDb: Database = getDatabase(app);

export { app, auth, db, realtimeDb };
