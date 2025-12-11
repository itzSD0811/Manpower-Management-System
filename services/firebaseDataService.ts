import { SectionEntity, GroupEntity, EmployeeEntity, FirebaseConfig, AttendanceRecordEntity, PrepaymentEntity } from '../types';
import { db, firebaseConfig } from './firebaseConfig';
import { collection, getDocs, doc, setDoc, deleteDoc, QuerySnapshot, DocumentData, query, where, getDoc } from 'firebase/firestore';

const STORAGE_KEYS = {
  SECTIONS: 'dns_sections',
  GROUPS: 'dns_groups',
  EMPLOYEES: 'dns_employees'
};

// Robust UUID generator
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- Helper: Get ID or Generate ---
// This prevents "Invalid document reference" errors by ensuring we never use an empty string as an ID
const getId = (item: any): string => {
  if (item && item.id && typeof item.id === 'string' && item.id.trim() !== '') {
    return item.id;
  }
  return generateId();
};

// --- Timeout Helper ---
// Prevents the app from hanging indefinitely if Firebase is blocked or offline
const timeoutPromise = <T>(promise: Promise<T>, ms: number = 10000, operationName: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out. Check your internet connection or Firestore Security Rules.`));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};



// --- Helper Functions for Local Storage (Read-Only Fallback) ---
const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// --- Diagnostic Tool ---
export const checkDatabaseConnection = async (): Promise<{success: boolean, message: string}> => {
  if (!db) return { success: false, message: "Firebase App not initialized" };
  
  const testId = 'connection_test_' + Date.now();
  try {
    // Attempt to write to a special health check document
    await timeoutPromise(
      setDoc(doc(db, '_health', testId), { 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      }), 
      5000, 
      "Health Check Write"
    );
    
    // Attempt to delete it immediately
    await timeoutPromise(
      deleteDoc(doc(db, '_health', testId)),
      5000,
      "Health Check Cleanup"
    );

    return { success: true, message: "Read/Write operations successful." };
  } catch (error: any) {
    console.error("Connection Check Failed:", error);
    
    let msg = error.message;
    if (error.code === 'permission-denied') {
      msg = "Permission Denied. Your Firestore Security Rules are blocking writes. Please set rules to 'allow read, write: if true;' for testing.";
    } else if (error.code === 'unavailable' || error.message.includes('timed out')) {
      msg = "Network Unavailable. Check your internet connection or Firewall.";
    }
    
    return { success: false, message: msg };
  }
};

// --- Sections ---
export const getSections = async (): Promise<SectionEntity[]> => {
  if (db) {
    try {
      const snapshot = await timeoutPromise(getDocs(collection(db, 'sections')), 10000, "Get Sections") as QuerySnapshot<DocumentData>;
      // Map doc.id ensuring the ID is always present even if missing in data payload
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SectionEntity));
    } catch (error) {
      console.error("Firebase read error (Sections):", error);
      return getLocal<SectionEntity>(STORAGE_KEYS.SECTIONS);
    }
  }
  return getLocal<SectionEntity>(STORAGE_KEYS.SECTIONS);
};

export const saveSection = async (item: Omit<SectionEntity, 'id'> | SectionEntity): Promise<SectionEntity> => {
  if (!db) throw new Error("Database not connected");

  const id = getId(item);
  const newItem = { ...item, id } as SectionEntity;
  
  try {
    await timeoutPromise(setDoc(doc(db, 'sections', id), newItem), 10000, "Save Section");
    console.log(`Firebase: Saved Section ${id}`);
    return newItem;
  } catch (error) {
    console.error("Firebase write error (Sections):", error);
    throw error;
  }
};

export const deleteSection = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not connected");
  if (!id) throw new Error("Invalid ID for deletion");
  
  try {
    await timeoutPromise(deleteDoc(doc(db, 'sections', id)), 10000, "Delete Section");
    console.log(`Firebase: Deleted Section ${id}`);
  } catch (error) {
    console.error("Firebase delete error (Sections):", error);
    throw error;
  }
};

// --- Groups ---
export const getGroups = async (): Promise<GroupEntity[]> => {
  let groupsData: GroupEntity[] = [];

  if (db) {
    try {
      const snapshot = await timeoutPromise(getDocs(collection(db, 'groups')), 10000, "Get Groups") as QuerySnapshot<DocumentData>;
      groupsData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as GroupEntity));
    } catch (error) {
      console.error("Firebase read error (Groups):", error);
      groupsData = getLocal<GroupEntity>(STORAGE_KEYS.GROUPS);
    }
  } else {
    groupsData = getLocal<GroupEntity>(STORAGE_KEYS.GROUPS);
  }

  // Data Migration Helper: Convert old format to new format in memory
  return groupsData.map(g => {
    const updated: any = { ...g };
    
    if (!g.salaryHistory || g.salaryHistory.length === 0) {
        if (g.basicSalary && g.salaryDate) {
            updated.salaryHistory = [{ month: g.salaryDate, amount: Number(g.basicSalary) }];
        } else {
            updated.salaryHistory = []; // Ensure salaryHistory is always an array
    }
    }
    
    // Ensure otPaymentHistory is always an array
    if (!g.otPaymentHistory) {
        updated.otPaymentHistory = [];
    }
    
    return updated;
  });
};

export const saveGroup = async (item: Omit<GroupEntity, 'id'> | GroupEntity): Promise<GroupEntity> => {
  if (!db) throw new Error("Database not connected");

  const id = getId(item);
  const newItem = { ...item, id } as GroupEntity;
  
  try {
    await timeoutPromise(setDoc(doc(db, 'groups', id), newItem), 10000, "Save Group");
    console.log(`Firebase: Saved Group ${id}`);
    return newItem;
  } catch (error) {
    console.error("Firebase write error (Groups):", error);
    throw error;
  }
};

export const deleteGroup = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not connected");
  if (!id) throw new Error("Invalid ID for deletion");
  
  try {
    await timeoutPromise(deleteDoc(doc(db, 'groups', id)), 10000, "Delete Group");
    console.log(`Firebase: Deleted Group ${id}`);
  } catch (error) {
    console.error("Firebase delete error (Groups):", error);
    throw error;
  }
};

// --- Employees ---
export const getEmployees = async (): Promise<EmployeeEntity[]> => {
  if (db) {
    try {
      const snapshot = await timeoutPromise(getDocs(collection(db, 'employees')), 10000, "Get Employees") as QuerySnapshot<DocumentData>;
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeEntity));
    } catch (error) {
      console.error("Firebase read error (Employees):", error);
      return getLocal<EmployeeEntity>(STORAGE_KEYS.EMPLOYEES);
    }
  }
  return getLocal<EmployeeEntity>(STORAGE_KEYS.EMPLOYEES);
};

export const getEmployeesBySection = async (sectionId: string): Promise<EmployeeEntity[]> => {
  if (!db) {
    const allEmployees = getLocal<EmployeeEntity>(STORAGE_KEYS.EMPLOYEES);
    return allEmployees.filter(emp => emp.sectionId === sectionId);
  }
  
  try {
    const q = query(collection(db, 'employees'), where('sectionId', '==', sectionId));
    const snapshot = await timeoutPromise(getDocs(q), 10000, "Get Employees by Section") as QuerySnapshot<DocumentData>;
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeEntity));
  } catch (error) {
    console.error("Firebase read error (Employees by Section):", error);
    const allEmployees = getLocal<EmployeeEntity>(STORAGE_KEYS.EMPLOYEES);
    return allEmployees.filter(emp => emp.sectionId === sectionId);
  }
};

export const saveEmployee = async (item: Omit<EmployeeEntity, 'id'> | EmployeeEntity): Promise<EmployeeEntity> => {
  if (!db) throw new Error("Database not connected");

  const id = getId(item);
  const newItem = { ...item, id } as EmployeeEntity;
  
  try {
    await timeoutPromise(setDoc(doc(db, 'employees', id), newItem), 10000, "Save Employee");
    console.log(`Firebase: Saved Employee ${id}`);
    return newItem;
  } catch (error) {
    console.error("Firebase write error (Employees):", error);
    throw error;
  }
};

export const deleteEmployee = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not connected");
  if (!id) throw new Error("Invalid ID for deletion");
  
  try {
    await timeoutPromise(deleteDoc(doc(db, 'employees', id)), 10000, "Delete Employee");
    console.log(`Firebase: Deleted Employee ${id}`);
  } catch (error) {
    console.error("Firebase delete error (Employees):", error);
    throw error;
  }
};

// --- Configuration ---
export const getFirebaseConfig = (): FirebaseConfig => {
  return firebaseConfig;
};

// --- Validation Helpers ---
export const validateCodeId = (code: string): boolean => {
  // Lowercase letters, numbers, and underscores
  return /^[a-z0-9_]+$/.test(code);
};

// --- Attendance Records ---
export const saveAttendanceRecord = async (record: AttendanceRecordEntity): Promise<AttendanceRecordEntity> => {
  if (!db) throw new Error("Database not connected");

  const id = record.id; // Using the predefined ID
  
  try {
    await timeoutPromise(setDoc(doc(db, 'attendanceRecords', id), record), 10000, "Save Attendance Record");
    console.log(`Firebase: Saved Attendance Record ${id}`);
    return record;
  } catch (error) {
    console.error("Firebase write error (Attendance Records):", error);
    throw error;
  }
};

export const getAttendanceRecords = async (): Promise<AttendanceRecordEntity[]> => {

  if (db) {

    try {

      const snapshot = await timeoutPromise(getDocs(collection(db, 'attendanceRecords')), 10000, "Get Attendance Records") as QuerySnapshot<DocumentData>;

      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecordEntity));

    } catch (error) {

      console.error("Firebase read error (Attendance Records):", error);

      return []; // No local storage fallback for this yet

    }

  }

  return [];

};

export const getAttendanceRecord = async (id: string): Promise<AttendanceRecordEntity | null> => {
  if (!db) {
    console.error("Database not connected");
    return null;
  }
  if (!id) {
    console.error("Invalid ID for getAttendanceRecord");
    return null;
  }

  try {
    const docRef = doc(db, 'attendanceRecords', id);
    const docSnap = await timeoutPromise(getDoc(docRef), 10000, "Get Attendance Record");
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as AttendanceRecordEntity;
    } else {
      console.log(`Firebase: No Attendance Record found with ID ${id}`);
      return null;
    }
  } catch (error) {
    console.error("Firebase read error (Attendance Record):", error);
    return null;
  }
};



export const deleteAttendanceRecord = async (id: string): Promise<void> => {

  if (!db) throw new Error("Database not connected");

  if (!id) throw new Error("Invalid ID for deletion");



  try {

    await timeoutPromise(deleteDoc(doc(db, 'attendanceRecords', id)), 10000, "Delete Attendance Record");

    console.log(`Firebase: Deleted Attendance Record ${id}`);

  } catch (error) {

    console.error("Firebase delete error (Attendance Records):", error);

    throw error;

  }

};

// --- Prepayments ---
export const getPrepayments = async (): Promise<PrepaymentEntity[]> => {
  if (db) {
    try {
      const snapshot = await timeoutPromise(getDocs(collection(db, 'prepayments')), 10000, "Get Prepayments") as QuerySnapshot<DocumentData>;
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as PrepaymentEntity));
    } catch (error) {
      console.error("Firebase read error (Prepayments):", error);
      return [];
    }
  }
  return [];
};

export const savePrepayment = async (item: Omit<PrepaymentEntity, 'id'> | PrepaymentEntity): Promise<PrepaymentEntity> => {
  if (!db) throw new Error("Database not connected");

  const id = getId(item);
  // Only set createdAt for Firebase (MySQL handles it automatically)
  const newItem = { ...item, id, createdAt: item.createdAt || new Date().toISOString() } as PrepaymentEntity;
  
  try {
    await timeoutPromise(setDoc(doc(db, 'prepayments', id), newItem), 10000, "Save Prepayment");
    console.log(`Firebase: Saved Prepayment ${id}`);
    return newItem;
  } catch (error) {
    console.error("Firebase write error (Prepayments):", error);
    throw error;
  }
};

export const deletePrepayment = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not connected");
  if (!id) throw new Error("Invalid ID for deletion");
  
  try {
    await timeoutPromise(deleteDoc(doc(db, 'prepayments', id)), 10000, "Delete Prepayment");
    console.log(`Firebase: Deleted Prepayment ${id}`);
  } catch (error) {
    console.error("Firebase delete error (Prepayments):", error);
    throw error;
  }
};
