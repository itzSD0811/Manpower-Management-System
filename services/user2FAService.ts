import { API_URL } from '../utils/apiConfig';

// Generate backup codes for a user (8 codes, each 8 characters)
const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters like 0, O, I, 1
  
  for (let i = 0; i < 8; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(code);
  }
  
  return codes;
};

// Generate 2FA secret for a user (via backend, then save to Firestore)
export const generateUser2FASecret = async (userId: string, email: string): Promise<{ secret: string; qrCode: string; manualEntryKey: string }> => {
  const response = await fetch(`${API_URL}/2fa/generate-secret`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, email }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate 2FA secret');
  }
  
  const result = await response.json();
  
  // Save secret to Firestore (but not enabled yet)
  const { db } = await import('./firebaseConfig');
  const { doc, setDoc, Timestamp } = await import('firebase/firestore');
  
  if (db) {
    await setDoc(doc(db, 'user2fa', userId), {
      userId,
      secret: result.secret,
      enabled: false,
      createdAt: Timestamp.fromDate(new Date()),
    }, { merge: true });
  }
  
  return result;
};

// Get 2FA status for a user (from Firestore)
export const getUser2FAStatus = async (userId: string): Promise<{ enabled: boolean }> => {
  const { db } = await import('./firebaseConfig');
  const { doc, getDoc } = await import('firebase/firestore');
  
  if (!db) {
    console.error("Firebase Firestore is not configured");
    throw new Error("Firebase Firestore is not configured");
  }

  try {
    console.log('Getting 2FA status from Firestore for user:', userId);
    const docRef = doc(db, 'user2fa', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('2FA document does not exist for user:', userId);
      return { enabled: false };
    }

    const data = docSnap.data();
    console.log('2FA document data:', data);
    const enabled = data.enabled === true;
    console.log('2FA enabled status:', enabled);
    return { enabled };
  } catch (error: any) {
    console.error("Error getting 2FA status:", error);
    // Re-throw the error so the caller can handle it
    throw error;
  }
};

// Enable 2FA for a user (verify token first)
export const enableUser2FA = async (userId: string, secret: string, token: string): Promise<{ success: boolean; message: string }> => {
  // First verify the token via backend
  const verifyResponse = await fetch(`${API_URL}/2fa/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, secret, token }),
  });
  
  const verifyResult = await verifyResponse.json();
  if (!verifyResponse.ok) {
    throw new Error(verifyResult.message || 'Failed to enable 2FA');
  }

  // If verification successful, save to Firestore
  const { db } = await import('./firebaseConfig');
  const { doc, setDoc, Timestamp } = await import('firebase/firestore');
  
  if (!db) throw new Error("Firebase Firestore is not configured");

  // Generate backup codes when enabling 2FA
  const backupCodes = generateBackupCodes();

  await setDoc(doc(db, 'user2fa', userId), {
    userId,
    secret,
    enabled: true,
    createdAt: Timestamp.fromDate(new Date()),
    enabledAt: Timestamp.fromDate(new Date()),
    backupCodes: backupCodes,
    backupCodesGeneratedAt: Timestamp.fromDate(new Date()),
  }, { merge: true });

  return verifyResult;
};

// Verify 2FA token for a user
export const verifyUser2FA = async (userId: string, token: string): Promise<{ success: boolean; message: string }> => {
  // Get secret from Firestore first
  const { db } = await import('./firebaseConfig');
  const { doc, getDoc } = await import('firebase/firestore');
  
  if (!db) throw new Error("Firebase Firestore is not configured");

  const docRef = doc(db, 'user2fa', userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return { success: false, message: '2FA is not enabled for this user' };
  }

  const data = docSnap.data();
  const secret = data.secret;
  const enabled = data.enabled === true;

  if (!enabled) {
    return { success: false, message: '2FA is not enabled for this user' };
  }

  // Verify via backend
  const response = await fetch(`${API_URL}/2fa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, token, secret }),
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Invalid verification code');
  }
  
  return result;
};

