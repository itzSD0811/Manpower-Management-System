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
import Prepayments from './pages/Prepayments';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import RolesManagement from './pages/RolesManagement';
import PermissionGuard from './components/PermissionGuard';
import { useAuth } from './context/AuthContext';
import LoginModal from './components/ui/LoginModal';
import SetupRequired from './components/ui/SetupRequired';
import LoadingScreen from './components/ui/LoadingScreen';
import { loadConfig, loadConfigSync } from './services/configService';

const App: React.FC = () => {
  const { currentUser, loading, isFirebaseConfigured, dbType } = useAuth();
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState<string>('');
  const [configLoading, setConfigLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(true);
  const [startTime] = useState(Date.now());

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
      } finally {
        setConfigLoading(false);
      }
    };
    loadRecaptchaConfig();
  }, []);

  // Ensure loading screen shows for minimum 3 seconds
  useEffect(() => {
    const checkLoading = () => {
      const elapsed = Date.now() - startTime;
      const minDisplayTime = 3000; // 3 seconds

      if (!loading && !configLoading) {
        // Both loading states are complete
        if (elapsed >= minDisplayTime) {
          // Minimum time has passed, hide loading screen
          setShowLoading(false);
        } else {
          // Wait for remaining time
          const remainingTime = minDisplayTime - elapsed;
          setTimeout(() => {
            setShowLoading(false);
          }, remainingTime);
        }
      }
    };

    checkLoading();
  }, [loading, configLoading, startTime]);

  if (showLoading) {
    return <LoadingScreen message="Initializing Application..." />;
  }

  const AppRouter = () => (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/profile" replace />} />
          <Route path="dashboard" element={<PermissionGuard pageId="dashboard"><Dashboard /></PermissionGuard>} />
          <Route path="profile" element={<PermissionGuard pageId="profile"><Profile /></PermissionGuard>} />
          <Route path="employees" element={<PermissionGuard pageId="employees"><EmployeeManagement /></PermissionGuard>} />
          <Route path="attendance" element={<PermissionGuard pageId="attendance"><Attendance /></PermissionGuard>} />
          <Route path="prepayments" element={<PermissionGuard pageId="prepayments"><Prepayments /></PermissionGuard>} />
          <Route path="sections" element={<PermissionGuard pageId="sections"><SectionManagement /></PermissionGuard>} />
          <Route path="groups" element={<PermissionGuard pageId="groups"><GroupManagement /></PermissionGuard>} />
          <Route path="files" element={<PermissionGuard pageId="files"><GenerateFiles /></PermissionGuard>} />
          <Route path="settings" element={<PermissionGuard pageId="settings"><SystemConfig /></PermissionGuard>} />
          <Route path="users" element={<PermissionGuard pageId="settings" requireEdit><UserManagement /></PermissionGuard>} />
          <Route path="roles" element={<PermissionGuard pageId="settings" requireEdit><RolesManagement /></PermissionGuard>} />
          <Route path="*" element={<Navigate to="/profile" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );

  // Firebase is ALWAYS required for authentication, regardless of dbType (MySQL or Firebase)
  // dbType only affects data storage, not authentication
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

  // Firebase is configured, check for user authentication
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
