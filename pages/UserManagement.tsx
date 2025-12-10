import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit, Trash2, Shield, X, Save, Lock, Unlock } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { AppUser, RoleEntity } from '../types';
import { createUser, getUsers, updateUser, toggleUserLock, deleteUserAccount } from '../services/userManagementService';
import { getRoles } from '../services/userManagementService';
import { useAuth } from '../context/AuthContext';
import { getUserDisplayName } from '../utils/userUtils';

const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Add User Form State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('');
  const [addUserError, setAddUserError] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);

  // Edit User Form State
  const [editUserDisplayName, setEditUserDisplayName] = useState('');
  const [editUserRoleId, setEditUserRoleId] = useState('');
  const [editUserError, setEditUserError] = useState('');
  const [editUserLoading, setEditUserLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        getUsers(),
        getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (error: any) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      setAddUserError('Email and password are required');
      return;
    }

    setAddUserLoading(true);
    setAddUserError('');

    try {
      await createUser(newUserEmail, newUserPassword, newUserDisplayName || undefined, newUserRoleId || undefined);
      setAddUserModalOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserDisplayName('');
      setNewUserRoleId('');
      await loadData();
    } catch (error: any) {
      setAddUserError(error.message || 'Failed to create user');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setEditUserDisplayName(user.displayName || '');
    setEditUserRoleId(user.roleId);
    setEditUserError('');
    setEditUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    setEditUserLoading(true);
    setEditUserError('');

    try {
      await updateUser(selectedUser.id, {
        displayName: editUserDisplayName || undefined,
        roleId: editUserRoleId,
      });
      setEditUserModalOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (error: any) {
      setEditUserError(error.message || 'Failed to update user');
    } finally {
      setEditUserLoading(false);
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'Unknown Role';
  };

  const handleLockUser = async (user: AppUser) => {
    setActionLoading(true);
    setActionError('');
    try {
      await toggleUserLock(user.id);
      await loadData();
    } catch (error: any) {
      setActionError(error.message || 'Failed to toggle user lock');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    setActionError('');
    try {
      await deleteUserAccount(selectedUser.id);
      setDeleteUserModalOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (error: any) {
      setActionError(error.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage users and their roles</p>
        </div>
        <Button onClick={() => setAddUserModalOpen(true)} icon={<UserPlus size={16} />}>
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Display Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No users found. Click "Add User" to create one.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getUserDisplayName(user.email) || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getRoleName(user.roleId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit user"
                          disabled={actionLoading}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleLockUser(user)}
                          className={`${
                            user.isActive
                              ? 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300'
                              : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                          }`}
                          title={user.isActive ? 'Lock account' : 'Unlock account'}
                          disabled={actionLoading}
                        >
                          {user.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteUserModalOpen(true);
                            setActionError('');
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete user"
                          disabled={actionLoading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={addUserModalOpen}
        onClose={() => {
          setAddUserModalOpen(false);
          setNewUserEmail('');
          setNewUserPassword('');
          setNewUserDisplayName('');
          setNewUserRoleId('');
          setAddUserError('');
        }}
        title="Add New User"
        size="md"
      >
        <div className="space-y-4">
          {addUserError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {addUserError}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="user@example.com"
            value={newUserEmail}
            onChange={(e) => {
              setNewUserEmail(e.target.value);
              setAddUserError('');
            }}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter password"
            value={newUserPassword}
            onChange={(e) => {
              setNewUserPassword(e.target.value);
              setAddUserError('');
            }}
            required
          />

          <Input
            label="Display Name (Optional)"
            type="text"
            placeholder="John Doe"
            value={newUserDisplayName}
            onChange={(e) => setNewUserDisplayName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              value={newUserRoleId}
              onChange={(e) => setNewUserRoleId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-dns-red focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">No role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAddUserModalOpen(false);
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserDisplayName('');
                setNewUserRoleId('');
                setAddUserError('');
              }}
              disabled={addUserLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleAddUser} isLoading={addUserLoading} disabled={!newUserEmail || !newUserPassword}>
              Create User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editUserModalOpen}
        onClose={() => {
          setEditUserModalOpen(false);
          setSelectedUser(null);
          setEditUserError('');
        }}
        title="Edit User"
        size="md"
      >
        <div className="space-y-4">
          {editUserError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {editUserError}
            </div>
          )}

          {selectedUser && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="text"
                  value={selectedUser.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              <Input
                label="Display Name"
                type="text"
                placeholder="John Doe"
                value={editUserDisplayName}
                onChange={(e) => setEditUserDisplayName(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={editUserRoleId}
                  onChange={(e) => setEditUserRoleId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-dns-red focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditUserModalOpen(false);
                    setSelectedUser(null);
                    setEditUserError('');
                  }}
                  disabled={editUserLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveUser} isLoading={editUserLoading}>
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={deleteUserModalOpen}
        onClose={() => {
          setDeleteUserModalOpen(false);
          setSelectedUser(null);
          setActionError('');
        }}
        title="Delete User"
        size="md"
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {actionError}
            </div>
          )}

          {selectedUser && (
            <>
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete the user <strong>"{selectedUser.email}"</strong>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone. The user account will be permanently deleted from the system.
              </p>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDeleteUserModalOpen(false);
                    setSelectedUser(null);
                    setActionError('');
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteUser}
                  isLoading={actionLoading}
                  icon={<Trash2 size={16} />}
                >
                  Delete User
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;


