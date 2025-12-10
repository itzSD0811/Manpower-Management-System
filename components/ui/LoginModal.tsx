import React, { useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useAuth } from '../../context/AuthContext';
import Button from './Button';
import { LogIn, Eye, EyeOff, Lock, Mail, AlertCircle, Shield, Key } from 'lucide-react';
import { Logo } from '../Logo';
import * as twoFactorService from '../../services/twoFactorService';
import * as user2FAService from '../../services/user2FAService';
import * as recaptchaService from '../../services/recaptchaService';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';

const LoginModal: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [skip2FACheck, setSkip2FACheck] = useState(false); // Flag to skip 2FA check after verification
  const { login } = useAuth();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // If user is already authenticated, don't proceed
    // Also check if we're in the middle of a 2FA verification flow
    if (auth?.currentUser && !show2FA) {
      setIsLoading(false);
      return;
    }
    
    // If we're showing 2FA screen, don't allow regular login
    if (show2FA) {
      setIsLoading(false);
      return;
    }

    // Clear any stale skip flags at the start of a new login attempt
    // This ensures we always check 2FA for a fresh login
    if (!show2FA && !skip2FACheck) {
      sessionStorage.removeItem('skip_2fa_check');
      setSkip2FACheck(false);
    }

    setIsLoading(true);
    try {
      // Skip 2FA check if we're already past the 2FA verification step
      // Check both state and sessionStorage to handle re-renders
      // MUST check this BEFORE calling login() to prevent loop
      const shouldSkip2FA = skip2FACheck || sessionStorage.getItem('skip_2fa_check') === 'true';
      
      if (shouldSkip2FA) {
        // This is a post-2FA login, just sign in and return
        // Verify reCAPTCHA if available
        if (executeRecaptcha) {
          try {
            const recaptchaToken = await executeRecaptcha('login');
            await recaptchaService.verifyRecaptcha(recaptchaToken);
          } catch (recaptchaError) {
            console.warn('reCAPTCHA verification failed:', recaptchaError);
          }
        }
        
        await login(email, password);
        
        // Wait a bit for auth state to update
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Clear checking_2fa flag since we're past 2FA
        sessionStorage.removeItem('checking_2fa');
        
        // Reset the flags
        setSkip2FACheck(false);
        sessionStorage.removeItem('skip_2fa_check');
        
        // Save email to localStorage if remember me is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // Clear password for security
        setPassword('');
        
        // Login is complete, AuthContext will handle the rest
        setIsLoading(false);
        return;
      }

      // Verify reCAPTCHA if available
      if (executeRecaptcha) {
        try {
          const recaptchaToken = await executeRecaptcha('login');
          // Verify token on backend
          await recaptchaService.verifyRecaptcha(recaptchaToken);
        } catch (recaptchaError) {
          console.warn('reCAPTCHA verification failed:', recaptchaError);
          // In production, you might want to block login if reCAPTCHA fails
          // For now, we'll allow login to continue (useful for development/testing)
        }
      }

      // First, sign in to get the user ID
      // Use a flag to track if we're checking 2FA to prevent auth state from showing app
      sessionStorage.setItem('checking_2fa', 'true');
      
      await login(email, password);
      
      // Get the user ID from auth IMMEDIATELY after sign in
      if (!auth || !auth.currentUser) {
        sessionStorage.removeItem('checking_2fa');
        throw new Error('Failed to authenticate user');
      }
      
      const userId = auth.currentUser.uid;
      
      // Check if this user has 2FA enabled - do this IMMEDIATELY
      let requires2FA = false;
      try {
        console.log('[Login] Checking 2FA status for user:', userId);
        const twoFactorStatus = await user2FAService.getUser2FAStatus(userId);
        console.log('[Login] 2FA status result:', twoFactorStatus);
        requires2FA = twoFactorStatus.enabled;
        console.log('[Login] 2FA required:', requires2FA);
      } catch (twoFactorError: any) {
        // If 2FA check fails, log the error but continue with normal login
        console.error('[Login] Failed to check 2FA status:', twoFactorError);
        console.error('[Login] Error details:', twoFactorError.message, twoFactorError.stack);
        // Don't block login if 2FA check fails - assume 2FA is not enabled
        requires2FA = false;
      }

      // If 2FA is required, sign out and show 2FA verification
      if (requires2FA) {
        console.log('[Login] 2FA is required, signing out and showing 2FA screen');
        // Sign out immediately to prevent session establishment
        await signOut(auth);
        // Store user ID and credentials for 2FA verification
        setPendingUserId(userId);
        setShow2FA(true);
        sessionStorage.setItem('checking_2fa', 'true'); // Keep flag set during 2FA
        setIsLoading(false);
        // Don't proceed - wait for 2FA verification
        return;
      } else {
        console.log('[Login] 2FA is not required, proceeding with normal login');
        // Clear the checking flag since 2FA is not required
        sessionStorage.removeItem('checking_2fa');
      }

      // Save email to localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to log in. Please check your credentials.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    
    if (!pendingUserId) {
      setTwoFactorError('Session expired. Please try logging in again.');
      setShow2FA(false);
      setPendingUserId(null);
      return;
    }

    const code = twoFactorCode.trim();
    
    if (!code) {
      setTwoFactorError(useBackupCode ? 'Please enter a backup code' : 'Please enter a valid 6-digit code');
      return;
    }

    if (!useBackupCode && code.length !== 6) {
      setTwoFactorError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      // Verify reCAPTCHA if available
      if (executeRecaptcha) {
        try {
          const recaptchaToken = await executeRecaptcha('login_2fa');
          // Verify token on backend
          await recaptchaService.verifyRecaptcha(recaptchaToken);
        } catch (recaptchaError) {
          console.warn('reCAPTCHA verification failed:', recaptchaError);
          // In production, you might want to block login if reCAPTCHA fails
        }
      }

      // Verify 2FA code or backup code
      let verified = false;
      if (useBackupCode) {
        const result = await user2FAService.verifyUserBackupCode(pendingUserId, code);
        verified = result.success;
        if (!verified) {
          throw new Error(result.message || 'Invalid backup code');
        }
      } else {
        const result = await user2FAService.verifyUser2FA(pendingUserId, code);
        verified = result.success;
        if (!verified) {
          throw new Error(result.message || 'Invalid verification code');
        }
      }
      
      // 2FA/Backup code verified successfully, now proceed with login
      // Clear 2FA state first
      setShow2FA(false);
      setTwoFactorCode('');
      const savedEmail = email;
      const savedPassword = password;
      const savedRememberMe = rememberMe;
      setPendingUserId(null);
      setUseBackupCode(false);
      
      // Now sign in directly - bypass handleLogin to avoid loop
      try {
        // Sign in directly using Firebase auth (bypass handleLogin)
        if (!auth) {
          throw new Error('Firebase auth is not available');
        }
        
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
        
        console.log('[2FA] User signed in successfully, reloading page...');
        
        // Save email to localStorage if remember me is checked
        if (savedRememberMe) {
          localStorage.setItem('rememberedEmail', savedEmail);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // Clear all flags before reload
        sessionStorage.removeItem('checking_2fa');
        sessionStorage.removeItem('skip_2fa_check');
        setSkip2FACheck(false);
        
        // Clear password for security
        setPassword('');
        
        // Reload the page to ensure auth state is properly initialized
        // This is the simplest and most reliable way to ensure everything is in sync
        window.location.reload();
      } catch (loginError: any) {
        // If login fails, clear flags and show error
        sessionStorage.removeItem('checking_2fa');
        sessionStorage.removeItem('skip_2fa_check');
        setSkip2FACheck(false);
        setTwoFactorError(loginError.message || 'Failed to complete login. Please try again.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setTwoFactorError(err.message || (useBackupCode ? 'Invalid backup code. Please try again.' : 'Invalid verification code. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered email on mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail && rememberedEmail.trim() !== '') {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex justify-center items-center z-50 p-4">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all duration-300">
        {/* Decorative top accent */}
        <div className="h-2 bg-gradient-to-r from-dns-red via-red-600 to-dns-red"></div>
        
        <div className="p-8 sm:p-10">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo className="h-16 text-gray-900 dark:text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3 transition-all duration-300">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Login Failed</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* 2FA Verification Step */}
          {show2FA ? (
            <form onSubmit={handle2FAVerification} className="space-y-5">
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Two-Factor Authentication Required</p>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {useBackupCode 
                    ? 'Enter one of your backup codes to sign in.'
                    : 'Please enter the 6-digit code from your Google Authenticator app.'}
                </p>
              </div>

              {twoFactorError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Verification Failed</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{twoFactorError}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {useBackupCode ? 'Backup Code' : 'Verification Code'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => {
                      if (useBackupCode) {
                        // For backup codes, allow alphanumeric, uppercase, max 8 chars
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                        setTwoFactorCode(value);
                      } else {
                        // For 2FA codes, only digits, max 6 chars
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setTwoFactorCode(value);
                      }
                      setTwoFactorError('');
                    }}
                    className={`block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dns-red focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 ${
                      useBackupCode 
                        ? 'text-center text-lg font-mono tracking-wider' 
                        : 'text-center text-2xl font-mono tracking-widest'
                    }`}
                    placeholder={useBackupCode ? 'ABCD1234' : '000000'}
                    required
                    maxLength={useBackupCode ? 8 : 6}
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  {useBackupCode 
                    ? 'Enter one of your 8-character backup codes'
                    : 'Enter the 6-digit code from Google Authenticator'}
                </p>
              </div>

              {/* Toggle between 2FA code and backup code */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setTwoFactorCode('');
                    setTwoFactorError('');
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                >
                  {useBackupCode ? 'Use 2FA code instead' : 'Use backup code instead'}
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShow2FA(false);
                    setTwoFactorCode('');
                    setTwoFactorError('');
                    setUseBackupCode(false);
                    setPendingUserId(null);
                    setPassword(''); // Clear password for security
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading || (useBackupCode ? twoFactorCode.length < 8 : twoFactorCode.length !== 6)}
                  icon={<Key size={18} />}
                  className="flex-1"
                >
                  Verify
                </Button>
              </div>
            </form>
          ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dns-red focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dns-red focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRememberMe(checked);
                    // If unchecked, clear the remembered email immediately
                    if (!checked) {
                      localStorage.removeItem('rememberedEmail');
                    }
                  }}
                  className="h-4 w-4 text-dns-red focus:ring-dns-red border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
                isLoading={isLoading} 
                disabled={isLoading}
                icon={<LogIn size={18} />}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Your data is securely encrypted</span>
            </div>
          </div>
        </div>

        {/* Bottom decorative accent */}
        <div className="h-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
      </div>
    </div>
  );
};

export default LoginModal;
