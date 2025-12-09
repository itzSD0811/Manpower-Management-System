import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { HelpCircle, ChevronLeft, ChevronRight, CheckCircle, Flame, Server, UserPlus, Database, Key, FileCode } from 'lucide-react';

interface FirebaseSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const StepBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="pl-6 relative pb-4 last:pb-0">
        <div className="absolute left-0 top-1 h-full w-px bg-gray-200 dark:bg-gray-700"></div>
        <div className="absolute left-[-8px] top-1.5 h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-gray-800"></div>
        <div className="text-sm text-gray-700 dark:text-gray-300">{children}</div>
    </li>
);

const steps = [
    {
        icon: Flame,
        title: 'Create Your Firebase Project',
        content: () => (
            <>
                <p className="mb-4 text-gray-800 dark:text-gray-200">First, you need a Firebase project to act as the backend for the application.</p>
                <ol className="list-inside space-y-3">
                    <StepBlock>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Firebase Console</a> and sign in.</StepBlock>
                    <StepBlock>Click <strong>"Add project"</strong> and give it a memorable name (e.g., "ManpowerApp").</StepBlock>
                    <StepBlock>Follow the on-screen steps. You can skip Google Analytics as it's not required.</StepBlock>
                </ol>
            </>
        )
    },
    {
        icon: FileCode,
        title: 'Get Web App Credentials',
        content: () => (
            <>
                <p className="mb-4 text-gray-800 dark:text-gray-200">Once the project is created, you need to register a web app to get the configuration keys.</p>
                <ol className="list-inside space-y-3">
                    <StepBlock>On your project's overview page, click the web icon <strong>{`</>`}</strong>.</StepBlock>
                    <StepBlock>Give your app a nickname and click <strong>"Register app"</strong>.</StepBlock>
                    <StepBlock>Firebase will display a code snippet with your configuration. Find the `firebaseConfig` object.</StepBlock>
                    <StepBlock>
                        <p className="text-gray-800 dark:text-gray-200">Copy each key (apiKey, authDomain, etc.) and paste it into the corresponding field in this application's System Configuration page.</p>
                        <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-xs">
                            <p className="font-mono text-gray-500">// Your web app's Firebase configuration</p>
                            <p className="font-mono text-gray-800 dark:text-gray-200">const firebaseConfig = {'{'}</p>
                            <p className="font-mono pl-4 text-red-500">apiKey: <span className="text-gray-400">"..."</span>,</p>
                            <p className="font-mono pl-4 text-red-500">authDomain: <span className="text-gray-400">"..."</span>,</p>
                            <p className="font-mono pl-4 text-red-500">projectId: <span className="text-gray-400">"..."</span>,</p>
                            <p className="font-mono pl-4 text-red-500">...</p>
                            <p className="font-mono text-gray-800 dark:text-gray-200">{'}'};</p>
                        </div>
                    </StepBlock>
                </ol>
            </>
        )
    },
    {
        icon: UserPlus,
        title: 'Enable Authentication',
        content: () => (
             <>
                <p className="mb-4 text-gray-800 dark:text-gray-200">To handle user logins, you must enable the Email/Password sign-in method.</p>
                <ol className="list-inside space-y-3">
                    <StepBlock>In the Firebase sidebar, go to <strong>Build &gt; Authentication</strong>.</StepBlock>
                    <StepBlock>Click <strong>"Get started"</strong>, then select <strong>"Email/Password"</strong> from the providers list.</StepBlock>
                    <StepBlock><strong>Enable</strong> the provider and click <strong>"Save"</strong>.</StepBlock>
                    <StepBlock>Go to the <strong>"Users"</strong> tab and click <strong>"Add user"</strong>. This will be your login account for this application.</StepBlock>
                </ol>
            </>
        )
    },
    {
        icon: Database,
        title: 'Set Up Firestore Database',
        content: () => (
            <>
                <p className="mb-4 text-gray-800 dark:text-gray-200">Firestore will store all your application data. It needs to be created and its security rules updated.</p>
                <ol className="list-inside space-y-3">
                    <StepBlock>In the Firebase sidebar, go to <strong>Build &gt; Firestore Database</strong>.</StepBlock>
                    <StepBlock>Click <strong>"Create database"</strong> and start in <strong>Production mode</strong> for security.</StepBlock>
                    <StepBlock>Choose a location for your data (this can't be changed later).</StepBlock>
                    <StepBlock>Once created, go to the <strong>"Rules"</strong> tab.</StepBlock>
                    <StepBlock>
                        <p className="text-gray-800 dark:text-gray-200">Replace the default rules with the following code to ensure only logged-in users can access data:</p>
                        <pre className="w-full mt-2 p-3 text-xs bg-gray-100 dark:bg-gray-900 rounded-md overflow-x-auto text-gray-800 dark:text-gray-200">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
                        </pre>
                    </StepBlock>
                     <StepBlock>Click <strong>"Publish"</strong> to save the new rules.</StepBlock>
                </ol>
            </>
        )
    }
];

const FirebaseSetupGuide: React.FC<FirebaseSetupGuideProps> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const goToNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    const goToPrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const CurrentStepIcon = steps[currentStep].icon;
    const CurrentStepContent = steps[currentStep].content;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Firebase Setup Guide" size="2xl">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <div className="md:w-1/3 border-r border-gray-200 dark:border-gray-700 pr-6">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-4">Setup Steps</h3>
                    <nav>
                        <ul className="space-y-2">
                            {steps.map((step, index) => (
                                <li key={index}>
                                    <button 
                                        onClick={() => setCurrentStep(index)}
                                        className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${currentStep === index ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                                    >
                                        <div className={`p-1.5 rounded-full ${currentStep === index ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                            <step.icon size={16} />
                                        </div>
                                        <span className="font-medium text-sm">{step.title}</span>
                                        {currentStep > index && <CheckCircle size={16} className="ml-auto text-green-500" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* Content */}
                <div className="md:w-2/3">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                           <CurrentStepIcon className="text-gray-700 dark:text-gray-300" size={24}/>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Step {currentStep + 1} of {steps.length}</p>
                            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200">{steps[currentStep].title}</h3>
                        </div>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                       <CurrentStepContent />
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <Button variant="secondary" onClick={goToPrev} disabled={currentStep === 0} icon={<ChevronLeft size={16}/>}>
                            Previous
                        </Button>
                        {currentStep < steps.length - 1 ? (
                            <Button onClick={goToNext} icon={<ChevronRight size={16}/>}>
                                Next
                            </Button>
                        ) : (
                            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white" icon={<CheckCircle size={16}/>}>
                                Finish
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default FirebaseSetupGuide;
