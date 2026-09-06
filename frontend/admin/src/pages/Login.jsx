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
  const [token, setToken] = useState('');
  const [fullName, setFullName] = useState('');

  // Interaction Touch Tracking
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [tokenTouched, setTokenTouched] = useState(false);

  // UI Interactive States
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  // Accessibility IDs
  const usernameId = useId();
  const tokenId = useId();
  const usernameErrorId = `${usernameId}-error`;
  const tokenErrorId = `${tokenId}-error`;

  // Real-time Validation
  const usernameResult = validateEmailOrUsername(username);
  
  // Basic validation for token/fullName depending on mode
  const isFormValid = mode === 'signin' 
    ? usernameResult.isValid && token.trim().length > 0 
    : usernameResult.isValid && fullName.trim().length > 0;

  const showUsernameError = usernameTouched && !usernameResult.isValid;
  const showTokenError = mode === 'signin' && tokenTouched && token.trim().length === 0;

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


  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setUsernameTouched(true);
    if (mode === 'signin') setTokenTouched(true);

    if (!isFormValid || isLoading) return;

    if (mode === 'signup') {
      // Handle Registration Request
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        try {
          const stored = localStorage.getItem('dealflow_pending_registrations');
          const requests = stored ? JSON.parse(stored) : [];
          requests.push({
            id: `REQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            name: fullName.trim(),
            email: username.trim(),
            status: 'pending',
            date: new Date().toISOString()
          });
          localStorage.setItem('dealflow_pending_registrations', JSON.stringify(requests));
          setAuthSuccess(true);
          setInfoMessage('Registration request sent to admin. Awaiting approval.');
          setTimeout(() => {
            setMode('signin');
            setFullName('');
            setUsername('');
            setAuthSuccess(false);
          }, 3000);
        } catch (err) {
          setAuthError('Failed to save request.');
        }
      }, 800);
      return;
    }

    setIsLoading(true);
    setAuthError('');
    setAuthSuccess(false);

    // Simulate Network Auth Request & Automatic Role Detection
    setTimeout(() => {
      setIsLoading(false);
      
      const authResponse = authenticateUser({
        identifier: username,
        token: token
      });

      if (authResponse.success) {
        setAuthSuccess(true);
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(authResponse.user);
        }
        
        setTimeout(() => {
          if (authResponse.user.role === 'customer') {
            setAuthError('Unauthorized access for customer accounts in the Admin Portal.');
          } else {
            navigate('/dashboard');
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
              <img
                src="/meridian-logo.svg"
                alt="Meridian"
                className={styles.brandLogoMark}
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
              />
              <span className={styles.brandName}>Meridian</span>
            </div>
            <h1 className={styles.title}>
              {mode === 'signin' ? 'Sign In' : 'Request Access'}
            </h1>
            <p className={styles.subtitle}>
              {mode === 'signin' 
                ? 'Enter your email address and access token to login'
                : 'Request an access token from the administration team'
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
              Register Request
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
              <span style={{ fontSize: '10px', color: 'var(--viridian, #438A7E)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>5 Roles Ready</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin@dealflow360.com');
                  setToken('admin_tkn');
                  setUsernameTouched(true);
                  setTokenTouched(true);
                  setAuthError('');
                }}
                style={{
                  background: 'var(--burnham, #00221C)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('manager@dealflow360.com');
                  setToken('manager_tkn');
                  setUsernameTouched(true);
                  setTokenTouched(true);
                  setAuthError('');
                }}
                style={{
                  background: '#1F3A4B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sales Manager
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('sales@dealflow360.com');
                  setToken('sales_tkn');
                  setUsernameTouched(true);
                  setTokenTouched(true);
                  setAuthError('');
                }}
                style={{
                  background: '#2D5B52',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sales Rep
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('finance@dealflow360.com');
                  setToken('finance_tkn');
                  setUsernameTouched(true);
                  setTokenTouched(true);
                  setAuthError('');
                }}
                style={{
                  background: '#5C4A21',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Finance / Ops
              </button>

            </div>
          </div>

            {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            
            {mode === 'signup' && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Full Name
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Enter your full name"
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

            {/* Password/Token Field (Only for Sign In) */}
            {mode === 'signin' && (
              <div className={styles.fieldGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor={tokenId} className={styles.label}>
                    Access Token
                  </label>
                  <button 
                    type="button" 
                    className={styles.forgotLink}
                    onClick={handleForgotPassword}
                  >
                    Forgot?
                  </button>
                </div>

                <div className={styles.inputWrapper}>
                  <input
                    id={tokenId}
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.input} ${styles.inputHasRightIcon} ${showTokenError ? styles.inputError : ''}`}
                    placeholder="Enter your access token"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      if (authError) setAuthError('');
                    }}
                    onBlur={() => setTokenTouched(true)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    required
                    aria-invalid={showTokenError}
                    aria-describedby={showTokenError ? tokenErrorId : undefined}
                  />

                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'Hide token' : 'Show token'}
                    title={showPassword ? 'Hide token' : 'Show token'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {showTokenError && (
                  <motion.div 
                    id={tokenErrorId} 
                    className={styles.errorMessage}
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                  >
                    <AlertCircle size={13} />
                    <span>Token is required</span>
                  </motion.div>
                )}
              </div>
            )}


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
                  <span>{mode === 'signin' ? 'Sign In' : 'Request Access'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>



          {/* Footer Text */}
          <div className={styles.footerText}>
            {mode === 'signin' ? (
              <>Don't have an account? <button type="button" onClick={() => handleModeSwitch('signup')}>Register Request</button></>
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
