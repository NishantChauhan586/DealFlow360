/**
 * authorityAuth.js — Authority Account Provisioning & Authentication Utilities
 * Manages username generation, credential persistence, and first-login password transitions.
 */

export const STORAGE_KEY = 'dealflow_provisioned_authorities';

export const ROLE_POSTFIX_MAP = {
  'Sales Representative': 'salesrep',
  'Sales Manager / Approver': 'manager',
  'Sales Manager': 'manager',
  'Finance / Operation User': 'fin',
  'Finance / Operation': 'fin'
};

export const DEFAULT_AUTHORITIES = [
  {
    id: 'AUTH-001',
    authorityId: 'AUTH-001',
    fullName: 'John Doe',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Sales Manager / Approver',
    username: 'johnmanager',
    password: 'AUTH-001',
    isFirstLogin: true
  }
];

/**
 * Generates an authority username based on first name and role postfix.
 * Rules:
 * - Extract only the user's first name
 * - Convert to lowercase
 * - Remove spaces / special characters
 * - Append role postfix (salesrep, manager, fin)
 * 
 * @param {string} fullName 
 * @param {string} role 
 * @param {Array} existingAuthorities 
 * @returns {string}
 */
export function generateAuthorityUsername(fullName, role, existingAuthorities = []) {
  if (!fullName || typeof fullName !== 'string') return '';
  
  // Extract first name (first word)
  const firstName = fullName.trim().split(/\s+/)[0] || '';
  // Convert to lowercase and remove spaces/special characters
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const postfix = ROLE_POSTFIX_MAP[role] || 'user';
  const baseUsername = `${cleanFirst}${postfix}`;

  if (!cleanFirst) return '';

  // Check for uniqueness against existing authorities
  const existingUsernames = (existingAuthorities || []).map(a => (a.username || '').toLowerCase());
  if (!existingUsernames.includes(baseUsername)) {
    return baseUsername;
  }

  let counter = 2;
  let candidate = `${baseUsername}${counter}`;
  while (existingUsernames.includes(candidate)) {
    counter++;
    candidate = `${baseUsername}${counter}`;
  }
  return candidate;
}

/**
 * Retrieves provisioned authorities from localStorage.
 * @returns {Array}
 */
export function getStoredAuthorities() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_AUTHORITIES;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_AUTHORITIES;
  } catch {
    return DEFAULT_AUTHORITIES;
  }
}

/**
 * Saves provisioned authorities to localStorage.
 * @param {Array} authorities 
 */
export function saveStoredAuthorities(authorities) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authorities));
  } catch (e) {
    console.error('Failed to save authorities:', e);
  }
}

/**
 * Updates an authority's password, sets isFirstLogin to false,
 * and invalidates the temporary password.
 * 
 * @param {string} identifier (username, authorityId, or id)
 * @param {string} newPassword 
 * @returns {boolean}
 */
export function updateAuthorityPassword(identifier, newPassword) {
  if (!identifier || !newPassword) return false;

  const authorities = getStoredAuthorities();
  const cleanId = String(identifier).trim().toLowerCase();

  let updated = false;
  const newAuthorities = authorities.map(auth => {
    const matches = 
      (auth.username && auth.username.toLowerCase() === cleanId) ||
      (auth.authorityId && auth.authorityId.toLowerCase() === cleanId) ||
      (auth.id && auth.id.toLowerCase() === cleanId) ||
      (auth.email && auth.email.toLowerCase() === cleanId);

    if (matches) {
      updated = true;
      return {
        ...auth,
        password: newPassword,
        isFirstLogin: false,
        passwordChanged: true,
        passwordUpdatedAt: new Date().toISOString()
      };
    }
    return auth;
  });

  if (updated) {
    saveStoredAuthorities(newAuthorities);
  }
  return updated;
}
