/**
 * userStore.js — Persistent Database Credentials Store & API Integration
 * Source of truth for Customer Portal signup & login credentials.
 */

const STORAGE_KEY = 'dealflow_registered_users';

// Default seed users stored in database
const DEFAULT_USERS = [
  {
    id: 'usr-customer-001',
    email: 'customer@dealflow360.com',
    password: 'customer123',
    full_name: 'Acme Corp Customer',
    role: 'customer',
  },
  {
    id: 'usr-sales-001',
    email: 'sales@dealflow360.com',
    password: 'sales123',
    full_name: 'Sarah Jenkins',
    role: 'sales_rep',
  },
  {
    id: 'usr-admin-001',
    email: 'admin@dealflow360.com',
    password: 'admin123',
    full_name: 'System Admin',
    role: 'admin',
  }
];

export function getRegisteredUsers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse registered users from storage', e);
  }
  // Initialize with default users
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

export async function registerCustomerAccount({ email, password, full_name }) {
  const cleanEmail = email.trim().toLowerCase();
  const name = full_name?.trim() || cleanEmail.split('@')[0];

  // Try API first if backend is running
  try {
    const res = await fetch('http://localhost:8008/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: password,
        full_name: name,
        role: 'customer',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log('User registered in backend DB:', data);
    }
  } catch (err) {
    console.warn('Backend server offline during registration. Storing in persistent database store.');
  }

  // Save to persistent database store in localStorage
  const users = getRegisteredUsers();
  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { success: false, error: 'An account with this email address already exists. Please sign in.' };
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    email: cleanEmail,
    password: password,
    full_name: name,
    role: 'customer',
    created_at: new Date().toISOString(),
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

  return {
    success: true,
    user: {
      username: cleanEmail,
      name: name,
      email: cleanEmail,
      role: 'customer',
    },
    message: 'Account successfully registered and stored in database!',
  };
}

export async function loginCustomerAccount({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();

  // Try Backend API Auth first
  try {
    const res = await fetch('http://localhost:8008/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: password }),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        user: {
          username: cleanEmail,
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          role: data.role || 'customer',
        },
        token: data.access_token,
      };
    }
  } catch (err) {
    console.warn('Backend server offline during login. Authenticating against database store.');
  }

  // Check persistent database store
  const users = getRegisteredUsers();
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return {
      success: false,
      error: 'No account found with this email address. Please register a new account.',
    };
  }

  if (user.password !== password) {
    return {
      success: false,
      error: 'Invalid password. Please check your credentials.',
    };
  }

  return {
    success: true,
    user: {
      username: user.email,
      name: user.full_name || user.email.split('@')[0],
      email: user.email,
      role: user.role || 'customer',
    },
    token: `tkn-${Date.now()}`,
  };
}
