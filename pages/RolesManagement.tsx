import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Save, X, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { RoleEntity, PagePermission, PermissionLevel } from '../types';
import { getRoles, createRole, updateRole, deleteRole } from '../services/userManagementService';
import { AVAILABLE_PAGES } from '../services/permissionService';

const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRoleModalOpen, setAddRoleModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [deleteRoleModalOpen, setDeleteRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleEntity | null>(null);

  // Add Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<Record<string, PermissionLevel>>({});
  const [newRoleHasMasterPermissions, setNewRoleHasMasterPermissions] = useState(false);

  // Edit Role Form State
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDescription, setEditRoleDescription] = useState('');
  const [editRolePermissions, setEditRolePermissions] = useState<Record<string, PermissionLevel>>({});
  const [editRoleHasMasterPermissions, setEditRoleHasMasterPermissions] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const rolesData = await getRoles();
      setRoles(rolesData);
    } catch (error: any) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      setRoleError('Role name is required');
      return;
    }

    setRoleLoading(true);
    setRoleError('');

    try {
      const permissions: PagePermission[] = Object.entries(newRolePermissions)
        .filter(([_, level]) => level !== 'none')
        .map(([pageId, permission]) => ({ pageId, permission }));

      await createRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || undefined,
        permissions,
      });

      setAddRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRolePermissions({});
      setNewRoleHasMasterPermissions(false);
      await loadRoles();
    } catch (error: any) {
      setRoleError(error.message || 'Failed to create role');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleEditRole = (role: RoleEntity) => {
    setSelectedRole(role);
    setEditRoleName(role.name);
    setEditRoleDescription(role.description || '');
    setEditRoleHasMasterPermissions(role.hasMasterPermissions || false);
    
    // Initialize permissions map
    const permissionsMap: Record<string, PermissionLevel> = {};
    AVAILABLE_PAGES.forEach(page => {
      const perm = role.permissions.find(p => p.pageId === page.id);
      permissionsMap[page.id] = perm?.permission || 'none';
    });
    setEditRolePermissions(permissionsMap);
    setRoleError('');
    setEditRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedRole || !editRoleName.trim()) {
      setRoleError('Role name is required');
      return;
    }

    setRoleLoading(true);
    setRoleError('');

    try {
      const permissions: PagePermission[] = Object.entries(editRolePermissions)
        .filter(([_, level]) => level !== 'none')
        .map(([pageId, permission]) => ({ pageId, permission }));

      await updateRole(selectedRole.id, {
        name: editRoleName.trim(),
        description: editRoleDescription.trim() || undefined,
        permissions,
        hasMasterPermissions: editRoleHasMasterPermissions,
      });

      setEditRoleModalOpen(false);
      setSelectedRole(null);
      await loadRoles();
    } catch (error: any) {
      setRoleError(error.message || 'Failed to update role');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    setRoleLoading(true);
    setRoleError('');

    try {
      await deleteRole(selectedRole.id);
      setDeleteRoleModalOpen(false);
      setSelectedRole(null);
      await loadRoles();
    } catch (error: any) {
      setRoleError(error.message || 'Failed to delete role');
    } finally {
      setRoleLoading(false);
    }
  };

  const togglePermission = (pageId: string, currentLevel: PermissionLevel, isNew: boolean) => {
    const nextLevel: PermissionLevel = 
      currentLevel === 'none' ? 'view' :
      currentLevel === 'view' ? 'edit' : 'none';

    if (isNew) {
      setNewRolePermissions({ ...newRolePermissions, [pageId]: nextLevel });
    } else {
      setEditRolePermissions({ ...editRolePermissions, [pageId]: nextLevel });
    }
  };

  const renderPermissionSelector = (pageId: string, currentLevel: PermissionLevel, isNew: boolean) => {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => togglePermission(pageId, currentLevel, isNew)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            currentLevel === 'none'
              ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              : currentLevel === 'view'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
          }`}
        >
          {currentLevel === 'none' ? 'No Access' : currentLevel === 'view' ? 'View Only' : 'View & Edit'}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dns-red"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create and manage roles with page-level permissions</p>
        </div>
        <Button onClick={() => setAddRoleModalOpen(true)} icon={<Plus size={16} />}>
          Create Role
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No roles found. Click "Create Role" to get started.</p>
          </div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{role.name}</h3>
                    {role.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{role.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit role"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRole(role);
                        setDeleteRoleModalOpen(true);
                        setRoleError('');
                      }}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete role"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {role.hasMasterPermissions && (
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md">
                        Master Permissions
                      </span>
                    </div>
                  )}
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Permissions:</p>
                  {role.permissions.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No permissions assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {role.permissions.map((perm) => {
                        const page = AVAILABLE_PAGES.find(p => p.id === perm.pageId);
                        return (
                          <div key={perm.pageId} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{page?.name || perm.pageId}</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              perm.permission === 'view'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {perm.permission === 'view' ? 'View' : 'Edit'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Role Modal */}
      <Modal
        isOpen={addRoleModalOpen}
        onClose={() => {
          setAddRoleModalOpen(false);
          setNewRoleName('');
          setNewRoleDescription('');
          setNewRolePermissions({});
          setRoleError('');
        }}
        title="Create New Role"
        size="lg"
      >
        <div className="space-y-4">
          {roleError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {roleError}
            </div>
          )}

          <Input
            label="Role Name"
            type="text"
            placeholder="e.g., Manager, Employee, Admin"
            value={newRoleName}
            onChange={(e) => {
              setNewRoleName(e.target.value);
              setRoleError('');
            }}
            required
          />

          <Input
            label="Description (Optional)"
            type="text"
            placeholder="Brief description of this role"
            value={newRoleDescription}
            onChange={(e) => setNewRoleDescription(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Page Permissions
            </label>
            <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {AVAILABLE_PAGES.filter(page => page.id !== 'settings' && page.id !== 'profile').map((page) => (
                <div key={page.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{page.name}</span>
                  {renderPermissionSelector(page.id, newRolePermissions[page.id] || 'none', true)}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Note: System Configuration requires Master Permissions. Profile is always accessible to all users.
            </p>
          </div>

          {/* Master Permissions Option */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="newRoleMasterPermissions"
                checked={newRoleHasMasterPermissions}
                onChange={(e) => setNewRoleHasMasterPermissions(e.target.checked)}
                className="mt-1 h-4 w-4 text-dns-red border-gray-300 rounded focus:ring-dns-red focus:ring-2"
              />
              <div className="flex-1">
                <label htmlFor="newRoleMasterPermissions" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                  Is this role have master permissions?
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  If yes, users with this role can handle all users, roles & system configurations (Firebase, MySQL).
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAddRoleModalOpen(false);
                setNewRoleName('');
                setNewRoleDescription('');
                setNewRolePermissions({});
                setNewRoleHasMasterPermissions(false);
                setRoleError('');
              }}
              disabled={roleLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleAddRole} isLoading={roleLoading} disabled={!newRoleName.trim()}>
              Create Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={editRoleModalOpen}
        onClose={() => {
          setEditRoleModalOpen(false);
          setSelectedRole(null);
          setRoleError('');
        }}
        title="Edit Role"
        size="lg"
      >
        <div className="space-y-4">
          {roleError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {roleError}
            </div>
          )}

          <Input
            label="Role Name"
            type="text"
            value={editRoleName}
            onChange={(e) => {
              setEditRoleName(e.target.value);
              setRoleError('');
            }}
            required
          />

          <Input
            label="Description (Optional)"
            type="text"
            value={editRoleDescription}
            onChange={(e) => setEditRoleDescription(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Page Permissions
            </label>
            <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {AVAILABLE_PAGES.filter(page => page.id !== 'settings' && page.id !== 'profile').map((page) => (
                <div key={page.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{page.name}</span>
                  {renderPermissionSelector(page.id, editRolePermissions[page.id] || 'none', false)}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Note: System Configuration requires Master Permissions. Profile is always accessible to all users.
            </p>
          </div>

          {/* Master Permissions Option */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="editRoleMasterPermissions"
                checked={editRoleHasMasterPermissions}
                onChange={(e) => setEditRoleHasMasterPermissions(e.target.checked)}
                className="mt-1 h-4 w-4 text-dns-red border-gray-300 rounded focus:ring-dns-red focus:ring-2"
              />
              <div className="flex-1">
                <label htmlFor="editRoleMasterPermissions" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                  Is this role have master permissions?
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  If yes, users with this role can handle all users, roles & system configurations (Firebase, MySQL).
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditRoleModalOpen(false);
                setSelectedRole(null);
                setRoleError('');
              }}
              disabled={roleLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRole} isLoading={roleLoading} disabled={!editRoleName.trim()}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Role Confirmation Modal */}
      <Modal
        isOpen={deleteRoleModalOpen}
        onClose={() => {
          setDeleteRoleModalOpen(false);
          setSelectedRole(null);
          setRoleError('');
        }}
        title="Delete Role"
        size="md"
      >
        <div className="space-y-4">
          {roleError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {roleError}
            </div>
          )}

          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete the role <strong>"{selectedRole?.name}"</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. If any users are assigned to this role, the deletion will fail.
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteRoleModalOpen(false);
                setSelectedRole(null);
                setRoleError('');
              }}
              disabled={roleLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteRole}
              isLoading={roleLoading}
              icon={<Trash2 size={16} />}
            >
              Delete Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RolesManagement;


