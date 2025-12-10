import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { loadConfig, loadConfigSync, DbType } from '../services/configService';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isFirebaseConfigured: boolean;
  dbType: DbType;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  const [dbType, setDbType] = useState<DbType>('firebase');

  useEffect(() => {
    const loadConfigData = async () => {
      try {
        const config = await loadConfig();
        
        // dbType only affects data storage, not authentication
        setDbType(config.dbType);
        
        // Firebase is ALWAYS required for authentication, regardless of dbType
        const firebaseConfigured = !!(config.firebaseConfig && config.firebaseConfig.projectId);
        setIsFirebaseConfigured(firebaseConfigured);

        // Always initialize Firebase for authentication (even if MySQL is selected for data storage)
        if (firebaseConfigured) {
          const firebaseModule = await import('../services/firebaseConfig');
          await firebaseModule.reinitializeFirebase();
          
          // Check auth after Firebase is initialized
          if (firebaseModule.auth) {
            const unsubscribe = onAuthStateChanged(firebaseModule.auth, (user) => {
              setCurrentUser(user);
              setLoading(false);
            });
            return unsubscribe;
          }
        }
        
        // If Firebase is not configured, user cannot authenticate
        setCurrentUser(null);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load config:', error);
        // Fallback to sync version
        const config = loadConfigSync();
        
        // dbType only affects data storage, not authentication
        setDbType(config.dbType);
        
        // Firebase is ALWAYS required for authentication
        const firebaseConfigured = !!(config.firebaseConfig && config.firebaseConfig.projectId);
        setIsFirebaseConfigured(firebaseConfigured);
        
        if (auth && firebaseConfigured) {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
          });
          return unsubscribe;
        } else {
          setCurrentUser(null);
          setLoading(false);
        }
      }
    };

    loadConfigData();
  }, []);

  const login = async (email: string, pass: string) => {
    if (!auth) {
      throw new Error("Firebase is not configured.");
    }
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    try {
      if (!auth) {
        console.warn("Auth not available for logout");
        // Clear local state even if auth is not available
        setCurrentUser(null);
        return;
      }
      console.log("Logging out...");
      await signOut(auth);
      // Ensure user state is cleared
      setCurrentUser(null);
      console.log("Logout successful");
    } catch (error) {
      console.error("Error during logout:", error);
      // Clear user state even if signOut fails
      setCurrentUser(null);
      throw error;
    }
  };

  const value = {
    currentUser,
    login,
    logout,
    loading,
    isFirebaseConfigured,
    dbType
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
