'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';

// Singleton to prevent multiple initialization errors
let services: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} | null = null;

export function initializeFirebase() {
  if (services) return services;

  let firebaseApp: FirebaseApp;
  
  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.warn('Firebase config fallback:', e);
      firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  services = getSdks(firebaseApp);
  return services;
}

export function getSdks(firebaseApp: FirebaseApp) {
  let firestore: Firestore;
  
  try {
    firestore = getFirestore(firebaseApp);
  } catch (e) {
    try {
      firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (err) {
      firestore = getFirestore(firebaseApp);
    }
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
