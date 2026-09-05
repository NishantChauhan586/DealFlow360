/**
 * DealFlow360 — Unified Authentication & Validation Utilities
 * Pure validation logic for email, password, and automatic role detection.
 */

import { getStoredAuthorities } from './authorityAuth';

/**
 * Validates the email address or username input.
 * @param {string} input 
 * @returns {{ isValid: boolean, error: string | null, trimmedValue: string }}
 */
export function validateEmailOrUsername(input) {
  if (input === undefined || input === null) {
    return { isValid: false, error: 'Email address is required', trimmedValue: '' };
  }

  const rawValue = String(input);
  
  if (rawValue.length === 0) {
    return { isValid: false, error: 'Email address is required', trimmedValue: '' };
  }

  if (rawValue.trim().length === 0) {
    return { isValid: false, error: 'Email address cannot contain only spaces', trimmedValue: '' };
  }

  const trimmed = rawValue.trim();

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Must be at least 3 characters', trimmedValue: trimmed };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Cannot exceed 50 characters', trimmedValue: trimmed };
  }

  return { isValid: true, error: null, trimmedValue: trimmed };
}

export const validateUsername = validateEmailOrUsername;

/**
 * Detailed breakdown of password criteria.
 * @param {string} password 
 * @returns {{
 *   hasMinLength: boolean,
 *   hasMaxLength: boolean,
 *   hasUppercase: boolean,
 *   hasLowercase: boolean,
 *   hasNumber: boolean,
 *   hasSpecialChar: boolean,
 *   isValid: boolean,
 *   errors: string[]
 * }}
 */
export function validatePasswordCriteria(password) {
  const str = password || '';
  
  const hasMinLength = str.length >= 8;
  const hasMaxLength = str.length <= 32;
  const hasUppercase = /[A-Z]/.test(str);
  const hasLowercase = /[a-z]/.test(str);
  const hasNumber = /[0-9]/.test(str);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(str);

  const errors = [];

  if (!str) {
    errors.push('Password is required');
  } else {
    if (!hasMinLength) errors.push('At least 8 characters');
    if (!hasMaxLength) errors.push('Maximum 32 characters');
    if (!hasUppercase) errors.push('At least one uppercase letter (A-Z)');
    if (!hasLowercase) errors.push('At least one lowercase letter (a-z)');
    if (!hasNumber) errors.push('At least one number (0-9)');
    if (!hasSpecialChar) errors.push('At least one special character (!@#$%^&*)');
  }

  const isValid = str.length > 0 && hasMinLength && hasMaxLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  return {
    hasMinLength,
    hasMaxLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid,
    errors
  };
}

/**
 * Validates password and returns summary error message for primary error text.
 * @param {string} password 
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validatePassword(password) {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  const criteria = validatePasswordCriteria(password);

  if (criteria.isValid) {
    return { isValid: true, error: null };
  }

  const missing = [];
  if (!criteria.hasMinLength) missing.push('8 characters');
  if (!criteria.hasUppercase) missing.push('one uppercase letter');
  if (!criteria.hasLowercase) missing.push('one lowercase letter');
  if (!criteria.hasNumber) missing.push('one number');
  if (!criteria.hasSpecialChar) missing.push('one special character');
  if (!criteria.hasMaxLength) missing.push('max 32 characters');

  return {
    isValid: false,
    error: `Password must contain at least: ${missing.join(', ')}`
  };
}

/**
 * Unified Authentication API with automatic role detection and provisioned authority support.
 * @param {{ identifier: string, password: string }} params
 * @returns {{ success: boolean, user?: object, token?: string, error?: string }}
 */
export function authenticateUser({ identifier, password }) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const rawPass = password || '';

  // Validate presence
  if (!cleanId || !rawPass) {
    return { success: false, error: 'Username/Email and password are required.' };
  }

  // 1. Check Provisioned Authorities First
  const authorities = getStoredAuthorities();
  const matchedAuth = authorities.find(a => 
    (a.username && a.username.toLowerCase() === cleanId) ||
    (a.email && a.email.toLowerCase() === cleanId) ||
    (a.authorityId && a.authorityId.toLowerCase() === cleanId) ||
    (a.id && a.id.toLowerCase() === cleanId)
  );

  if (matchedAuth) {
    // Check credentials
    if (matchedAuth.password === rawPass) {
      return {
        success: true,
        user: {
          id: matchedAuth.id || matchedAuth.authorityId,
          authorityId: matchedAuth.authorityId || matchedAuth.id,
          username: matchedAuth.username,
          name: matchedAuth.fullName || matchedAuth.name,
          email: matchedAuth.email,
          role: 'admin', // Grants access to platform workspace
          authorityRole: matchedAuth.role,
          isFirstLogin: matchedAuth.isFirstLogin !== false,
          isAuthority: true
        },
        token: `mock-jwt-auth-${matchedAuth.id || matchedAuth.authorityId}`
      };
    } else {
      return {
        success: false,
        error: 'Invalid password. Please check your credentials.'
      };
    }
  }

  // 2. Automatic Role Detection for mock users:
  // Emails/usernames containing 'admin' -> Admin role
  // Other valid emails -> Customer role
  const isAdminEmail = cleanId.includes('admin');

  // Derive human readable user name from email
  const namePrefix = cleanId.split('@')[0];
  const formattedName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);

  if (isAdminEmail) {
    return {
      success: true,
      user: {
        username: cleanId,
        name: formattedName.includes('Admin') ? formattedName : `${formattedName} (Admin)`,
        email: cleanId.includes('@') ? cleanId : `${cleanId}@dealflow360.com`,
        role: 'admin',
        isFirstLogin: false
      },
      token: 'mock-jwt-admin-token-778899'
    };
  }

  // Customer Account
  return {
    success: true,
    user: {
      username: cleanId,
      name: formattedName.includes('Customer') ? formattedName : `${formattedName} (Client)`,
      email: cleanId.includes('@') ? cleanId : `${cleanId}@acme.com`,
      role: 'customer',
      isFirstLogin: false
    },
    token: 'mock-jwt-customer-token-112233'
  };
}

// Alias for backwards compatibility
export const authenticatePortalUser = ({ identifier, password }) => authenticateUser({ identifier, password });
