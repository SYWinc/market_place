// services/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBc4iO1FjcFBEiUuh-Oe_qQ8Fg8usvYlJU",
  authDomain: "rosariostore-b6715.firebaseapp.com",
  projectId: "rosariostore-b6715",
  storageBucket: "rosariostore-b6715.firebasestorage.app",
  messagingSenderId: "660093857279",
  appId: "1:660093857279:web:e458f3f76e119717d9cbca",
  measurementId: "G-GRTZ5TKFPH",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
