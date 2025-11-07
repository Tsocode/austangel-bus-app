// services/firebase.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDzYIy3bPjJD5DJPBjNqQWzuWjbkL3Vj_o',
  authDomain: 'austangels.firebaseapp.com',
  projectId: 'austangels',
  storageBucket: 'austangels.firebasestorage.app',
  messagingSenderId: '503665611421',
  appId: '1:503665611421:web:7584e208551f51e3517a74',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
