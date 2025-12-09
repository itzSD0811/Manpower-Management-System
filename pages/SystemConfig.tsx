
import React, { useState, useEffect, useRef } from 'react';
import { Flame, CheckCircle, Server, Activity, AlertTriangle, ShieldAlert, LogOut, Database, HelpCircle, Download, Upload, Shield, QrCode, Key, X } from 'lucide-react';
import * as firebase from '../services/firebaseDataService';
import * as mysql from '../services/mysqlDataService';
import { saveConfig, loadConfig, loadConfigSync, AppConfig } from '../services/configService';
import { MysqlConfig, FirebaseConfig } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import FirebaseSetupGuide from '../components/ui/FirebaseSetupGuide';
import * as twoFactorService from '../services/twoFactorService';
import Modal from '../components/ui/Modal';

const SystemConfig: React.FC = () => {
  const { logout } = useAuth();
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

  // UI State
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Diagnostics State
  const [diagStatus, setDiagStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [diagMessage, setDiagMessage] = useState('');
  const [mysqlDiagStatus, setMysqlDiagStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [mysqlDiagMessage, setMysqlDiagMessage] = useState('');

  // Restore State
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [restoreMessage, setRestoreMessage] = useState('');

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ qrCode: string; secret: string; manualEntryKey: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');


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
      }
    };
    loadConfigData();
    load2FAStatus();
  }, []);

  // Load 2FA status
  const load2FAStatus = async () => {
    try {
      const status = await twoFactorService.get2FAStatus();
      setTwoFactorEnabled(status.enabled);
    } catch (error) {
      console.error('Failed to load 2FA status:', error);
    }
  };

  // Generate 2FA secret and show QR code
  const handleGenerate2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError('');
    setTwoFactorSuccess('');
    try {
      const result = await twoFactorService.generate2FASecret();
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
    if (!qrCodeData || !verificationCode) {
      setTwoFactorError('Please enter the verification code');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      await twoFactorService.enable2FA(qrCodeData.secret, verificationCode);
      setTwoFactorEnabled(true);
      setTwoFactorSuccess('Two-factor authentication enabled successfully!');
      setQrCodeModalOpen(false);
      setVerificationCode('');
      setQrCodeData(null);
      setTimeout(() => setTwoFactorSuccess(''), 5000);
    } catch (error: any) {
      setTwoFactorError(error.message || 'Failed to enable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Disable 2FA confirmation modal state
  const [disable2FAModalOpen, setDisable2FAModalOpen] = useState(false);

  // Disable 2FA
  const handleDisable2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError('');
    setTwoFactorSuccess('');
    try {
      await twoFactorService.disable2FA();
      setTwoFactorEnabled(false);
      setDisable2FAModalOpen(false);
      setTwoFactorSuccess('Two-factor authentication disabled successfully');
      setTimeout(() => setTwoFactorSuccess(''), 5000);
    } catch (error: any) {
      setTwoFactorError(error.message || 'Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    const newConfig: AppConfig = {
      dbType: dbSelection,
      mysqlConfig: mysqlConfig,
      firebaseConfig: firebaseConfig,
    };
    try {
      await saveConfig(newConfig);
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage external cloud database connection and user session.</p>
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
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Server className="text-blue-600 dark:text-blue-400" size={24} />
                          </div>
                          <div>
                              <h2 className="text-lg font-medium text-gray-900 dark:text-white">MySQL Configuration</h2>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Connection details for your MySQL server.</p>
                          </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <Input label="Host" placeholder="localhost" value={mysqlConfig.host || ''} onChange={(e) => setMysqlConfig({...mysqlConfig, host: e.target.value})} />
                        <Input label="Port" placeholder="3306" type="number" value={mysqlConfig.port || ''} onChange={(e) => setMysqlConfig({...mysqlConfig, port: Number(e.target.value)})} />
                        <Input label="Database" placeholder="dns_manpower" value={mysqlConfig.database || ''} onChange={(e) => setMysqlConfig({...mysqlConfig, database: e.target.value})} />
                        <Input label="User" placeholder="root" value={mysqlConfig.user || ''} onChange={(e) => setMysqlConfig({...mysqlConfig, user: e.target.value})} />
                        <Input label="Password" type="password" value={mysqlConfig.password || ''} onChange={(e) => setMysqlConfig({...mysqlConfig, password: e.target.value})} />
                        
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
                        <Button variant="secondary" size="sm" onClick={() => setIsTutorialOpen(true)} icon={<HelpCircle size={14} />}>
                          How to setup?
                        </Button>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <Input label="Project ID" placeholder="my-project-id" value={firebaseConfig.projectId || ''} onChange={(e) => setFirebaseConfig({...firebaseConfig, projectId: e.target.value})} />
                        <Input label="API Key" type="password" value={firebaseConfig.apiKey || ''} onChange={(e) => setFirebaseConfig({...firebaseConfig, apiKey: e.target.value})} />
                        <Input label="Auth Domain" placeholder="my-project.firebaseapp.com" value={firebaseConfig.authDomain || ''} onChange={(e) => setFirebaseConfig({...firebaseConfig, authDomain: e.target.value})} />
                        <Input label="Storage Bucket" placeholder="my-project.appspot.com" value={firebaseConfig.storageBucket || ''} onChange={(e) => setFirebaseConfig({...firebaseConfig, storageBucket: e.target.value})} />
                        <Input label="Messaging Sender ID" placeholder="1234567890" value={firebaseConfig.messagingSenderId || ''} onChange={(e) => setFirebaseConfig({...firebaseConfig, messagingSenderId: e.target.value})} />
                        <Input label="App ID" type="password" value={firebaseConfig.appId || ''} onChange={(e) => setFirebaseConfig({...firebaseConfig, appId: e.target.value})} />
                    </div>
                </div>
            )}

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
                </div>
            </div>

            {/* Logout Card */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Account Actions</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Log out from your current session.</p>
                    <Button onClick={handleLogout} variant="danger" icon={<LogOut size={16}/>}>
                        Logout
                    </Button>
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
                <div className="p-6 flex flex-col items-center text-center">
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
      <Modal isOpen={disable2FAModalOpen} onClose={() => setDisable2FAModalOpen(false)} title="Disable Two-Factor Authentication" size="md">
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Security Warning</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Are you sure you want to disable two-factor authentication? This will make your account less secure.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDisable2FAModalOpen(false)}
              disabled={twoFactorLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDisable2FA}
              isLoading={twoFactorLoading}
              disabled={twoFactorLoading}
              icon={<X size={16} />}
              className="flex-1"
            >
              Disable 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SystemConfig;
