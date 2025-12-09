import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const App: React.FC = () => {
  const { currentUser, loading, isFirebaseConfigured, dbType } = useAuth();

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
  return (
    <>
      {!currentUser ? <LoginModal /> : <AppRouter />}
    </>
  );
};

export default App;
