import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC3jlFm97tglbtXnBwetRbgxARJk9vBIhE",
  authDomain: "test-6d15d.firebaseapp.com",
  projectId: "test-6d15d",
  storageBucket: "test-6d15d.firebasestorage.app",
  messagingSenderId: "588270489187",
  appId: "1:588270489187:web:842bf444f701bd067f3256",
  measurementId: "G-YF0MNNDQ0M",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
