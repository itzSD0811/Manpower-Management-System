import { AppUser, RoleEntity, PermissionLevel } from '../types';
import { getUserById, getRoleById } from './userManagementService';
import { loadConfigSync } from './configService';
import { auth } from './firebaseConfig';

// Available pages in the application
export const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'employees', name: 'Employees' },
  { id: 'attendance', name: 'Attendance' },
  { id: 'prepayments', name: 'Prepayments' },
  { id: 'sections', name: 'Sections' },
  { id: 'groups', name: 'Groups' },
  { id: 'files', name: 'Generate Files' },
  { id: 'settings', name: 'System Configuration' },
  { id: 'profile', name: 'Profile' },
] as const;

export type PageId = typeof AVAILABLE_PAGES[number]['id'];

// Check if user is administrator (by email)
const isAdministrator = (userEmail: string | null | undefined): boolean => {
  if (!userEmail) return false;
  const config = loadConfigSync();
  return config.administratorEmail?.toLowerCase().trim() === userEmail.toLowerCase().trim();
};

// Check if user has master permissions (administrator email or role with master permissions)
export const hasMasterPermissions = async (userId: string): Promise<boolean> => {
  try {
    const user = await getUserById(userId);
    let userEmail = user?.email;

    // If user not found in database, try to get email from Firebase Auth
    if (!userEmail && auth?.currentUser) {
      userEmail = auth.currentUser.email || null;
    }

    // Check if user is administrator
    if (userEmail && isAdministrator(userEmail)) {
      return true;
    }

    if (!user || !user.isActive) {
      return false;
    }

    // Check if user has a role
    if (!user.roleId) {
      return false;
    }

    // Check if user's role has master permissions
    const role = await getRoleById(user.roleId);
    return role?.hasMasterPermissions === true;
  } catch (error) {
    console.error("Error checking master permissions:", error);
    return false;
  }
};

// Get user permissions for a specific page
export const getUserPagePermission = async (userId: string, pageId: PageId): Promise<PermissionLevel> => {
  try {
    const user = await getUserById(userId);
    let userEmail = user?.email;

    // If user not found in database, try to get email from Firebase Auth
    if (!userEmail && auth?.currentUser) {
      userEmail = auth.currentUser.email || null;
    }

    // Check if user is administrator (by email) or has master permissions
    if (userEmail && isAdministrator(userEmail)) {
      return 'edit'; // Full access for administrator
    }

    if (!user || !user.isActive) {
      return 'none';
    }

    // Check if user has a role
    if (!user.roleId) {
      // Users without a role have no access, including profile
      return 'none';
    }

    const role = await getRoleById(user.roleId);
    if (!role) {
      // If role doesn't exist, user has no access
      return 'none';
    }

    // Check for master permissions - grants access to settings, users, and roles management
    if (role.hasMasterPermissions) {
      if (pageId === 'settings' || pageId === 'users' || pageId === 'roles') {
        return 'edit';
      }
    }

    const pagePermission = role.permissions.find(p => p.pageId === pageId);
    return pagePermission?.permission || 'none';
  } catch (error) {
    console.error("Error getting user permission:", error);
    // On error, no access
    return 'none';
  }
};

// Check if user can view a page
export const canUserViewPage = async (userId: string, pageId: PageId): Promise<boolean> => {
  const permission = await getUserPagePermission(userId, pageId);
  return permission === 'view' || permission === 'edit';
};

// Check if user can edit a page
export const canUserEditPage = async (userId: string, pageId: PageId): Promise<boolean> => {
  const permission = await getUserPagePermission(userId, pageId);
  return permission === 'edit';
};

// Get all permissions for a user
export const getUserPermissions = async (userId: string): Promise<Record<PageId, PermissionLevel>> => {
  try {
    const user = await getUserById(userId);
    let userEmail = user?.email;

    // If user not found in database, try to get email from Firebase Auth
    if (!userEmail && auth?.currentUser) {
      userEmail = auth.currentUser.email || null;
    }

    // Check if user is administrator (by email)
    if (userEmail && isAdministrator(userEmail)) {
      // Return full edit access for all pages
      const permissions: Record<string, PermissionLevel> = {};
      AVAILABLE_PAGES.forEach(page => {
        permissions[page.id] = 'edit';
      });
      return permissions as Record<PageId, PermissionLevel>;
    }

    const permissions: Record<string, PermissionLevel> = {};

    if (!user || !user.isActive) {
      // Inactive users have no access
      AVAILABLE_PAGES.forEach(page => {
        permissions[page.id] = 'none';
      });
      return permissions as Record<PageId, PermissionLevel>;
    }

    // Check if user has a role
    if (!user.roleId) {
      // Users without a role have no access, including profile
      AVAILABLE_PAGES.forEach(page => {
        permissions[page.id] = 'none';
      });
      return permissions as Record<PageId, PermissionLevel>;
    }

    const role = await getRoleById(user.roleId);
    if (!role) {
      // If role doesn't exist, user has no access
      AVAILABLE_PAGES.forEach(page => {
        permissions[page.id] = 'none';
      });
      return permissions as Record<PageId, PermissionLevel>;
    }

    AVAILABLE_PAGES.forEach(page => {
      if (role.hasMasterPermissions && (page.id === 'settings' || page.id === 'users' || page.id === 'roles')) {
        // Master permissions grant access to settings, users, and roles
        permissions[page.id] = 'edit';
      } else {
        const pagePermission = role.permissions.find(p => p.pageId === page.id);
        permissions[page.id] = pagePermission?.permission || 'none';
      }
    });

    return permissions as Record<PageId, PermissionLevel>;
  } catch (error) {
    console.error("Error getting user permissions:", error);
    // On error, no access
    const permissions: Record<string, PermissionLevel> = {};
    AVAILABLE_PAGES.forEach(page => {
      permissions[page.id] = 'none';
    });
    return permissions as Record<PageId, PermissionLevel>;
  }
};


