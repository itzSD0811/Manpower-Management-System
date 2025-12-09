import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import SectionManagement from './pages/SectionManagement';
import GroupManagement from './pages/GroupManagement';
import SystemConfig from './pages/SystemConfig';
import GenerateFiles from './pages/GenerateFiles';
import Attendance from './pages/Attendance';
import { useAuth } from './context/AuthContext';
import LoginModal from './components/ui/LoginModal';
import SetupRequired from './components/ui/SetupRequired';
import { loadConfig, loadConfigSync } from './services/configService';

const App: React.FC = () => {
  const { currentUser, loading, isFirebaseConfigured, dbType } = useAuth();
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState<string>('');

  useEffect(() => {
    const loadRecaptchaConfig = async () => {
      try {
        const config = await loadConfig();
        // Only use site key if reCAPTCHA is enabled
        if (config.recaptchaConfig?.enabled && config.recaptchaConfig?.siteKey) {
          setRecaptchaSiteKey(config.recaptchaConfig.siteKey);
        } else {
          setRecaptchaSiteKey('');
        }
      } catch (error) {
        console.warn('Failed to load reCAPTCHA config from API, using fallback:', error);
        const config = loadConfigSync();
        // Only use site key if reCAPTCHA is enabled
        if (config.recaptchaConfig?.enabled && config.recaptchaConfig?.siteKey) {
          setRecaptchaSiteKey(config.recaptchaConfig.siteKey);
        } else {
          setRecaptchaSiteKey('');
        }
      }
    };
    loadRecaptchaConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading Application...</div>
      </div>
    );
  }

  const AppRouter = () => (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<EmployeeManagement />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="sections" element={<SectionManagement />} />
          <Route path="groups" element={<GroupManagement />} />
          <Route path="files" element={<GenerateFiles />} />
          <Route path="settings" element={<SystemConfig />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );

  if (dbType === 'mysql') {
    return <AppRouter />;
  }

  // dbType is 'firebase'
  if (!isFirebaseConfigured) {
      // Allow access only to settings page to configure firebase
      return (
          <HashRouter>
              <Routes>
                  <Route path="/settings" element={<SystemConfig />} />
                  <Route path="*" element={<SetupRequired />} />
              </Routes>
          </HashRouter>
      );
  }

  // Firebase is configured, check for user
  // Use site key from config, fallback to environment variable for backward compatibility
  const siteKey = recaptchaSiteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
  
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
        nonce: undefined
      }}
    >
      {!currentUser ? <LoginModal /> : <AppRouter />}
    </GoogleReCaptchaProvider>
  );
};

export default App;
