import { createUserWithEmailAndPassword, User, updateProfile, signOut, deleteUser } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { AppUser, RoleEntity } from '../types';
import { API_URL } from '../utils/apiConfig';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Create a new user in Firebase Auth and Firestore
export const createUser = async (email: string, password: string, displayName?: string, roleId?: string): Promise<AppUser> => {
  if (!auth) throw new Error("Firebase Auth is not configured");
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update display name if provided
    if (displayName) {
      await updateProfile(firebaseUser, { displayName });
    }

    // Create user document in Firestore
    const appUser: AppUser = {
      id: firebaseUser.uid,
      email: email,
      displayName: displayName || undefined,
      roleId: roleId || undefined, // No role assigned if not provided
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...appUser,
      createdAt: Timestamp.fromDate(new Date()),
    });

    // Sign out the newly created user to prevent auto-login
    // Only sign out if the newly created user is the current user
    if (auth.currentUser && auth.currentUser.uid === firebaseUser.uid) {
      await signOut(auth);
    }
    
    return appUser;
  } catch (error: any) {
    console.error("Error creating user:", error);
    throw new Error(error.message || "Failed to create user");
  }
};

// Get all users
export const getUsers = async (): Promise<AppUser[]> => {
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as AppUser;
    });
  } catch (error: any) {
    console.error("Error getting users:", error);
    throw new Error(error.message || "Failed to get users");
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<AppUser | null> => {
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as AppUser;
  } catch (error: any) {
    console.error("Error getting user:", error);
    throw new Error(error.message || "Failed to get user");
  }
};

// Update user
export const updateUser = async (userId: string, updates: Partial<AppUser>): Promise<void> => {
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };
    
    // Remove id from updates (it's the document ID)
    delete updateData.id;
    
    await updateDoc(userRef, updateData);
  } catch (error: any) {
    console.error("Error updating user:", error);
    throw new Error(error.message || "Failed to update user");
  }
};

// Lock/Unlock user account (toggle isActive)
export const toggleUserLock = async (userId: string): Promise<void> => {
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    await updateUser(userId, { isActive: !user.isActive });
  } catch (error: any) {
    console.error("Error toggling user lock:", error);
    throw new Error(error.message || "Failed to toggle user lock");
  }
};

// Delete user account (from both Firestore and Firebase Auth)
export const deleteUserAccount = async (userId: string): Promise<void> => {
  if (!db) throw new Error("Firebase Firestore is not configured");
  if (!auth) throw new Error("Firebase Auth is not configured");

  try {
    // Delete from Firebase Auth via backend API (requires Admin SDK)
    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        // If Admin SDK is not configured, log warning but continue with Firestore deletion
        if (errorData.message?.includes('not initialized')) {
          console.warn('Firebase Admin SDK not configured. User will be deleted from Firestore but may still exist in Firebase Auth.');
        } else {
          throw new Error(errorData.message || 'Failed to delete user from Firebase Auth');
        }
      }
    } catch (error: any) {
      // If backend is not available or Admin SDK not configured, log warning but continue
      console.warn('Could not delete user from Firebase Auth:', error.message);
      console.warn('User will be deleted from Firestore but may still exist in Firebase Auth.');
    }

    // Delete from Firestore
    await deleteDoc(doc(db, 'users', userId));
    
    // Also delete user's 2FA data if exists
    try {
      await deleteDoc(doc(db, 'user2fa', userId));
    } catch (error) {
      // Ignore if 2FA data doesn't exist
      console.warn("No 2FA data to delete for user:", userId);
    }
  } catch (error: any) {
    console.error("Error deleting user:", error);
    throw new Error(error.message || "Failed to delete user");
  }
};

// Roles Management
export const getRoles = async (): Promise<RoleEntity[]> => {
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const snapshot = await getDocs(collection(db, 'roles'));
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as RoleEntity;
    });
  } catch (error: any) {
    console.error("Error getting roles:", error);
    throw new Error(error.message || "Failed to get roles");
  }
};

export const getRoleById = async (roleId: string): Promise<RoleEntity | null> => {
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const docRef = doc(db, 'roles', roleId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as RoleEntity;
  } catch (error: any) {
    console.error("Error getting role:", error);
    throw new Error(error.message || "Failed to get role");
  }
};

export const createRole = async (role: Omit<RoleEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoleEntity> => {
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const id = generateId();
    const newRole: RoleEntity = {
      ...role,
      id,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'roles', id), {
      ...newRole,
      createdAt: Timestamp.fromDate(new Date()),
    });

    return newRole;
  } catch (error: any) {
    console.error("Error creating role:", error);
    throw new Error(error.message || "Failed to create role");
  }
};

export const updateRole = async (roleId: string, updates: Partial<RoleEntity>): Promise<void> => {
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    const roleRef = doc(db, 'roles', roleId);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };
    
    // Remove id from updates
    delete updateData.id;
    delete updateData.createdAt;
    
    await updateDoc(roleRef, updateData);
  } catch (error: any) {
    console.error("Error updating role:", error);
    throw new Error(error.message || "Failed to update role");
  }
};

export const deleteRole = async (roleId: string): Promise<void> => {
  if (!db) throw new Error("Firebase Firestore is not configured");

  try {
    // Check if any users are using this role
    const users = await getUsers();
    const usersWithRole = users.filter(u => u.roleId === roleId);
    
    if (usersWithRole.length > 0) {
      throw new Error(`Cannot delete role: ${usersWithRole.length} user(s) are assigned to this role`);
    }

    // Delete the role document
    await deleteDoc(doc(db, 'roles', roleId));
  } catch (error: any) {
    console.error("Error deleting role:", error);
    throw new Error(error.message || "Failed to delete role");
  }
};


