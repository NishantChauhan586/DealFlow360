/**
 * validation.js — Authentication and input validation utilities
 */

export function validateUsername(username) {
  if (!username || !username.trim()) {
    return { isValid: false, error: 'Username or name is required.' };
  }
  const clean = username.trim();
  if (clean.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters.' };
  }
  return { isValid: true, error: '' };
}

export function validatePassword(password) {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters.' };
  }
  return { isValid: true, error: '' };
}
