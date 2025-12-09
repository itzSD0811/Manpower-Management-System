import { loadConfig } from './configService';
import * as firebase from './firebaseDataService';
import * as mysql from './mysqlDataService';

const { dbType } = loadConfig();

const db = dbType === 'mysql' ? mysql : firebase;

export default db;
