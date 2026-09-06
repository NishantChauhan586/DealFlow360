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
  
  const hasMinLength = str.length >= 4;
  const hasMaxLength = str.length <= 32;
  const hasUppercase = /[A-Z]/.test(str);
  const hasLowercase = /[a-z]/.test(str);
  const hasNumber = /[0-9]/.test(str);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(str);

  const errors = [];

  if (!str) {
    errors.push('Password is required');
  } else {
    if (str.length < 4) errors.push('At least 4 characters');
    if (!hasMaxLength) errors.push('Maximum 32 characters');
  }

  const isValid = str.length >= 4 && hasMaxLength;

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

  const str = String(password).trim();
  if (str.length < 4) {
    return { isValid: false, error: 'Password must be at least 4 characters' };
  }

  return { isValid: true, error: null };
}

/**
 * Unified Authentication API with automatic role detection.
 * Determines role from backend database record / email pattern or explicit selection.
 * @param {{ identifier: string, token: string, role?: string }} params
 * @returns {{ success: boolean, user?: object, token?: string, error?: string }}
 */
export function authenticateUser({ identifier, token, role }) {
  const cleanEmail = (identifier || '').trim().toLowerCase();
  const rawToken = token || '';

  // Validate presence
  if (!cleanEmail || !rawToken) {
    return { success: false, error: 'Email and Access Token are required.' };
  }

  // Check demo credentials fallback
  const demoUsers = {
    'admin@dealflow360.com': 'admin_tkn',
    'manager@dealflow360.com': 'manager_tkn',
    'sales@dealflow360.com': 'sales_tkn',
    'finance@dealflow360.com': 'finance_tkn'
  };

  let userRole = role;
  let foundUser = false;

  // First check if it's a demo account
  if (demoUsers[cleanEmail] && demoUsers[cleanEmail] === rawToken) {
    foundUser = true;
    if (cleanEmail.includes('admin')) userRole = 'admin';
    else if (cleanEmail.includes('manager')) userRole = 'sales_manager';
    else if (cleanEmail.includes('sales')) userRole = 'sales_rep';
    else if (cleanEmail.includes('finance')) userRole = 'finance';
  } else {
    // Check local storage provisioned authorities
    try {
      const saved = localStorage.getItem('dealflow_provisioned_authorities');
      if (saved) {
        const authorities = JSON.parse(saved);
        const matched = authorities.find(a => a.email.toLowerCase() === cleanEmail && a.token === rawToken);
        if (matched) {
          foundUser = true;
          // Map their human readable role to internal role key
          if (matched.role.includes('Administrator')) userRole = 'admin';
          else if (matched.role.includes('Manager')) userRole = 'sales_manager';
          else if (matched.role.includes('Finance')) userRole = 'finance';
          else userRole = 'sales_rep';
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!foundUser) {
    return { success: false, error: 'Invalid email or access token. Please wait for admin approval if you have registered.' };
  }

  // Derive human readable user name from email
  const namePrefix = cleanEmail.split('@')[0];
  const formattedName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);

  const roleTitles = {
    admin: ' (Admin)',
    sales_manager: ' (Sales Manager)',
    sales_rep: ' (Sales Rep)',
    finance: ' (Finance & Ops)'
  };

  const displayName = `${formattedName}${roleTitles[userRole] || ''}`;

  return {
    success: true,
    user: {
      username: cleanEmail,
      name: displayName,
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@dealflow360.com`,
      role: userRole,
    },
    token: rawToken
  };
}

// Alias for backwards compatibility
export const authenticatePortalUser = ({ identifier, token }) => authenticateUser({ identifier, token });
