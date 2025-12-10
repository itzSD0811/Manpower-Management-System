import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { loadConfigSync } from './configService';

// Use sync version for initial module load (fallback to localStorage)
const config = loadConfigSync();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// The static config is now just a fallback or for initial setup
let firebaseConfig = config.firebaseConfig;

// Function to reinitialize Firebase with new config (called after config is updated)
export const reinitializeFirebase = async () => {
  const updatedConfig = await import('./configService').then(m => m.loadConfig());
  firebaseConfig = updatedConfig.firebaseConfig;
  
  if (firebaseConfig && firebaseConfig.projectId) {
    try {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      // Set persistence to session-only (not local) for security - prevents cross-device login
      await setPersistence(auth, browserSessionPersistence);
      db = getFirestore(app);
    } catch (error) {
      console.error("Failed to reinitialize Firebase with updated config:", error);
      app = null;
      auth = null;
      db = null;
    }
  }
};

if (firebaseConfig && firebaseConfig.projectId) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    // Set persistence to session-only (not local) for security - prevents cross-device login
    // This ensures sessions only last for the browser session, not across devices
    setPersistence(auth, browserSessionPersistence).catch((error) => {
      console.error("Failed to set auth persistence:", error);
    });
    db = getFirestore(app);
  } catch (error) {
    console.error("Failed to initialize Firebase with provided config:", error);
    // If initialization fails, keep everything as null
    app = null;
    auth = null;
    db = null;
  }
} else {
  console.warn("Firebase config not found or incomplete. Firebase services will be disabled.");
}

// Export the potentially null services
export { app, auth, db };

// Also export the config itself, which might be needed by other services
export { firebaseConfig };
