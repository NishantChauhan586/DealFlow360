import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Lock, 
  ShieldCheck, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { updateAuthorityPassword } from '../utils/authorityAuth';
import styles from './PermanentPasswordModal.module.css';

export default function PermanentPasswordModal({ user, onPasswordSaved }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Validation criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isAllValid = 
    hasMinLength && 
    hasUppercase && 
    hasLowercase && 
    hasNumber && 
    hasSpecialChar && 
    passwordsMatch;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAllValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    setTimeout(() => {
      try {
        const identifier = user.username || user.authorityId || user.id || user.email;
        const success = updateAuthorityPassword(identifier, newPassword);

        if (success) {
          // Update active user in localStorage session
          const updatedUser = {
            ...user,
            isFirstLogin: false,
            passwordChanged: true
          };
          localStorage.setItem('dealflow_user', JSON.stringify(updatedUser));

          if (typeof onPasswordSaved === 'function') {
            onPasswordSaved(updatedUser);
          }
        } else {
          setErrorMessage('Unable to save password. Please verify your authority record.');
          setIsSubmitting(false);
        }
      } catch (err) {
        console.error(err);
        setErrorMessage('An unexpected error occurred. Please try again.');
        setIsSubmitting(false);
      }
    }, 600);
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <motion.div 
        className={styles.modalCard}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className={styles.header}>
          <div className={styles.badge}>
            <ShieldCheck size={14} />
            <span>Mandatory First Login Setup</span>
          </div>
          <h2 id="modal-title" className={styles.title}>Create Your Permanent Password</h2>
          <p className={styles.subtitle}>
            Welcome, <strong>{user?.name || user?.username}</strong>. Your temporary Authority ID password must now be replaced with a secure permanent password to continue.
          </p>
        </div>

        {errorMessage && (
          <div className={styles.errorBanner}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* New Password */}
          <div className={styles.field}>
            <label className={styles.label}>
              <KeyRound size={14} />
              <span>New Password</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new permanent password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
                autoFocus
                required
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowNewPassword(prev => !prev)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className={styles.field}>
            <label className={styles.label}>
              <Lock size={14} />
              <span>Confirm Password</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter permanent password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                required
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowConfirmPassword(prev => !prev)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className={styles.criteriaCard}>
            <div className={styles.criteriaTitle}>Password Requirements</div>
            
            <div className={`${styles.criteriaItem} ${hasMinLength ? styles.criteriaMet : ''}`}>
              {hasMinLength ? <Check size={13} strokeWidth={2.5} color="#2E6A60" /> : <X size={13} color="rgba(8,32,26,0.4)" />}
              <span>Minimum 8 characters</span>
            </div>

            <div className={`${styles.criteriaItem} ${hasUppercase ? styles.criteriaMet : ''}`}>
              {hasUppercase ? <Check size={13} strokeWidth={2.5} color="#2E6A60" /> : <X size={13} color="rgba(8,32,26,0.4)" />}
              <span>One uppercase letter (A–Z)</span>
            </div>

            <div className={`${styles.criteriaItem} ${hasLowercase ? styles.criteriaMet : ''}`}>
              {hasLowercase ? <Check size={13} strokeWidth={2.5} color="#2E6A60" /> : <X size={13} color="rgba(8,32,26,0.4)" />}
              <span>One lowercase letter (a–z)</span>
            </div>

            <div className={`${styles.criteriaItem} ${hasNumber ? styles.criteriaMet : ''}`}>
              {hasNumber ? <Check size={13} strokeWidth={2.5} color="#2E6A60" /> : <X size={13} color="rgba(8,32,26,0.4)" />}
              <span>One number (0–9)</span>
            </div>

            <div className={`${styles.criteriaItem} ${hasSpecialChar ? styles.criteriaMet : ''}`}>
              {hasSpecialChar ? <Check size={13} strokeWidth={2.5} color="#2E6A60" /> : <X size={13} color="rgba(8,32,26,0.4)" />}
              <span>One special character (!@#$%^&*)</span>
            </div>

            <div className={`${styles.criteriaItem} ${passwordsMatch ? styles.criteriaMet : ''}`}>
              {passwordsMatch ? <Check size={13} strokeWidth={2.5} color="#2E6A60" /> : <X size={13} color="rgba(8,32,26,0.4)" />}
              <span>Passwords match</span>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={!isAllValid || isSubmitting}
            className={styles.saveBtn}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Saving permanent password...</span>
              </>
            ) : (
              <>
                <KeyRound size={16} />
                <span>Save Password</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
