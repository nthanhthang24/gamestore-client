// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC1efvwK3jBRT1rIK30dc6bMXrs7PYiI1E",
  authDomain: "gamestore-93186.firebaseapp.com",
  projectId: "gamestore-93186",
  storageBucket: "gamestore-93186.firebasestorage.app",
  messagingSenderId: "583775805335",
  appId: "1:583775805335:web:83b5bce7c6dea5cb7f6ed2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
