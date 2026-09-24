import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Provided Firebase configuration with fallback
export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || "AIzaSyCmLOfZ7LRoRGb_vInFc--w_R4wz5-LeO0",
  authDomain: firebaseConfigJson.authDomain || "btc-187b1.firebaseapp.com",
  projectId: firebaseConfigJson.projectId || "btc-187b1",
  storageBucket: firebaseConfigJson.storageBucket || "btc-187b1.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || "545945716463",
  appId: firebaseConfigJson.appId || "1:545945716463:web:590f49b07de379f55d7d1a",
  measurementId: firebaseConfigJson.measurementId || "G-9EKB4ZPQVH"
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth & Firestore with databaseId if specified
export const auth = getAuth(app);
export const db = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Analytics conditionally (safe for browser environments)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported in this environment
  });
}
