import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canUserViewPage, canUserEditPage, PermissionLevel, hasMasterPermissions } from '../services/permissionService';
import { PageId } from '../services/permissionService';
import { Shield, AlertTriangle } from 'lucide-react';

interface PermissionGuardProps {
  pageId: PageId;
  requireEdit?: boolean;
  children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ pageId, requireEdit = false, children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('none');

  useEffect(() => {
    const checkPermission = async () => {
      if (!currentUser?.uid) {
        setHasPermission(false);
        return;
      }

      try {
        // Special handling for settings, users, and roles pages - require master permissions
        if (pageId === 'settings' || pageId === 'users' || pageId === 'roles') {
          const hasMaster = await hasMasterPermissions(currentUser.uid);
          if (!hasMaster) {
            setHasPermission(false);
            setPermissionLevel('none');
            return;
          }
          // If has master permissions, grant edit access
          setHasPermission(true);
          setPermissionLevel('edit');
          return;
        }

        if (requireEdit) {
          const canEdit = await canUserEditPage(currentUser.uid, pageId);
          setHasPermission(canEdit);
          setPermissionLevel(canEdit ? 'edit' : 'none');
        } else {
          const canView = await canUserViewPage(currentUser.uid, pageId);
          setHasPermission(canView);
          if (canView) {
            const canEdit = await canUserEditPage(currentUser.uid, pageId);
            setPermissionLevel(canEdit ? 'edit' : 'view');
          } else {
            setPermissionLevel('none');
          }
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      }
    };

    checkPermission();
  }, [currentUser, pageId, requireEdit]);

  if (hasPermission === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dns-red"></div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Shield className="text-red-600 dark:text-red-400" size={32} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-dns-red text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Pass permission level to children via context or props if needed
  return <>{children}</>;
};

export default PermissionGuard;

// Hook to get current user's permission level for a page
export const usePagePermission = (pageId: PageId): PermissionLevel => {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState<PermissionLevel>('none');

  useEffect(() => {
    const checkPermission = async () => {
      if (!currentUser?.uid) {
        setPermission('none');
        return;
      }

      try {
        const { getUserPagePermission } = await import('../services/permissionService');
        const level = await getUserPagePermission(currentUser.uid, pageId);
        setPermission(level);
      } catch (error) {
        console.error('Error getting page permission:', error);
        setPermission('none');
      }
    };

    checkPermission();
  }, [currentUser, pageId]);

  return permission;
};


