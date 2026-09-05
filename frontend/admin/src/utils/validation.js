/**
 * DealFlow360 — Auth Validation Utilities
 * Pure validation logic for username and password fields.
 */

/**
 * Validates the username input against enterprise requirements.
 * @param {string} username 
 * @returns {{ isValid: boolean, error: string | null, trimmedValue: string }}
 */
export function validateUsername(username) {
  if (username === undefined || username === null) {
    return { isValid: false, error: 'Username is required', trimmedValue: '' };
  }

  const rawValue = String(username);
  
  if (rawValue.length === 0) {
    return { isValid: false, error: 'Username is required', trimmedValue: '' };
  }

  if (rawValue.trim().length === 0) {
    return { isValid: false, error: 'Username cannot contain only spaces', trimmedValue: '' };
  }

  const trimmed = rawValue.trim();

  if (trimmed.length < 4) {
    return { isValid: false, error: 'Username must be at least 4 characters', trimmedValue: trimmed };
  }

  if (trimmed.length > 30) {
    return { isValid: false, error: 'Username cannot exceed 30 characters', trimmedValue: trimmed };
  }

  return { isValid: true, error: null, trimmedValue: trimmed };
}

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
  // Special char check matching any non-alphanumeric character or common symbols
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

  // Generate clear combined error summary
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
