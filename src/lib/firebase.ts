import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, push, remove, get } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

let isInitialized = false;

// Initialize anonymous auth
export async function initializeAuth(): Promise<string> {
  if (isInitialized && auth.currentUser) {
    return auth.currentUser.uid;
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        isInitialized = true;
        unsubscribe();
        resolve(user.uid);
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          isInitialized = true;
          unsubscribe();
          resolve(userCredential.user.uid);
        } catch (error) {
          unsubscribe();
          reject(error);
        }
      }
    });
  });
}

export { database, auth, ref, onValue, set, update, push, remove, get };