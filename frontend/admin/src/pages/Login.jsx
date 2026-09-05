import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  Sparkles,
  XCircle
} from 'lucide-react';

import { validateEmailOrUsername, validatePassword, authenticateUser } from '../utils/validation';
import styles from './Login.module.css';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();

  // Mode State: 'signin' | 'signup'
  const [mode, setMode] = useState('signin');

  // Form Fields State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Interaction Touch Tracking
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // UI Interactive States
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  // Accessibility IDs
  const usernameId = useId();
  const passwordId = useId();
  const usernameErrorId = `${usernameId}-error`;
  const passwordErrorId = `${passwordId}-error`;

  // Real-time Validation
  const usernameResult = validateEmailOrUsername(username);
  const passwordResult = validatePassword(password);

  const isFormValid = usernameResult.isValid && passwordResult.isValid;
  const showUsernameError = usernameTouched && !usernameResult.isValid;
  const showPasswordError = passwordTouched && !passwordResult.isValid;

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setInfoMessage('Password reset instructions sent to your email address.');
    setTimeout(() => setInfoMessage(''), 4000);
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setAuthError('');
    setAuthSuccess(false);
  };

  const handleSocialClick = (provider) => {
    setIsLoading(true);
    setInfoMessage(`Authenticating with ${provider} SSO...`);
    setAuthError('');
    setAuthSuccess(false);

    setTimeout(() => {
      setIsLoading(false);
      const ssoUser = {
        username: `${provider.toLowerCase()}_user`,
        name: `${provider} User`,
        email: `user@${provider.toLowerCase()}.com`,
        role: 'customer'
      };

      setAuthSuccess(true);
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(ssoUser);
      }
      setTimeout(() => {
        navigate('/portal');
      }, 800);
    }, 1200);
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setUsernameTouched(true);
    setPasswordTouched(true);

    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setAuthError('');
    setAuthSuccess(false);

    // Simulate Network Auth Request & Automatic Role Detection
    setTimeout(() => {
      setIsLoading(false);
      
      const authResponse = authenticateUser({
        identifier: username,
        password: password
      });

      if (authResponse.success) {
        setAuthSuccess(true);
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(authResponse.user);
        }
        
        // Automatic redirection based on user's role
        setTimeout(() => {
          if (authResponse.user.role === 'admin') {
            navigate('/dashboard');
          } else {
            navigate('/portal');
          }
        }, 800);
      } else {
        setAuthError(authResponse.error || 'Invalid email or password.');
      }
    }, 1300);
  };

  return (
    <div className={styles.loginPage}>
      <motion.div 
        className={styles.cardContainer}
        initial={{ opacity: 0, y: 15, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {/* Left Side: Unified Form Section */}
        <div className={styles.leftPanel}>
          
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.brandRow}>
              <div className={styles.brandLogoMark}>DF</div>
              <span className={styles.brandName}>DealFlow360</span>
            </div>
            <h1 className={styles.title}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h1>
            <p className={styles.subtitle}>
              {mode === 'signin' 
                ? 'Enter your email address and password to access your account'
                : 'Create your DealFlow360 account to get started'
              }
            </p>
          </div>

          {/* Mode Switcher Tabs (Sign In / Sign Up) */}
          <div className={styles.modeTabs}>
            <button 
              type="button"
              className={`${styles.modeTab} ${mode === 'signin' ? styles.modeTabActive : ''}`}
              onClick={() => handleModeSwitch('signin')}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`${styles.modeTab} ${mode === 'signup' ? styles.modeTabActive : ''}`}
              onClick={() => handleModeSwitch('signup')}
            >
              Sign Up
            </button>
          </div>

          {/* Alert Notifications */}
          <AnimatePresence mode="wait">
            {authError && (
              <motion.div 
                key="auth-error"
                className={styles.authAlert}
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                role="alert"
              >
                <XCircle size={16} />
                <span>{authError}</span>
              </motion.div>
            )}

            {authSuccess && (
              <motion.div 
                key="auth-success"
                className={styles.successAlert}
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                role="status"
              >
                <CheckCircle2 size={16} />
                <span>Authentication successful! Redirecting...</span>
              </motion.div>
            )}

            {infoMessage && (
              <motion.div 
                key="info-msg"
                className={styles.successAlert}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                role="status"
              >
                <Sparkles size={15} />
                <span>{infoMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            
            {/* Email Address Field */}
            <div className={styles.fieldGroup}>
              <label htmlFor={usernameId} className={styles.label}>
                Email Address
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id={usernameId}
                  type="text"
                  className={`${styles.input} ${showUsernameError ? styles.inputError : ''}`}
                  placeholder="Enter your email address"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  onBlur={() => setUsernameTouched(true)}
                  disabled={isLoading}
                  autoComplete="username"
                  required
                  aria-invalid={showUsernameError}
                  aria-describedby={showUsernameError ? usernameErrorId : undefined}
                />
              </div>
              {showUsernameError && (
                <motion.div 
                  id={usernameErrorId} 
                  className={styles.errorMessage}
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                >
                  <AlertCircle size={13} />
                  <span>{usernameResult.error}</span>
                </motion.div>
              )}
            </div>

            {/* Password Field */}
            <div className={styles.fieldGroup}>
              <div className={styles.labelRow}>
                <label htmlFor={passwordId} className={styles.label}>
                  Password
                </label>
                {mode === 'signin' && (
                  <button 
                    type="button" 
                    className={styles.forgotLink}
                    onClick={handleForgotPassword}
                  >
                    Forgot?
                  </button>
                )}
              </div>

              <div className={styles.inputWrapper}>
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  className={`${styles.input} ${styles.inputHasRightIcon} ${showPasswordError ? styles.inputError : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  onBlur={() => setPasswordTouched(true)}
                  disabled={isLoading}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  aria-invalid={showPasswordError}
                  aria-describedby={showPasswordError ? passwordErrorId : undefined}
                />

                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {showPasswordError && (
                <motion.div 
                  id={passwordErrorId} 
                  className={styles.errorMessage}
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                >
                  <AlertCircle size={13} />
                  <span>{passwordResult.error}</span>
                </motion.div>
              )}
            </div>

            {/* Checkbox Row */}
            <div className={styles.checkboxRow}>
              <input 
                type="checkbox" 
                id="terms" 
                checked={agreeTerms} 
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <label htmlFor="terms">I agree to the terms & policy</label>
            </div>

            {/* Main Submit Button - Simply "Sign In" */}
            <motion.button
              type="submit"
              className={styles.submitBtn}
              disabled={!isFormValid || isLoading}
              whileHover={isFormValid && !isLoading ? { scale: 1.01 } : {}}
              whileTap={isFormValid && !isLoading ? { scale: 0.98 } : {}}
            >
              {isLoading ? (
                <>
                  <Loader2 className={styles.spinner} size={18} />
                  <span>{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>Or</span>
            <div className={styles.dividerLine} />
          </div>

          {/* Social Sign-in Buttons */}
          <div className={styles.socialRow}>
            <motion.button 
              type="button" 
              className={styles.socialBtn}
              onClick={() => handleSocialClick('Google')}
              disabled={isLoading}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg className={styles.socialIcon} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Sign in with Google</span>
            </motion.button>

            <motion.button 
              type="button" 
              className={styles.socialBtn}
              onClick={() => handleSocialClick('Apple')}
              disabled={isLoading}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="#000000">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.35c.67-.82 1.12-1.96.99-3.1-.97.04-2.14.65-2.83 1.46-.62.72-1.16 1.88-1.02 3 1.09.08 2.19-.54 2.86-1.36z"/>
              </svg>
              <span>Sign in with Apple</span>
            </motion.button>
          </div>

          {/* Footer Text */}
          <div className={styles.footerText}>
            {mode === 'signin' ? (
              <>Don't have an account? <button type="button" onClick={() => handleModeSwitch('signup')}>Sign Up</button></>
            ) : (
              <>Have an account? <button type="button" onClick={() => handleModeSwitch('signin')}>Sign In</button></>
            )}
          </div>

        </div>

        {/* Right Side: Lush Botanical Panel */}
        <div className={styles.rightPanel}>
          <img 
            src="/monstera.jpg" 
            alt="Lush Monstera Botanical" 
            className={styles.leafImage}
          />
          <div className={styles.rightPanelOverlay} />
          <div className={styles.brandOverlayText}>
            <h3>DealFlow360</h3>
            <p>Intelligent, self-governing sales operations platform.</p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
