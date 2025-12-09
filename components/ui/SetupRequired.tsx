import React from 'react';
import { Settings, AlertTriangle } from 'lucide-react';
import Button from './Button';

const SetupRequired: React.FC = () => {
  const handleGoToSettings = () => {
    // Since we are using HashRouter and we can't navigate outside of it,
    // we can use a direct window location change.
    window.location.hash = '#/settings';
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md mx-auto">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          Configuration Required
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          The application requires Firebase to be configured for authentication and data storage. Please go to the settings page to complete the setup.
        </p>
        <div className="mt-6">
          <Button onClick={handleGoToSettings} icon={<Settings size={16}/>}>
            Go to Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupRequired;
