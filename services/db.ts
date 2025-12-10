import { loadConfigSync } from './configService';
import * as firebase from './firebaseDataService';
import * as mysql from './mysqlDataService';

// Get the current database based on config
const getDb = () => {
  const { dbType } = loadConfigSync();
  return dbType === 'mysql' ? mysql : firebase;
};

// Export a proxy object that dynamically selects the database
const db = new Proxy({} as typeof mysql, {
  get: (target, prop) => {
    const currentDb = getDb();
    return (currentDb as any)[prop];
  }
});

export default db;
