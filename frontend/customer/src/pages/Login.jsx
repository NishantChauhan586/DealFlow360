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

import { validateEmailOrUsername, validatePassword } from '../utils/validation';
import { registerCustomerAccount, loginCustomerAccount } from '../utils/userStore';
import styles from './Login.module.css';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();

  // Mode State: 'signin' | 'signup'
  const [mode, setMode] = useState('signin');

  // Form Fields State
  const [fullName, setFullName] = useState('');
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

  // Submit Handler connected to persistent database store
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUsernameTouched(true);
    setPasswordTouched(true);

    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setAuthError('');
    setAuthSuccess(false);

    try {
      if (mode === 'signup') {
        const regRes = await registerCustomerAccount({
          email: username,
          password: password,
          full_name: fullName || username.split('@')[0],
        });

        setIsLoading(false);
        if (regRes.success) {
          setAuthSuccess(true);
          setInfoMessage('Account created and saved to database!');
          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess(regRes.user);
          }
          setTimeout(() => {
            navigate('/portal');
          }, 800);
        } else {
          setAuthError(regRes.error || 'Failed to create account.');
        }
      } else {
        const loginRes = await loginCustomerAccount({
          email: username,
          password: password,
        });

        setIsLoading(false);
        if (loginRes.success) {
          setAuthSuccess(true);
          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess(loginRes.user);
          }
          setTimeout(() => {
            navigate('/portal');
          }, 800);
        } else {
          setAuthError(loginRes.error || 'Invalid email or password.');
        }
      }
    } catch (err) {
      setIsLoading(false);
      setAuthError('Authentication error. Please try again.');
    }
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
              <img
                src="/meridian-logo.svg"
                alt="Meridian"
                className={styles.brandLogoMark}
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
              />
              <span className={styles.brandName}>Meridian</span>
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

          {/* Quick Demo Access Bar */}
          <div style={{
            background: 'var(--paper-2, #EAF0EE)',
            border: '1px solid var(--line, rgba(8,32,26,0.12))',
            borderRadius: '6px',
            padding: '10px 12px',
            marginBottom: '16px',
            fontSize: '12px',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--burnham, #00221C)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>One-Click Role Demo Credentials:</span>
              <span style={{ fontSize: '10px', color: 'var(--viridian, #438A7E)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>1 Role Ready</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>

              <button
                type="button"
                onClick={() => {
                  setUsername('customer@dealflow360.com');
                  setPassword('customer123');
                  setUsernameTouched(true);
                  setPasswordTouched(true);
                  setAuthError('');
                }}
                style={{
                  background: 'var(--viridian, #438A7E)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                👤 Customer
              </button>
            </div>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            
            {/* Full Name Field (Sign Up mode only) */}
            {mode === 'signup' && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Full Name / Company Name
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Enter your full name or company"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            )}

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
            <div className={styles.brandOverlayLogoWrap}>
              <img src="/meridian-logo.svg" alt="Meridian" style={{ width: 64, height: 64, borderRadius: '50%', marginBottom: 12, display: 'block' }} />
            </div>
            <h3>Meridian</h3>
            <p>Intelligent, self-governing sales operations platform.</p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
