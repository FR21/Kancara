import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDLzu9RILInj8wkLFl_5x85FZ7BDSZUkbM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kancara-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kancara-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kancara-app.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "855024553609",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:855024553609:web:6bcdeb85d1b62232d80058",
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize persistence strictly in memory to comply with rules.md
// (No tokens in localStorage/IndexedDB).
if (typeof window !== "undefined") {
  setPersistence(auth, inMemoryPersistence).catch(console.error);
}
