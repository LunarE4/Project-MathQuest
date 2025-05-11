import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyACIMD6G3b5sOtwf4My7uOua4NjGzqVdyI",
  authDomain: "mathquest-82ac7.firebaseapp.com",
  databaseURL: "https://mathquest-82ac7-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mathquest-82ac7",
  storageBucket: "mathquest-82ac7.firebasestorage.app",
  messagingSenderId: "121975033868",
  appId: "1:121975033868:web:8b83e54b4efef12eb09e29",
  measurementId: "G-6ZDXZ7JP6Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export { db };
export const auth = getAuth(app);

// THIS IS CRUCIAL - sets persistent login
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Persistence error:", error);
  });