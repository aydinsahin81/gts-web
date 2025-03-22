import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDYK9d4_UpwAtOlqvqfwjWaDnF2EHXKfeI",
  authDomain: "mtgtsapp.firebaseapp.com",
  databaseURL: "https://mtgtsapp-default-rtdb.firebaseio.com",
  projectId: "mtgtsapp",
  storageBucket: "mtgtsapp.firebasestorage.app",
  messagingSenderId: "338071169045",
  appId: "1:338071169045:web:bef9acd26184a8fddac61c",
  measurementId: "G-61GNYX3GS1"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Auth ve Database servislerini dışa aktar
export const auth = getAuth(app);
export const database = getDatabase(app);
export const analytics = getAnalytics(app);
export default app; 