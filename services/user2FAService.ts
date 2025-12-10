const API_URL = 'http://localhost:3001/api';

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
  
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const docRef = doc(db, 'user2fa', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { enabled: false };
    }

    const data = docSnap.data();
    return { enabled: data.enabled === true };
  } catch (error: any) {
    console.error("Error getting 2FA status:", error);
    return { enabled: false };
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

  await setDoc(doc(db, 'user2fa', userId), {
    userId,
    secret,
    enabled: true,
    createdAt: Timestamp.fromDate(new Date()),
    enabledAt: Timestamp.fromDate(new Date()),
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

