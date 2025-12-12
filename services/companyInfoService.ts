import { CompanyInfo } from '../types';
import { db } from './firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const COMPANY_INFO_ID = 'company_info';
const COMPANY_INFO_COLLECTION = 'companyInfo';

// Get company information from Firebase
export const getCompanyInfo = async (): Promise<CompanyInfo | null> => {
  if (!db) {
    console.warn('Firebase not initialized, returning null company info');
    return null;
  }

  try {
    const docRef = doc(db, COMPANY_INFO_COLLECTION, COMPANY_INFO_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: COMPANY_INFO_ID, ...docSnap.data() } as CompanyInfo;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching company info:', error);
    throw error;
  }
};

// Save company information to Firebase
export const saveCompanyInfo = async (companyInfo: Omit<CompanyInfo, 'id' | 'updatedAt'>): Promise<CompanyInfo> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = doc(db, COMPANY_INFO_COLLECTION, COMPANY_INFO_ID);
    const dataToSave: CompanyInfo = {
      id: COMPANY_INFO_ID,
      ...companyInfo,
      updatedAt: new Date().toISOString(),
    };
    
    await setDoc(docRef, dataToSave, { merge: false });
    console.log('Company info saved successfully');
    return dataToSave;
  } catch (error) {
    console.error('Error saving company info:', error);
    throw error;
  }
};

// Get company name (helper function for easy access)
export const getCompanyName = async (): Promise<string> => {
  const companyInfo = await getCompanyInfo();
  return companyInfo?.companyName || 'DNS MANPOWER SUPPLIERS'; // Fallback to default
};

