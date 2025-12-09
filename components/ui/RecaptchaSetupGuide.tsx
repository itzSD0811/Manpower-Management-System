import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { HelpCircle, ChevronLeft, ChevronRight, CheckCircle, Shield, Globe, Key, Copy } from 'lucide-react';

interface RecaptchaSetupGuideProps {
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
        icon: Globe,
        title: 'Create a reCAPTCHA Site',
        content: () => (
            <>
                <p className="mb-4 text-gray-800 dark:text-gray-200">First, you need to register your site with Google reCAPTCHA.</p>
                <ol className="list-inside space-y-3">
                    <StepBlock>Go to the <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google reCAPTCHA Admin Console</a> and sign in with your Google account.</StepBlock>
                    <StepBlock>Click the <strong>"+"</strong> button to add a new site.</StepBlock>
                    <StepBlock>Enter a label for your site (e.g., "DNS Manpower Manager").</StepBlock>
                    <StepBlock>Select <strong>"reCAPTCHA v3"</strong> as the reCAPTCHA type. This version works invisibly in the background.</StepBlock>
                    <StepBlock>Add your domain(s). For local development, you can use <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">localhost</code> or <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">127.0.0.1</code>. For production, add your actual domain.</StepBlock>
                    <StepBlock>Accept the reCAPTCHA Terms of Service and click <strong>"Submit"</strong>.</StepBlock>
                </ol>
            </>
        )
    },
    {
        icon: Key,
        title: 'Get Your Keys',
        content: () => (
            <>
                <p className="mb-4 text-gray-800 dark:text-gray-200">After creating your site, Google will provide you with two keys that you need to configure.</p>
                <ol className="list-inside space-y-3">
                    <StepBlock>Once your site is created, you'll see a page with your <strong>Site Key</strong> and <strong>Secret Key</strong>.</StepBlock>
                    <StepBlock>
                        <p className="text-gray-800 dark:text-gray-200 mb-2">The <strong>Site Key</strong> is public and will be used in your frontend application. It's safe to expose this key.</p>
                        <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-xs">
                            <p className="font-mono text-gray-500">// Site Key (Public - Safe to expose)</p>
                            <p className="font-mono text-gray-800 dark:text-gray-200">Site Key: <span className="text-green-600">6Lc...</span></p>
                        </div>
                    </StepBlock>
                    <StepBlock>
                        <p className="text-gray-800 dark:text-gray-200 mb-2">The <strong>Secret Key</strong> is private and must be kept secure. It will be used on your backend server.</p>
                        <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-xs">
                            <p className="font-mono text-gray-500">// Secret Key (Private - Keep secure!)</p>
                            <p className="font-mono text-gray-800 dark:text-gray-200">Secret Key: <span className="text-red-600">6Lc...</span></p>
                        </div>
                    </StepBlock>
                    <StepBlock className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-4">
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">⚠️ Important: Keep your Secret Key secure!</p>
                        <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">Never commit your Secret Key to version control or expose it in client-side code.</p>
                    </StepBlock>
                </ol>
            </>
        )
    },
    {
        icon: Shield,
        title: 'Configure in Application',
        content: () => (
            <>
                <p className="mb-4 text-gray-800 dark:text-gray-200">Now you need to add your keys to the application configuration.</p>
                <ol className="list-inside space-y-3">
                    <StepBlock>In the System Configuration page, scroll to the <strong>"Setup Google reCAPTCHA"</strong> section.</StepBlock>
                    <StepBlock>Paste your <strong>Site Key</strong> into the "Site Key" field. This key will be used by the frontend to generate reCAPTCHA tokens.</StepBlock>
                    <StepBlock>Paste your <strong>Secret Key</strong> into the "Secret Key" field. This key will be used by the backend to verify reCAPTCHA tokens.</StepBlock>
                    <StepBlock>Click <strong>"Save Configuration"</strong> to save your settings.</StepBlock>
                    <StepBlock>After saving, the reCAPTCHA protection will be automatically enabled for the login page.</StepBlock>
                    <StepBlock className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
                        <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">💡 Tip: Testing reCAPTCHA</p>
                        <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">reCAPTCHA v3 works invisibly in the background. You won't see a checkbox, but the system will automatically verify users during login attempts.</p>
                    </StepBlock>
                </ol>
            </>
        )
    }
];

const RecaptchaSetupGuide: React.FC<RecaptchaSetupGuideProps> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const goToNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    const goToPrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const CurrentStepIcon = steps[currentStep].icon;
    const CurrentStepContent = steps[currentStep].content;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Google reCAPTCHA Setup Guide" size="2xl">
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

export default RecaptchaSetupGuide;

