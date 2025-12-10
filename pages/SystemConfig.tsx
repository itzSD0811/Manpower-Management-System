
import React, { useState, useEffect, useRef } from 'react';
import { Flame, CheckCircle, Server, Activity, AlertTriangle, ShieldAlert, Database, HelpCircle, Download, Upload, X, Pencil, Lock, Save, Shield, Users } from 'lucide-react';
import * as firebase from '../services/firebaseDataService';
import * as mysql from '../services/mysqlDataService';
import { saveConfig, loadConfig, loadConfigSync, AppConfig, verifyConfigPassword } from '../services/configService';
import { MysqlConfig, FirebaseConfig, RecaptchaConfig } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import FirebaseSetupGuide from '../components/ui/FirebaseSetupGuide';
import RecaptchaSetupGuide from '../components/ui/RecaptchaSetupGuide';
import * as twoFactorService from '../services/twoFactorService';
import Modal from '../components/ui/Modal';

const SystemConfig: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // DB Selection State
  const [dbSelection, setDbSelection] = useState<'firebase' | 'mysql'>('firebase');
  const [mysqlConfig, setMysqlConfig] = useState<MysqlConfig>({});
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });
  const [recaptchaConfig, setRecaptchaConfig] = useState<RecaptchaConfig>({
    siteKey: '',
    secretKey: '',
    enabled: false,
  });

  // UI State
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isRecaptchaTutorialOpen, setIsRecaptchaTutorialOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Diagnostics State
  const [diagStatus, setDiagStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [diagMessage, setDiagMessage] = useState('');
  const [mysqlDiagStatus, setMysqlDiagStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [mysqlDiagMessage, setMysqlDiagMessage] = useState('');
  
  // System Stats State
  const [systemStats, setSystemStats] = useState<{
    userCount: number;
    roleCount: number;
    activeUsers: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Restore State
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [restoreMessage, setRestoreMessage] = useState('');

  // 2FA State (only for config password verification)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState('');

  // Config Edit States
  const [isEditingFirebase, setIsEditingFirebase] = useState(false);
  const [isEditingMysql, setIsEditingMysql] = useState(false);
  const [firebaseConfigBackup, setFirebaseConfigBackup] = useState<FirebaseConfig | null>(null);
  const [mysqlConfigBackup, setMysqlConfigBackup] = useState<MysqlConfig | null>(null);

  // Password Protection States
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [configPassword, setConfigPassword] = useState('');
  const [configPasswordError, setConfigPasswordError] = useState('');
  const [require2FA, setRequire2FA] = useState(() => {
    // Load from sessionStorage on mount
    const stored = sessionStorage.getItem('config_require_2fa');
    return stored === 'true';
  });
  const [config2FAToken, setConfig2FAToken] = useState('');
  const [config2FAError, setConfig2FAError] = useState('');
  const [failedPasswordAttempts, setFailedPasswordAttempts] = useState(() => {
    // Load from sessionStorage on mount
    const stored = sessionStorage.getItem('config_failed_attempts');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    // Load lockout timestamp from sessionStorage
    const stored = sessionStorage.getItem('config_lockout_until');
    if (stored) {
      const timestamp = parseInt(stored, 10);
      // If lockout has expired, clear it
      if (Date.now() < timestamp) {
        return timestamp;
      } else {
        sessionStorage.removeItem('config_lockout_until');
        return null;
      }
    }
    return null;
  });
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [pendingConfigAction, setPendingConfigAction] = useState<'edit-firebase' | 'edit-mysql' | 'save-config' | null>(null);

  // Helper to update failed attempts and persist to sessionStorage
  const updateFailedAttempts = (attempts: number) => {
    setFailedPasswordAttempts(attempts);
    sessionStorage.setItem('config_failed_attempts', attempts.toString());
  };

  // Helper to update require2FA and persist to sessionStorage
  const updateRequire2FA = (require: boolean) => {
    setRequire2FA(require);
    sessionStorage.setItem('config_require_2fa', require.toString());
  };

  // Helper to set lockout
  const setLockout = (minutes: number = 5) => {
    const lockoutTimestamp = Date.now() + (minutes * 60 * 1000);
    setLockoutUntil(lockoutTimestamp);
    sessionStorage.setItem('config_lockout_until', lockoutTimestamp.toString());
  };

  // Helper to clear security state (only on successful verification)
  const clearSecurityState = () => {
    setRequire2FA(false);
    setFailedPasswordAttempts(0);
    setLockoutUntil(null);
    sessionStorage.removeItem('config_require_2fa');
    sessionStorage.removeItem('config_failed_attempts');
    sessionStorage.removeItem('config_lockout_until');
  };

  // Check lockout status and update remaining time
  useEffect(() => {
    if (lockoutUntil) {
      const updateRemainingTime = () => {
        const now = Date.now();
        const remaining = Math.max(0, lockoutUntil - now);
        setRemainingTime(remaining);
        
        if (remaining <= 0) {
          // Lockout expired, clear it
          setLockoutUntil(null);
          sessionStorage.removeItem('config_lockout_until');
          setRequire2FA(false);
          setFailedPasswordAttempts(0);
          sessionStorage.removeItem('config_require_2fa');
          sessionStorage.removeItem('config_failed_attempts');
        }
      };

      updateRemainingTime();
      const interval = setInterval(updateRemainingTime, 1000); // Update every second

      return () => clearInterval(interval);
    } else {
      setRemainingTime(0);
    }
  }, [lockoutUntil]);


  // Load config from API on mount
  useEffect(() => {
    const loadConfigData = async () => {
      try {
        const config = await loadConfig();
        setDbSelection(config.dbType);
        if (config.mysqlConfig) {
          setMysqlConfig(config.mysqlConfig);
        }
        if (config.firebaseConfig) {
          setFirebaseConfig(config.firebaseConfig);
        }
        if (config.recaptchaConfig) {
          setRecaptchaConfig(config.recaptchaConfig);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        // Fallback to sync version
        const config = loadConfigSync();
        setDbSelection(config.dbType);
        if (config.mysqlConfig) {
          setMysqlConfig(config.mysqlConfig);
        }
        if (config.firebaseConfig) {
          setFirebaseConfig(config.firebaseConfig);
        }
        if (config.recaptchaConfig) {
          setRecaptchaConfig(config.recaptchaConfig);
        }
      }
    };
    loadConfigData();
    load2FAStatus();
    loadSystemStats();
  }, []);

  // Load system statistics
  const loadSystemStats = async () => {
    setLoadingStats(true);
    try {
      const [users, roles] = await Promise.all([
        getUsers().catch(() => []),
        getRoles().catch(() => [])
      ]);
      
      const activeUsers = users.filter(u => u.isActive).length;
      
      setSystemStats({
        userCount: users.length,
        roleCount: roles.length,
        activeUsers: activeUsers,
      });
    } catch (error) {
      console.error('Failed to load system stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load 2FA status
  const load2FAStatus = async () => {
    try {
      const status = await twoFactorService.get2FAStatus();
      setTwoFactorEnabled(status.enabled);
      // If 2FA is not enabled but require2FA is set in sessionStorage, clear it
      const storedRequire2FA = sessionStorage.getItem('config_require_2fa') === 'true';
      if (!status.enabled && storedRequire2FA) {
        clearSecurityState();
      }
    } catch (error) {
      console.error('Failed to load 2FA status:', error);
    }
  };


  // Handle Edit Firebase Config
  const handleEditFirebase = () => {
    setPendingConfigAction('edit-firebase');
    setPasswordModalOpen(true);
  };

  // Handle Save Firebase Config
  const handleSaveFirebase = () => {
    setIsEditingFirebase(false);
    setFirebaseConfigBackup(null);
  };

  // Handle Cancel Firebase Edit
  const handleCancelFirebase = () => {
    if (firebaseConfigBackup) {
      setFirebaseConfig(firebaseConfigBackup);
    }
    setIsEditingFirebase(false);
    setFirebaseConfigBackup(null);
  };

  // Handle Edit MySQL Config
  const handleEditMysql = () => {
    setPendingConfigAction('edit-mysql');
    setPasswordModalOpen(true);
  };

  // Handle Save MySQL Config
  const handleSaveMysql = () => {
    setIsEditingMysql(false);
    setMysqlConfigBackup(null);
  };

  // Handle Cancel MySQL Edit
  const handleCancelMysql = () => {
    if (mysqlConfigBackup) {
      setMysqlConfig(mysqlConfigBackup);
    }
    setIsEditingMysql(false);
    setMysqlConfigBackup(null);
  };

  // Handle Password Verification
  const handleVerifyPassword = async () => {
    setConfigPasswordError('');
    setConfig2FAError('');

    // Check if user is locked out
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60);
      setConfigPasswordError(`Too many failed attempts. Please wait ${remaining} more minute(s) before trying again.`);
      return;
    }

    try {
      let verified = false;

      if (require2FA) {
        // Verify 2FA token
        const result = await verifyConfigPassword(undefined, config2FAToken);
        verified = result;
        if (!verified) {
          setConfig2FAError('Invalid 2FA code');
          return;
        }
      } else {
        // Verify password
        const result = await verifyConfigPassword(configPassword);
        verified = result;
        if (!verified) {
          const newAttempts = failedPasswordAttempts + 1;
          updateFailedAttempts(newAttempts);
          
          if (newAttempts >= 3) {
            // Only require 2FA if it's actually enabled
            if (twoFactorEnabled) {
              updateRequire2FA(true);
              setConfigPasswordError('Too many failed attempts. Please enter your 2FA code.');
            } else {
              // If 2FA is not enabled, set lockout for 5 minutes
              setLockout(5);
              setConfigPasswordError(`Too many failed attempts. Account locked for 5 minutes. Please wait before trying again, or enable 2FA in Profile page for additional security.`);
            }
          } else {
            setConfigPasswordError(`Invalid password. ${3 - newAttempts} attempt(s) remaining.`);
          }
          return;
        }
      }

      // Password/2FA verified, proceed with action
      // Save the password/token values before clearing (needed for performSaveConfig)
      const passwordValue = require2FA ? undefined : configPassword;
      const tokenValue = require2FA ? config2FAToken : undefined;
      
      // Clear security state on successful verification
      clearSecurityState();
      
      if (pendingConfigAction === 'edit-firebase') {
        setFirebaseConfigBackup({ ...firebaseConfig });
        setIsEditingFirebase(true);
        // Reset modal states (but keep security state cleared)
        setPasswordModalOpen(false);
        setConfigPassword('');
        setConfig2FAToken('');
        setConfigPasswordError('');
        setConfig2FAError('');
        setPendingConfigAction(null);
      } else if (pendingConfigAction === 'edit-mysql') {
        setMysqlConfigBackup({ ...mysqlConfig });
        setIsEditingMysql(true);
        // Reset modal states (but keep security state cleared)
        setPasswordModalOpen(false);
        setConfigPassword('');
        setConfig2FAToken('');
        setConfigPasswordError('');
        setConfig2FAError('');
        setPendingConfigAction(null);
      } else if (pendingConfigAction === 'save-config') {
        // Save config with verified password/token (using saved values)
        await performSaveConfig(passwordValue, tokenValue);
        // Reset modal states (but keep security state cleared)
        setPasswordModalOpen(false);
        setConfigPassword('');
        setConfig2FAToken('');
        setConfigPasswordError('');
        setConfig2FAError('');
        setPendingConfigAction(null);
      }
    } catch (error: any) {
      if (require2FA) {
        setConfig2FAError(error.message || 'Invalid 2FA code');
      } else {
        const newAttempts = failedPasswordAttempts + 1;
        updateFailedAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          // Only require 2FA if it's actually enabled
          if (twoFactorEnabled) {
            updateRequire2FA(true);
            setConfigPasswordError('Too many failed attempts. Please enter your 2FA code.');
          } else {
            // If 2FA is not enabled, set lockout for 5 minutes
            setLockout(5);
            setConfigPasswordError(`Too many failed attempts. Account locked for 5 minutes. Please wait before trying again, or enable 2FA in Profile page for additional security.`);
          }
        } else {
          setConfigPasswordError(error.message || `Invalid password. ${3 - newAttempts} attempt(s) remaining.`);
        }
      }
    }
  };

  // Handle Save Configuration (requires password)
  const handleSaveConfig = async () => {
    setPendingConfigAction('save-config');
    setPasswordModalOpen(true);
  };

  // Actually save config after password verification
  const performSaveConfig = async (password?: string, token?: string) => {
    const newConfig: AppConfig = {
      dbType: dbSelection,
      mysqlConfig: mysqlConfig,
      firebaseConfig: firebaseConfig,
      recaptchaConfig: recaptchaConfig,
    };
    try {
      await saveConfig(newConfig, password, token);
      setSaveSuccess(true);
      setTimeout(() => {
          setSaveSuccess(false);
          window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveSuccess(false);
      // Show error message to user
      alert('Failed to save configuration. Please check if the backend server is running.');
    }
  };

  const runMysqlDiagnostics = async () => {
    setMysqlDiagStatus('running');
    setMysqlDiagMessage('Attempting to connect to MySQL...');
    
    try {
      const result = await mysql.checkDatabaseConnection(mysqlConfig);

      if (result.success) {
        setMysqlDiagStatus('success');
        setMysqlDiagMessage(result.message);
      } else {
        setMysqlDiagStatus('error');
        setMysqlDiagMessage(result.message);
      }
    } catch (error: any) {
      setMysqlDiagStatus('error');
      setMysqlDiagMessage('Failed to connect to the backend server. Is it running?');
    }
  };

  const runDiagnostics = async () => {
    setDiagStatus('running');
    setDiagMessage('Attempting to read and write to Firestore...');
    
    const result = await firebase.checkDatabaseConnection();
    
    if (result.success) {
      setDiagStatus('success');
      setDiagMessage(result.message);
    } else {
      setDiagStatus('error');
      setDiagMessage(result.message);
    }
  };


  const handleBackup = () => {
    window.location.href = 'http://localhost:3001/api/mysql-backup';
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isConfirmed = window.confirm(
      "WARNING: This will overwrite the current database with the contents of the backup file. This action cannot be undone. Are you sure you want to continue?"
    );

    if (isConfirmed) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          setRestoreStatus('running');
          setRestoreMessage('Restoring database from backup...');
          try {
            const response = await fetch('http://localhost:3001/api/mysql-restore', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/sql',
              },
              body: content,
            });
            const result = await response.json();
            if (response.ok) {
              setRestoreStatus('success');
              setRestoreMessage(result.message);
            } else {
              throw new Error(result.message);
            }
          } catch (error: any) {
            setRestoreStatus('error');
            setRestoreMessage(error.message || 'An unknown error occurred.');
          }
        }
      };
      reader.readAsText(file);
    }
    // Reset file input value to allow re-uploading the same file
    event.target.value = '';
  };


  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage external cloud database connection and user session.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.location.href = '#/users'} icon={<Users size={16} />}>
            Manage Users
          </Button>
          <Button variant="secondary" onClick={() => window.location.href = '#/roles'} icon={<Shield size={16} />}>
            Manage Roles
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Config Panel */}
        <div className="lg:col-span-2 space-y-6">
            {/* Database Selection */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
                            <Database className="text-gray-600 dark:text-gray-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Database Provider</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Select the primary database for the application.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Firebase Card */}
                        <div 
                            onClick={() => setDbSelection('firebase')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${dbSelection === 'firebase' ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-500' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Flame className={`transition-colors ${dbSelection === 'firebase' ? 'text-amber-500' : 'text-gray-400'}`} size={24} />
                                <div>
                                    <h3 className={`font-bold transition-colors ${dbSelection === 'firebase' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>Firebase</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Cloud-based, real-time</p>
                                </div>
                                {dbSelection === 'firebase' && <CheckCircle className="ml-auto text-amber-600" size={20} />}
                            </div>
                        </div>

                        {/* MySQL Card */}
                        <div 
                            onClick={() => setDbSelection('mysql')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${dbSelection === 'mysql' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Server className={`transition-colors ${dbSelection === 'mysql' ? 'text-blue-500' : 'text-gray-400'}`} size={24} />
                                <div>
                                    <h3 className={`font-bold transition-colors ${dbSelection === 'mysql' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>MySQL</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Local or remote server</p>
                                </div>
                                {dbSelection === 'mysql' && <CheckCircle className="ml-auto text-blue-600" size={20} />}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-4">
                        {saveSuccess && <p className="text-sm text-green-500 animate-pulse">Configuration saved! Reloading...</p>}
                        <Button onClick={handleSaveConfig}>Save Configuration</Button>
                    </div>
                </div>
            </div>

            {/* MySQL Config */}
            {dbSelection === 'mysql' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Server className="text-blue-600 dark:text-blue-400" size={24} />
                          </div>
                          <div>
                              <h2 className="text-lg font-medium text-gray-900 dark:text-white">MySQL Configuration</h2>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Connection details for your MySQL server.</p>
                          </div>
                      </div>
                        {!isEditingMysql ? (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleEditMysql} 
                            icon={<Pencil size={14} />}
                            className="!bg-blue-600 !hover:bg-blue-700 !text-white !border-blue-600 dark:!bg-blue-500 dark:!hover:bg-blue-600 dark:!border-blue-500 dark:!text-white"
                          >
                            Edit
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={handleCancelMysql}>
                              Cancel
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleSaveMysql} icon={<Save size={14} />}>
                              Save
                            </Button>
                    </div>
                        )}
                      </div>
                    </div>
                    <div className="p-6 space-y-4 relative">
                        <div className={`space-y-4 ${!isEditingMysql ? 'pointer-events-none opacity-75' : ''}`}>
                          <div className="relative group">
                            <Input 
                              label="Host" 
                              placeholder="localhost" 
                              value={mysqlConfig.host || ''} 
                              onChange={(e) => setMysqlConfig({...mysqlConfig, host: e.target.value})}
                              readOnly={!isEditingMysql}
                            />
                            {!isEditingMysql && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <Input 
                              label="Port" 
                              placeholder="3306" 
                              type="number" 
                              value={mysqlConfig.port || ''} 
                              onChange={(e) => setMysqlConfig({...mysqlConfig, port: Number(e.target.value)})}
                              readOnly={!isEditingMysql}
                            />
                            {!isEditingMysql && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <Input 
                              label="Database" 
                              placeholder="dns_manpower" 
                              value={mysqlConfig.database || ''} 
                              onChange={(e) => setMysqlConfig({...mysqlConfig, database: e.target.value})}
                              readOnly={!isEditingMysql}
                            />
                            {!isEditingMysql && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <Input 
                              label="User" 
                              placeholder="root" 
                              value={mysqlConfig.user || ''} 
                              onChange={(e) => setMysqlConfig({...mysqlConfig, user: e.target.value})}
                              readOnly={!isEditingMysql}
                            />
                            {!isEditingMysql && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <Input 
                              label="Password" 
                              type="password" 
                              value={mysqlConfig.password || ''} 
                              onChange={(e) => setMysqlConfig({...mysqlConfig, password: e.target.value})}
                              readOnly={!isEditingMysql}
                            />
                            {!isEditingMysql && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                            <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">Backup & Restore</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                Create a full backup of the MySQL database or restore it from a previously created `.sql` file.
                            </p>
                            <div className="flex gap-4">
                                <Button type="button" variant="secondary" onClick={handleBackup} icon={<Download size={16}/>}>Make SQL Backup</Button>
                                <Button type="button" variant="secondary" onClick={triggerImport} icon={<Upload size={16}/>}>Import Backup</Button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".sql" className="hidden" />
                            </div>
                            {restoreStatus !== 'idle' && (
                                <div className="mt-4 p-3 rounded-lg text-sm
                                    {restoreStatus === 'running' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200' : ''}
                                    {restoreStatus === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200' : ''}
                                    {restoreStatus === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200' : ''}
                                ">
                                    <p>{restoreMessage}</p>
                                    {restoreStatus === 'success' && <p className="text-xs mt-1">It's recommended to reload the page to see the changes.</p>}
                                    {(restoreStatus === 'success' || restoreStatus === 'error') && (
                                        <Button size="sm" variant="ghost" onClick={() => setRestoreStatus('idle')} className="mt-2">Dismiss</Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Firebase Config */}
            {dbSelection === 'firebase' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                                <Flame className="text-amber-600 dark:text-amber-400" size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Firebase Configuration</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Connection details for your Firebase project.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isEditingFirebase ? (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={handleEditFirebase} 
                              icon={<Pencil size={14} />}
                              className="!bg-blue-600 !hover:bg-blue-700 !text-white !border-blue-600 dark:!bg-blue-500 dark:!hover:bg-blue-600 dark:!border-blue-500 dark:!text-white"
                            >
                              Edit
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button variant="secondary" size="sm" onClick={handleCancelFirebase}>
                                Cancel
                              </Button>
                              <Button variant="primary" size="sm" onClick={handleSaveFirebase} icon={<Save size={14} />}>
                                Save
                              </Button>
                            </div>
                          )}
                        <Button variant="secondary" size="sm" onClick={() => setIsTutorialOpen(true)} icon={<HelpCircle size={14} />}>
                          How to setup?
                        </Button>
                      </div>
                    </div>
                    </div>
                    <div className="p-6 space-y-4 relative">
                        <div className={`space-y-4 ${!isEditingFirebase ? 'pointer-events-none opacity-75' : ''}`}>
                          <div className="relative group">
                            <Input 
                              label="Project ID" 
                              placeholder="my-project-id" 
                              value={firebaseConfig.projectId || ''} 
                              onChange={(e) => setFirebaseConfig({...firebaseConfig, projectId: e.target.value})}
                              readOnly={!isEditingFirebase}
                            />
                            {!isEditingFirebase && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <Input 
                              label="API Key" 
                              type="password" 
                              value={firebaseConfig.apiKey || ''} 
                              onChange={(e) => setFirebaseConfig({...firebaseConfig, apiKey: e.target.value})}
                              readOnly={!isEditingFirebase}
                            />
                            {!isEditingFirebase && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <Input 
                              label="Auth Domain" 
                              placeholder="my-project.firebaseapp.com" 
                              value={firebaseConfig.authDomain || ''} 
                              onChange={(e) => setFirebaseConfig({...firebaseConfig, authDomain: e.target.value})}
                              readOnly={!isEditingFirebase}
                            />
                            {!isEditingFirebase && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <Input 
                              label="Storage Bucket" 
                              placeholder="my-project.appspot.com" 
                              value={firebaseConfig.storageBucket || ''} 
                              onChange={(e) => setFirebaseConfig({...firebaseConfig, storageBucket: e.target.value})}
                              readOnly={!isEditingFirebase}
                            />
                            {!isEditingFirebase && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <Input 
                              label="Messaging Sender ID" 
                              placeholder="1234567890" 
                              value={firebaseConfig.messagingSenderId || ''} 
                              onChange={(e) => setFirebaseConfig({...firebaseConfig, messagingSenderId: e.target.value})}
                              readOnly={!isEditingFirebase}
                            />
                            {!isEditingFirebase && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="relative group">
                            <Input 
                              label="App ID" 
                              type="password" 
                              value={firebaseConfig.appId || ''} 
                              onChange={(e) => setFirebaseConfig({...firebaseConfig, appId: e.target.value})}
                              readOnly={!isEditingFirebase}
                            />
                            {!isEditingFirebase && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
                              </div>
                            )}
                          </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Google reCAPTCHA Configuration */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                            <Shield className="text-purple-600 dark:text-purple-400" size={24} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Google reCAPTCHA</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Protect your login page from bots and automated attacks.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" onClick={() => setIsRecaptchaTutorialOpen(true)} icon={<HelpCircle size={14} />}>
                          How to setup?
                        </Button>
                        {/* Toggle Switch */}
                        <button
                            type="button"
                            onClick={() => {
                                // Only allow enabling if both keys are provided
                                if (!recaptchaConfig.enabled && (!recaptchaConfig.siteKey || !recaptchaConfig.secretKey)) {
                                    setRecaptchaError('Please enter both Site Key and Secret Key before enabling reCAPTCHA.');
                                    // Clear error after 5 seconds
                                    setTimeout(() => setRecaptchaError(''), 5000);
                                    return;
                                }
                                setRecaptchaError(''); // Clear any previous errors
                                setRecaptchaConfig({...recaptchaConfig, enabled: !recaptchaConfig.enabled});
                            }}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-dns-red focus:ring-offset-2 ${
                                recaptchaConfig.enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                            role="switch"
                            aria-checked={recaptchaConfig.enabled}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    recaptchaConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                    {recaptchaError && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">Configuration Required</p>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{recaptchaError}</p>
                            </div>
                            <button
                                onClick={() => setRecaptchaError('')}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Status: <span className={recaptchaConfig.enabled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}>
                                    {recaptchaConfig.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {recaptchaConfig.enabled 
                                    ? 'reCAPTCHA protection is active on the login page'
                                    : 'reCAPTCHA protection is disabled'}
                            </p>
                        </div>
                    </div>
                    <Input 
                        label="Site Key" 
                        placeholder="6Lc..." 
                        value={recaptchaConfig.siteKey || ''} 
                        onChange={(e) => setRecaptchaConfig({...recaptchaConfig, siteKey: e.target.value})} 
                        helperText="Public key used by the frontend. Safe to expose."
                    />
                    <Input 
                        label="Secret Key" 
                        type="password" 
                        placeholder="6Lc..." 
                        value={recaptchaConfig.secretKey || ''} 
                        onChange={(e) => setRecaptchaConfig({...recaptchaConfig, secretKey: e.target.value})} 
                        helperText="Private key used by the backend. Keep this secure!"
                    />
                    {recaptchaConfig.enabled && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm text-green-800 dark:text-green-200">
                                <strong>✓ Active:</strong> reCAPTCHA v3 is protecting your login page. Users won't see a checkbox, but the system will automatically verify them during login attempts.
                            </p>
                        </div>
                    )}
                    {!recaptchaConfig.enabled && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>Note:</strong> reCAPTCHA v3 works invisibly in the background. Users won't see a checkbox, but the system will automatically verify them during login attempts.
                            </p>
                        </div>
                    )}
                </div>
            </div>

        </div>

        {/* Diagnostics Panel */}
        <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full transition-colors duration-200">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <Activity size={18} /> Diagnostics
                    </h3>
                </div>
                <div className="p-6">
                    {/* System Statistics */}
                    {systemStats && (
                        <div className="mb-6 space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">System Overview</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{systemStats.userCount}</div>
                                    <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">Total Users</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{systemStats.activeUsers}</div>
                                    <div className="text-xs text-green-700 dark:text-green-300 mt-1">Active Users</div>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800 col-span-2">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{systemStats.roleCount}</div>
                                    <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">Roles Defined</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Database Connection Test */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Connection Test</h4>
                        <div className="flex flex-col items-center text-center">
                    {dbSelection === 'firebase' ? (
                        <>
                            {diagStatus === 'idle' && (
                                <>
                                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
                                        <Flame size={32} className="text-amber-500" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Run a connection test to verify read/write access to Firestore.</p>
                                    <Button onClick={runDiagnostics}>Run Firebase Test</Button>
                                </>
                            )}

                            {diagStatus === 'running' && (
                                <>
                                    <div className="mb-4">
                                        <svg className="animate-spin h-10 w-10 text-dns-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">{diagMessage}</p>
                                </>
                            )}

                            {diagStatus === 'success' && (
                                <>
                                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
                                        <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                                    </div>
                                    <h4 className="font-bold text-green-700 dark:text-green-400 mb-1">Connection Confirmed</h4>
                                    <p className="text-green-600 dark:text-green-300 text-xs mb-4">{diagMessage}</p>
                                    <Button variant="secondary" onClick={() => setDiagStatus('idle')} size="sm">Run Again</Button>
                                </>
                            )}

                            {diagStatus === 'error' && (
                                <>
                                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
                                        <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
                                    </div>
                                    <h4 className="font-bold text-red-700 dark:text-red-400 mb-1">Connection Failed</h4>
                                    <p className="text-red-600 dark:text-red-300 text-xs mb-4">{diagMessage}</p>
                                    <Button variant="secondary" onClick={() => setDiagStatus('idle')} size="sm">Try Again</Button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {mysqlDiagStatus === 'idle' && (
                                <>
                                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
                                        <Server size={32} className="text-dns-red" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Run a connection test to verify access to the MySQL server.</p>
                                    <Button onClick={runMysqlDiagnostics}>Run MySQL Test</Button>
                                </>
                            )}

                            {mysqlDiagStatus === 'running' && (
                                <>
                                    <div className="mb-4">
                                        <svg className="animate-spin h-10 w-10 text-dns-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">{mysqlDiagMessage}</p>
                                </>
                            )}

                            {mysqlDiagStatus === 'success' && (
                                <>
                                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
                                        <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                                    </div>
                                    <h4 className="font-bold text-green-700 dark:text-green-400 mb-1">Connection Confirmed</h4>
                                    <p className="text-green-600 dark:text-green-300 text-xs mb-4">{mysqlDiagMessage}</p>
                                    <Button variant="secondary" onClick={() => setMysqlDiagStatus('idle')} size="sm">Run Again</Button>
                                </>
                            )}

                            {mysqlDiagStatus === 'error' && (
                                <>
                                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
                                        <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
                                    </div>
                                    <h4 className="font-bold text-red-700 dark:text-red-400 mb-1">Connection Failed</h4>
                                    <p className="text-red-600 dark:text-red-300 text-xs mb-4">{mysqlDiagMessage}</p>
                                    <Button variant="secondary" onClick={() => setMysqlDiagStatus('idle')} size="sm">Try Again</Button>
                                </>
                            )}
                        </>
                    )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Quick Actions</h4>
                        <div className="space-y-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => window.location.href = '#/users'}
                                className="w-full justify-start"
                                icon={<Users size={16} />}
                            >
                                Manage Users
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => window.location.href = '#/roles'}
                                className="w-full justify-start"
                                icon={<Shield size={16} />}
                            >
                                Manage Roles
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Firestore Rules Help */}
                {diagStatus === 'error' && diagMessage.includes('Permission') && (
                     <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800 text-left">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-xs uppercase mb-2">
                            <ShieldAlert size={14} /> Critical Fix Required
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                            Go to <strong>Firebase Console &gt; Firestore Database &gt; Rules</strong> and paste this rule to allow access for testing:
                        </p>
                        <pre className="bg-gray-800 dark:bg-black text-gray-100 p-2 rounded text-[10px] overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 1, 1);
    }
  }
}`}
                        </pre>
                     </div>
                )}
            </div>
        </div>
      </div>
      <FirebaseSetupGuide isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      <RecaptchaSetupGuide isOpen={isRecaptchaTutorialOpen} onClose={() => setIsRecaptchaTutorialOpen(false)} />
      
      {/* Configuration Password Modal */}
      <Modal isOpen={passwordModalOpen} onClose={() => {
        // Only clear input fields and errors, but keep security state (failed attempts, require2FA)
        setPasswordModalOpen(false);
        setConfigPassword('');
        setConfig2FAToken('');
        setConfigPasswordError('');
        setConfig2FAError('');
        setPendingConfigAction(null);
      }} title={require2FA ? "Enter 2FA Code" : "Enter Configuration Password"} size="md">
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {require2FA 
                ? "Too many failed password attempts. Please enter your 2FA code to continue."
                : pendingConfigAction === 'save-config'
                  ? "Enter your configuration password to save the current settings."
                  : "Enter your configuration password to edit configuration settings."
              }
            </p>
          </div>

          {/* Show lockout message if locked out */}
          {lockoutUntil && Date.now() < lockoutUntil && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded relative flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <div className="flex-1">
                <span className="font-medium">Too many failed attempts. Account temporarily locked.</span>
                <p className="text-sm mt-1">
                  Please wait <strong>{Math.ceil(remainingTime / 1000 / 60)}</strong> minute(s) and <strong>{Math.ceil((remainingTime / 1000) % 60)}</strong> second(s) before trying again.
                  {!twoFactorEnabled && ' Or enable 2FA in Profile page for additional security.'}
                </p>
              </div>
            </div>
          )}

          {/* Show error if 2FA is required but not enabled */}
          {require2FA && !twoFactorEnabled && !lockoutUntil && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">2FA is not enabled. Please wait a few minutes before trying again, or enable 2FA in Profile page for additional security.</span>
                  </div>
          )}

          {!require2FA && (!lockoutUntil || Date.now() >= lockoutUntil) ? (
            <>
              {configPasswordError && !lockoutUntil && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{configPasswordError}</span>
                </div>
              )}

              <div>
                <Input
                  label="Configuration Password"
                  type="password"
                  placeholder="Enter password"
                  value={configPassword}
                  onChange={(e) => {
                    setConfigPassword(e.target.value);
                    setConfigPasswordError('');
                  }}
                  required
                  autoFocus
                  disabled={lockoutUntil !== null && Date.now() < lockoutUntil}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This password is set in the server's .env file (CONFIG_PASSWORD)
                </p>
              </div>
            </>
          ) : require2FA && !twoFactorEnabled ? (
            <>
              {/* Show message if 2FA is required but not enabled */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Too many failed password attempts. 2FA is not enabled in your Profile page. 
                  Please wait a few minutes before trying again, or enable 2FA for additional security.
                </p>
              </div>
            </>
          ) : (
            <>
              {config2FAError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{config2FAError}</span>
                </div>
              )}

              <div>
                <Input
                  label="2FA Code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={config2FAToken}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setConfig2FAToken(value);
                    setConfig2FAError('');
                  }}
                  maxLength={6}
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                // Only clear input fields and errors, but keep security state (failed attempts, require2FA)
                setPasswordModalOpen(false);
                setConfigPassword('');
                setConfig2FAToken('');
                setConfigPasswordError('');
                setConfig2FAError('');
                setPendingConfigAction(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyPassword}
              disabled={
                (lockoutUntil !== null && Date.now() < lockoutUntil) ||
                (require2FA ? (config2FAToken.length !== 6 || !twoFactorEnabled) : !configPassword)
              }
              className="flex-1"
            >
              Verify
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SystemConfig;
