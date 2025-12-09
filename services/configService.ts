import { MysqlConfig, FirebaseConfig } from '../types';

export type DbType = 'firebase' | 'mysql';

export interface AppConfig {
  dbType: DbType;
  mysqlConfig?: MysqlConfig;
  firebaseConfig?: FirebaseConfig;
}

const API_URL = 'http://localhost:3001/api';

// Fallback to localStorage for backward compatibility and when server is not available
const DB_SELECTION_KEY = 'dbSelection';
const MYSQL_CONFIG_KEY = 'mysqlConfig';
const FIREBASE_CONFIG_KEY = 'firebaseConfig';

// Load config from API, fallback to localStorage if API fails
export const loadConfig = async (): Promise<AppConfig> => {
  try {
    const response = await fetch(`${API_URL}/config`);
    if (response.ok) {
      const config = await response.json();
      // Also sync to localStorage as backup
      if (config.dbType) {
        localStorage.setItem(DB_SELECTION_KEY, config.dbType);
      }
      if (config.mysqlConfig) {
        localStorage.setItem(MYSQL_CONFIG_KEY, JSON.stringify(config.mysqlConfig));
      }
      if (config.firebaseConfig) {
        localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config.firebaseConfig));
      }
      return config;
    }
    throw new Error('Failed to load config from server');
  } catch (error) {
    console.warn('Failed to load config from API, falling back to localStorage:', error);
    // Fallback to localStorage
    const dbType = localStorage.getItem(DB_SELECTION_KEY) as DbType | null;
    const mysqlConfigStr = localStorage.getItem(MYSQL_CONFIG_KEY);
    const firebaseConfigStr = localStorage.getItem(FIREBASE_CONFIG_KEY);

    const mysqlConfig = mysqlConfigStr ? JSON.parse(mysqlConfigStr) : {};
    const firebaseConfig = firebaseConfigStr ? JSON.parse(firebaseConfigStr) : {};

    return {
      dbType: dbType || 'firebase',
      mysqlConfig: mysqlConfig,
      firebaseConfig: firebaseConfig
    };
  }
};

// Save config to API, also save to localStorage as backup
export const saveConfig = async (config: AppConfig): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to save config to server');
    }

    // Also save to localStorage as backup
    localStorage.setItem(DB_SELECTION_KEY, config.dbType);
    if (config.dbType === 'mysql' && config.mysqlConfig) {
      localStorage.setItem(MYSQL_CONFIG_KEY, JSON.stringify(config.mysqlConfig));
    }
    if (config.dbType === 'firebase' && config.firebaseConfig) {
      localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config.firebaseConfig));
    }
  } catch (error) {
    console.error('Failed to save config to API, saving to localStorage only:', error);
    // Fallback to localStorage only
    localStorage.setItem(DB_SELECTION_KEY, config.dbType);
    if (config.dbType === 'mysql' && config.mysqlConfig) {
      localStorage.setItem(MYSQL_CONFIG_KEY, JSON.stringify(config.mysqlConfig));
    }
    if (config.dbType === 'firebase' && config.firebaseConfig) {
      localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config.firebaseConfig));
    }
    throw error; // Re-throw so caller knows it failed
  }
};

// Synchronous version for backward compatibility (uses localStorage)
export const loadConfigSync = (): AppConfig => {
  const dbType = localStorage.getItem(DB_SELECTION_KEY) as DbType | null;
  const mysqlConfigStr = localStorage.getItem(MYSQL_CONFIG_KEY);
  const firebaseConfigStr = localStorage.getItem(FIREBASE_CONFIG_KEY);

  const mysqlConfig = mysqlConfigStr ? JSON.parse(mysqlConfigStr) : {};
  const firebaseConfig = firebaseConfigStr ? JSON.parse(firebaseConfigStr) : {};

  return {
    dbType: dbType || 'firebase',
    mysqlConfig: mysqlConfig,
    firebaseConfig: firebaseConfig
  };
};
