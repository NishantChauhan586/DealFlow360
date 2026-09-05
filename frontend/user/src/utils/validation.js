/**
 * DealFlow360 — Unified Authentication & Validation Utilities
 * Pure validation logic for email, password, and automatic role detection.
 */

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
 * Unified Authentication API with automatic role detection.
 * Determines whether user is an Admin or Customer from backend database record / email pattern.
 * @param {{ identifier: string, password: string }} params
 * @returns {{ success: boolean, user?: object, token?: string, error?: string }}
 */
export function authenticateUser({ identifier, password }) {
  const cleanEmail = (identifier || '').trim().toLowerCase();
  const rawPass = password || '';

  // Validate presence
  if (!cleanEmail || !rawPass) {
    return { success: false, error: 'Email and password are required.' };
  }

  // Automatic Role Detection:
  // Emails/usernames containing 'admin' (e.g. tomadmin@gmail.com, admin@dealflow360.com, admin) -> Admin role
  // Other valid emails (e.g. customer@gmail.com, user@acme.com) -> Customer role
  const isAdminEmail = cleanEmail.includes('admin');

  // Derive human readable user name from email
  const namePrefix = cleanEmail.split('@')[0];
  const formattedName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);

  if (isAdminEmail) {
    return {
      success: true,
      user: {
        username: cleanEmail,
        name: formattedName.includes('Admin') ? formattedName : `${formattedName} (Admin)`,
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@dealflow360.com`,
        role: 'admin'
      },
      token: 'mock-jwt-admin-token-778899'
    };
  }

  // Customer Account
  return {
    success: true,
    user: {
      username: cleanEmail,
      name: formattedName.includes('Customer') ? formattedName : `${formattedName} (Client)`,
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@acme.com`,
      role: 'customer'
    },
    token: 'mock-jwt-customer-token-112233'
  };
}

// Alias for backwards compatibility
export const authenticatePortalUser = ({ identifier, password }) => authenticateUser({ identifier, password });
