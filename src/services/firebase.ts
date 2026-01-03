// services/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCjq7TReoUvyxHNeePKMEwIunrHc_Kq_Fc",
  authDomain: "marketexpress-c4765.firebaseapp.com",
  projectId: "marketexpress-c4765",
  storageBucket: "marketexpress-c4765.firebasestorage.app",
  messagingSenderId: "580193543228",
  appId: "1:580193543228:web:94a8d27564613ba34c8f39",
  measurementId: "G-48YZPPFKFJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