// Disable 2FA for a user (verify token first)
export const disableUser2FA = async (userId: string, token: string): Promise<{ success: boolean; message: string }> => {
  // Get secret from Firestore first
  const { db } = await import('./firebaseConfig');
  const { doc, getDoc, updateDoc, Timestamp } = await import('firebase/firestore');
  
  if (!db) throw new Error("Firebase Firestore is not configured");

  const docRef = doc(db, 'user2fa', userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return { success: false, message: '2FA is not enabled for this user' };
  }

  const data = docSnap.data();
  const secret = data.secret;
  const enabled = data.enabled === true;

  if (!enabled) {
    return { success: false, message: '2FA is not enabled for this user' };
  }

  // Verify via backend
  const response = await fetch(`${API_URL}/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, token, secret }),
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to disable 2FA');
  }

  // If verification successful, update Firestore
  await updateDoc(doc(db, 'user2fa', userId), {
    enabled: false,
    disabledAt: Timestamp.fromDate(new Date()),
  });
  
  return result;
};

// Get backup codes for a user (from Firestore)
export const getUserBackupCodes = async (userId: string): Promise<string[] | null> => {
  const { db } = await import('./firebaseConfig');
  const { doc, getDoc } = await import('firebase/firestore');
  
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const docRef = doc(db, 'user2fa', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return data.backupCodes || null;
  } catch (error: any) {
    console.error("Error getting backup codes:", error);
    return null;
  }
};

// Generate and save new backup codes for a user (requires 2FA verification)
export const regenerateUserBackupCodes = async (userId: string, verificationToken: string): Promise<string[]> => {
  // First verify the token
  const verifyResult = await verifyUser2FA(userId, verificationToken);
  if (!verifyResult.success) {
    throw new Error(verifyResult.message || 'Invalid verification code');
  }

  // Generate new backup codes
  const newBackupCodes = generateBackupCodes();

  // Save to Firestore
  const { db } = await import('./firebaseConfig');
  const { doc, setDoc, Timestamp, getDoc } = await import('firebase/firestore');
  
  if (!db) throw new Error("Firebase Firestore is not configured");

  // Get existing data first
  const docRef = doc(db, 'user2fa', userId);
  const docSnap = await getDoc(docRef);
  const existingData = docSnap.exists() ? docSnap.data() : {};

  await setDoc(doc(db, 'user2fa', userId), {
    ...existingData,
    backupCodes: newBackupCodes,
    backupCodesGeneratedAt: Timestamp.fromDate(new Date()),
  }, { merge: true });

  return newBackupCodes;
};

// Verify backup code for a user (removes the code after successful verification)
export const verifyUserBackupCode = async (userId: string, backupCode: string): Promise<{ success: boolean; message: string }> => {
  const { db } = await import('./firebaseConfig');
  const { doc, getDoc, updateDoc } = await import('firebase/firestore');
  
  if (!db) throw new Error("Firebase Firestore is not configured");

  const docRef = doc(db, 'user2fa', userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return { success: false, message: '2FA is not enabled for this user' };
  }

  const data = docSnap.data();
  const enabled = data.enabled === true;
  const backupCodes: string[] = data.backupCodes || [];

  if (!enabled) {
    return { success: false, message: '2FA is not enabled for this user' };
  }

  // Normalize backup code (uppercase, remove spaces)
  const normalizedCode = backupCode.trim().toUpperCase();

  // Check if backup code exists
  const codeIndex = backupCodes.findIndex(code => code.toUpperCase() === normalizedCode);
  
  if (codeIndex === -1) {
    return { success: false, message: 'Invalid backup code' };
  }

  // Remove the used backup code
  const updatedBackupCodes = backupCodes.filter((_, index) => index !== codeIndex);
  
  await updateDoc(docRef, {
    backupCodes: updatedBackupCodes,
  });

  return { success: true, message: 'Backup code verified successfully' };
};

