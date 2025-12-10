import React, { useState, useEffect } from 'react';
import { UserCircle, Shield, QrCode, Key, X, AlertTriangle, Pencil, LogOut, Save, Download, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import * as user2FAService from '../services/user2FAService';
import { useAuth } from '../context/AuthContext';
import { getUserDisplayName, setUserDisplayName, getUserDisplayNameOnly } from '../utils/userUtils';
import { getUserById, getRoleById } from '../services/userManagementService';
import { loadConfigSync } from '../services/configService';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

const Profile: React.FC = () => {
  const { currentUser, logout } = useAuth();

  // Display Name State
  const [displayName, setDisplayName] = useState('');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');

  // Role State
  const [userRole, setUserRole] = useState<string>('');
  const [roleLoading, setRoleLoading] = useState(true);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ qrCode: string; secret: string; manualEntryKey: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');
  const [disable2FAModalOpen, setDisable2FAModalOpen] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState('');
  const [disable2FAError, setDisable2FAError] = useState('');
  
  // Backup Codes State
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [backupCodesModalOpen, setBackupCodesModalOpen] = useState(false);
  const [regenerateBackupCodesModalOpen, setRegenerateBackupCodesModalOpen] = useState(false);
  const [regenerateVerificationCode, setRegenerateVerificationCode] = useState('');
  const [regenerateError, setRegenerateError] = useState('');
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  
  // Password Verification State for Backup Codes
  const [passwordVerificationModalOpen, setPasswordVerificationModalOpen] = useState(false);
  const [backupCodesPassword, setBackupCodesPassword] = useState('');
  const [backupCodesPasswordError, setBackupCodesPasswordError] = useState('');
  const [backupCodesPasswordLoading, setBackupCodesPasswordLoading] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [pendingBackupCodesAction, setPendingBackupCodesAction] = useState<'view' | 'download' | null>(null);

  // Load display name, role, and 2FA status on mount
  useEffect(() => {
    const loadDisplayName = () => {
      if (currentUser?.email) {
        const savedDisplayName = getUserDisplayNameOnly(currentUser.email);
        setDisplayName(savedDisplayName || '');
      }
    };

    const loadUserRole = async () => {
      if (!currentUser?.uid) {
        setRoleLoading(false);
        return;
      }

      try {
        setRoleLoading(true);
        
        // Check if user is administrator
        const config = loadConfigSync();
        const isAdmin = currentUser.email && 
          config.administratorEmail?.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
        
        if (isAdmin) {
          setUserRole('Master Admin');
          setRoleLoading(false);
          return;
        }

        // Get user from database
        const user = await getUserById(currentUser.uid);
        if (!user) {
          setUserRole('No role');
          setRoleLoading(false);
          return;
        }

        // Get role name
        const role = await getRoleById(user.roleId);
        if (role) {
          setUserRole(role.name);
        } else {
          setUserRole('No role');
        }
      } catch (error) {
        console.error('Error loading user role:', error);
        setUserRole('No role');
      } finally {
        setRoleLoading(false);
      }
    };

    loadDisplayName();
    loadUserRole();
    load2FAStatus();

    // Listen for display name updates
    const handleDisplayNameUpdate = () => {
      loadDisplayName();
    };
    window.addEventListener('displayNameUpdated', handleDisplayNameUpdate);

    return () => {
      window.removeEventListener('displayNameUpdated', handleDisplayNameUpdate);
    };
  }, [currentUser]);

  const load2FAStatus = async () => {
    if (!currentUser?.uid) return;
    try {
      const status = await user2FAService.getUser2FAStatus(currentUser.uid);
      setTwoFactorEnabled(status.enabled);
      
      // Load backup codes if 2FA is enabled
      if (status.enabled) {
        await loadBackupCodes();
      }
    } catch (error) {
      console.error('Failed to load 2FA status:', error);
    }
  };

  const loadBackupCodes = async () => {
    if (!currentUser?.uid) return;
    try {
      const codes = await user2FAService.getUserBackupCodes(currentUser.uid);
      setBackupCodes(codes);
    } catch (error) {
      console.error('Failed to load backup codes:', error);
    }
  };

  const downloadBackupCodes = () => {
    if (!backupCodes || !currentUser?.email) return;
    
    const content = `DNS Manpower Management System - 2FA Backup Codes

IMPORTANT: Keep these codes in a safe place. You can use them to access your account if you lose access to your authenticator app.

Email: ${currentUser.email}
Generated: ${new Date().toLocaleString()}

Backup Codes:
${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Instructions:
- Each code can only be used once
- Use these codes if you lose access to your authenticator app
- Keep this file secure and do not share it with anyone
- You can regenerate new codes from your Profile page (requires authenticator verification)

Security Note:
If you suspect your backup codes have been compromised, regenerate them immediately from your Profile page.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2fa-backup-codes-${currentUser.email.replace('@', '-at-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRegenerateBackupCodes = async () => {
    if (!currentUser?.uid) return;
    if (regenerateVerificationCode.length !== 6) {
      setRegenerateError('Please enter a valid 6-digit code');
      return;
    }

    setRegenerateLoading(true);
    setRegenerateError('');

    try {
      const newCodes = await user2FAService.regenerateUserBackupCodes(currentUser.uid, regenerateVerificationCode);
      setBackupCodes(newCodes);
      setRegenerateBackupCodesModalOpen(false);
      setRegenerateVerificationCode('');
      setBackupCodesModalOpen(true);
      setTwoFactorSuccess('Backup codes regenerated successfully');
      setTimeout(() => setTwoFactorSuccess(''), 5000);
    } catch (error: any) {
      setRegenerateError(error.message || 'Failed to regenerate backup codes. Please check your code.');
    } finally {
      setRegenerateLoading(false);
    }
  };

  // Verify password for backup codes access
  const handleVerifyBackupCodesPassword = async () => {
    if (!currentUser?.email || !auth) {
      setBackupCodesPasswordError('Unable to verify password. Please try again.');
      return;
    }

    if (!backupCodesPassword) {
      setBackupCodesPasswordError('Please enter your password');
      return;
    }

    setBackupCodesPasswordLoading(true);
    setBackupCodesPasswordError('');

    try {
      // Reauthenticate user with their password
      const credential = EmailAuthProvider.credential(currentUser.email, backupCodesPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Password verified successfully
      setPasswordVerified(true);
      setPasswordVerificationModalOpen(false);
      setBackupCodesPassword('');
      
      // Perform the pending action
      if (pendingBackupCodesAction === 'view') {
        setBackupCodesModalOpen(true);
      } else if (pendingBackupCodesAction === 'download') {
        downloadBackupCodes();
      }
      
      setPendingBackupCodesAction(null);
    } catch (error: any) {
      console.error('Password verification failed:', error);
      if (error.code === 'auth/wrong-password') {
        setBackupCodesPasswordError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setBackupCodesPasswordError('Too many failed attempts. Please try again later.');
      } else {
        setBackupCodesPasswordError(error.message || 'Failed to verify password. Please try again.');
      }
    } finally {
      setBackupCodesPasswordLoading(false);
    }
  };

  // Generate 2FA secret and show QR code
  const handleGenerate2FA = async () => {
    if (!currentUser?.uid || !currentUser?.email) return;
    setTwoFactorLoading(true);
    setTwoFactorError('');
    setTwoFactorSuccess('');
    try {
      const result = await user2FAService.generateUser2FASecret(currentUser.uid, currentUser.email);
      setQrCodeData(result);
      setQrCodeModalOpen(true);
    } catch (error: any) {
      setTwoFactorError(error.message || 'Failed to generate 2FA secret');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Enable 2FA after verification
  const handleEnable2FA = async () => {
    if (!qrCodeData || !currentUser?.uid) return;
    
    if (verificationCode.length !== 6) {
      setTwoFactorError('Please enter a valid 6-digit code');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      await user2FAService.enableUser2FA(currentUser.uid, qrCodeData.secret, verificationCode);
      setTwoFactorEnabled(true);
      setQrCodeModalOpen(false);
      setVerificationCode('');
      
      // Load backup codes after enabling
      await loadBackupCodes();
      
      // Show backup codes modal
      setBackupCodesModalOpen(true);
      
      setTwoFactorSuccess('Two-factor authentication enabled successfully');
      setTimeout(() => setTwoFactorSuccess(''), 5000);
    } catch (error: any) {
      setTwoFactorError(error.message || 'Failed to enable 2FA. Please check your code.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!currentUser?.uid) return;
    if (disable2FACode.length !== 6) {
      setDisable2FAError('Please enter a valid 6-digit code');
      return;
    }

    setTwoFactorLoading(true);
    setDisable2FAError('');

    try {
      await user2FAService.disableUser2FA(currentUser.uid, disable2FACode);
      setTwoFactorEnabled(false);
      setDisable2FAModalOpen(false);
      setDisable2FACode('');
      setTwoFactorSuccess('Two-factor authentication disabled successfully');
      setTimeout(() => setTwoFactorSuccess(''), 5000);
    } catch (error: any) {
      setDisable2FAError(error.message || 'Failed to disable 2FA. Please check your code.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Handle Display Name Edit
  const handleEditDisplayName = () => {
    if (currentUser?.email) {
      const savedDisplayName = getUserDisplayNameOnly(currentUser.email);
      setDisplayName(savedDisplayName || '');
      setIsEditingDisplayName(true);
      setDisplayNameError('');
    }
  };

  // Handle Save Display Name
  const handleSaveDisplayName = () => {
    if (!currentUser?.email) return;

    if (displayName.trim().length === 0) {
      setDisplayNameError('Display name cannot be empty');
      return;
    }

    if (displayName.trim().length > 50) {
      setDisplayNameError('Display name must be 50 characters or less');
      return;
    }

    setUserDisplayName(currentUser.email, displayName.trim());
    setIsEditingDisplayName(false);
    setDisplayNameError('');
    // Trigger a re-render by updating state
    window.dispatchEvent(new Event('displayNameUpdated'));
  };

  // Handle Cancel Display Name Edit
  const handleCancelDisplayName = () => {
    if (currentUser?.email) {
      const savedDisplayName = getUserDisplayNameOnly(currentUser.email);
      setDisplayName(savedDisplayName || '');
    }
    setIsEditingDisplayName(false);
    setDisplayNameError('');
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      console.log("Logout button clicked");
      await logout();
      // Force page reload to ensure clean state - redirect to home
      window.location.href = '/#/';
    } catch (error: any) {
      console.error("Failed to log out", error);
      // Even if logout fails, redirect to force clean state
      window.location.href = '/#/';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account settings and security</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200 mb-6">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <UserCircle size={40} className="text-white" />
              </div>
              <div className="flex-1">
                {isEditingDisplayName ? (
                  <div className="space-y-2">
                    <Input
                      label="Display Name"
                      placeholder="Enter your display name"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setDisplayNameError('');
                      }}
                      error={displayNameError}
                      maxLength={50}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="secondary" onClick={handleCancelDisplayName}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveDisplayName} icon={<Save size={14} />}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      {currentUser?.email ? getUserDisplayName(currentUser.email) : 'User'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {currentUser?.email || 'Account Information'}
                    </p>
                    {roleLoading ? (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          Loading role...
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          userRole === 'Master Admin'
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                            : userRole === 'No role'
                            ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-dns-red text-white shadow-md'
                        }`}>
                          {userRole || 'No role'}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {!isEditingDisplayName && (
              <button
                onClick={handleEditDisplayName}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Edit display name"
              >
                <Pencil size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <Shield className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account.</p>
              </div>
            </div>
            {/* Toggle Switch */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (twoFactorEnabled) {
                    setDisable2FAModalOpen(true);
                  } else {
                    handleGenerate2FA();
                  }
                }}
                disabled={twoFactorLoading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-dns-red focus:ring-offset-2 ${
                  twoFactorEnabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                } ${twoFactorLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={twoFactorEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {twoFactorSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
              {twoFactorSuccess}
            </div>
          )}
          {twoFactorError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {twoFactorError}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Status: <span className={twoFactorEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {twoFactorEnabled 
                  ? 'Your account is protected with two-factor authentication'
                  : 'Enable 2FA to require a verification code from Google Authenticator'}
              </p>
            </div>
          </div>

          {/* Backup Codes Section */}
          {twoFactorEnabled && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Backup Codes</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use these codes if you lose access to your authenticator app
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPendingBackupCodesAction('view');
                    setPasswordVerificationModalOpen(true);
                  }}
                  icon={<Key size={14} />}
                >
                  View Codes
                </Button>
                {backupCodes && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setPendingBackupCodesAction('download');
                      setPasswordVerificationModalOpen(true);
                    }}
                    icon={<Download size={14} />}
                  >
                    Download
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRegenerateBackupCodesModalOpen(true)}
                  icon={<RefreshCw size={14} />}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2FA QR Code Modal */}
      <Modal isOpen={qrCodeModalOpen} onClose={() => {
        setQrCodeModalOpen(false);
        setVerificationCode('');
        setTwoFactorError('');
      }} title="Enable Two-Factor Authentication" size="md">
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Step 1:</strong> Scan this QR code with Google Authenticator app on your phone.
            </p>
          </div>

          {qrCodeData && (
            <>
              <div className="flex justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <img src={qrCodeData.qrCode} alt="QR Code" className="w-64 h-64" />
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Can't scan? Enter this code manually:</p>
                <div className="space-y-2">
                  <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-300 dark:border-gray-600">
                    <code className="text-xs font-mono text-gray-900 dark:text-white break-all select-all">
                      {qrCodeData.manualEntryKey}
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(qrCodeData.manualEntryKey);
                      setTwoFactorSuccess('Secret key copied to clipboard!');
                      setTimeout(() => setTwoFactorSuccess(''), 3000);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <Key size={14} />
                    <span>Copy Secret Key</span>
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Step 2:</strong> Enter the 6-digit code from Google Authenticator to verify and enable 2FA.
                </p>
              </div>

              {twoFactorError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                  {twoFactorError}
                </div>
              )}

              <div>
                <Input
                  label="Verification Code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                    setTwoFactorError('');
                  }}
                  maxLength={6}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQrCodeModalOpen(false);
                    setVerificationCode('');
                    setTwoFactorError('');
                  }}
                  disabled={twoFactorLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEnable2FA}
                  isLoading={twoFactorLoading}
                  disabled={verificationCode.length !== 6}
                >
                  Verify & Enable
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Disable 2FA Confirmation Modal */}
      <Modal isOpen={disable2FAModalOpen} onClose={() => {
        setDisable2FAModalOpen(false);
        setDisable2FACode('');
        setDisable2FAError('');
      }} title="Disable Two-Factor Authentication" size="md">
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Security Warning</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                To disable two-factor authentication, please enter your 2FA code from your authenticator app. This will make your account less secure.
              </p>
            </div>
          </div>

          {disable2FAError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{disable2FAError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter 2FA Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={disable2FACode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setDisable2FACode(value);
                setDisable2FAError('');
              }}
              placeholder="000000"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-dns-red focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl tracking-widest font-mono transition-all duration-200"
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDisable2FAModalOpen(false);
                setDisable2FACode('');
                setDisable2FAError('');
              }}
              disabled={twoFactorLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDisable2FA}
              isLoading={twoFactorLoading}
              disabled={twoFactorLoading || disable2FACode.length !== 6}
              icon={<X size={16} />}
              className="flex-1"
            >
              Disable 2FA
            </Button>
          </div>
        </div>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal isOpen={backupCodesModalOpen} onClose={() => setBackupCodesModalOpen(false)} title="2FA Backup Codes" size="md">
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Important Security Information</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Save these backup codes in a safe place. Each code can only be used once. 
                  If you lose access to your authenticator app, you can use these codes to access your account.
                </p>
              </div>
            </div>
          </div>

          {backupCodes && backupCodes.length > 0 ? (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No backup codes available. Please regenerate them.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setBackupCodesModalOpen(false)}
              className="flex-1"
            >
              Close
            </Button>
            {backupCodes && backupCodes.length > 0 && (
              <Button
                onClick={() => {
                  setPendingBackupCodesAction('download');
                  setPasswordVerificationModalOpen(true);
                }}
                icon={<Download size={16} />}
                className="flex-1"
              >
                Download as TXT
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Password Verification Modal for Backup Codes */}
      <Modal isOpen={passwordVerificationModalOpen} onClose={() => {
        setPasswordVerificationModalOpen(false);
        setBackupCodesPassword('');
        setBackupCodesPasswordError('');
        setPendingBackupCodesAction(null);
      }} title="Verify Password" size="md">
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Security Verification Required:</strong> Enter your account password to {pendingBackupCodesAction === 'view' ? 'view' : 'download'} backup codes.
            </p>
          </div>

          {backupCodesPasswordError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {backupCodesPasswordError}
            </div>
          )}

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={backupCodesPassword}
              onChange={(e) => {
                setBackupCodesPassword(e.target.value);
                setBackupCodesPasswordError('');
              }}
              required
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && backupCodesPassword && !backupCodesPasswordLoading) {
                  handleVerifyBackupCodesPassword();
                }
              }}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter your account password to access backup codes
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPasswordVerificationModalOpen(false);
                setBackupCodesPassword('');
                setBackupCodesPasswordError('');
                setPendingBackupCodesAction(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyBackupCodesPassword}
              isLoading={backupCodesPasswordLoading}
              disabled={!backupCodesPassword}
              className="flex-1"
            >
              Verify
            </Button>
          </div>
        </div>
      </Modal>

      {/* Regenerate Backup Codes Modal */}
      <Modal isOpen={regenerateBackupCodesModalOpen} onClose={() => {
        setRegenerateBackupCodesModalOpen(false);
        setRegenerateVerificationCode('');
        setRegenerateError('');
      }} title="Regenerate Backup Codes" size="md">
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Security Verification Required:</strong> Enter your 6-digit authenticator code to regenerate backup codes. 
              Your old backup codes will be invalidated.
            </p>
          </div>

          {regenerateError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {regenerateError}
            </div>
          )}

          <div>
            <Input
              label="Authenticator Code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={regenerateVerificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setRegenerateVerificationCode(value);
                setRegenerateError('');
              }}
              maxLength={6}
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setRegenerateBackupCodesModalOpen(false);
                setRegenerateVerificationCode('');
                setRegenerateError('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegenerateBackupCodes}
              isLoading={regenerateLoading}
              disabled={regenerateVerificationCode.length !== 6}
              className="flex-1"
            >
              Regenerate Codes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logout Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200 mt-6">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Account Actions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Log out from your current session.</p>
          <Button onClick={handleLogout} variant="danger" icon={<LogOut size={16}/>}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;

