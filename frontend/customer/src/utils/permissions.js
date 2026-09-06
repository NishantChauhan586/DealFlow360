/**
 * permissions.js — Centralized Role-Based Access Control (RBAC) System
 * Source of truth for DealFlow360 Portals & User Roles
 */

export const ROLES = {
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALES_REP: 'sales_rep',
  FINANCE: 'finance',
  CUSTOMER: 'customer',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SALES_MANAGER]: 'Sales Manager',
  [ROLES.SALES_REP]: 'Sales Representative',
  [ROLES.FINANCE]: 'Finance & Ops',
  [ROLES.CUSTOMER]: 'Customer Account',
};

export const PORTAL_TYPES = {
  INTERNAL: 'internal',
  CUSTOMER: 'customer',
};

/**
 * Maps each role to its accessible routes and permissions
 */
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    portal: PORTAL_TYPES.INTERNAL,
    routes: [
      '/dashboard',
      '/products',
      '/reports',
      '/quotations',
      '/pipeline',
      '/builder',
      '/approval',
      '/fulfillment',
      '/subscriptions',
      '/authorities',
    ],
    canConfigureProducts: true,
    canConfigurePricing: true,
    canManageUsers: true,
    canManageWarehouses: true,
    canManageSubscriptions: true,
    canApproveQuotes: true,
    canCreateQuotes: true,
  },
  [ROLES.SALES_REP]: {
    portal: PORTAL_TYPES.INTERNAL,
    routes: [
      '/dashboard',
      '/products',
      '/quotations',
      '/pipeline',
      '/builder',
      '/portal',
    ],
    canConfigureProducts: false,
    canConfigurePricing: false,
    canManageUsers: false,
    canManageWarehouses: false,
    canManageSubscriptions: false,
    canApproveQuotes: false,
    canCreateQuotes: true,
    isReadOnlyProducts: true,
    isApprovalStatusOnly: false,
    isFulfillmentTrackingOnly: false,
  },
  [ROLES.SALES_MANAGER]: {
    portal: PORTAL_TYPES.INTERNAL,
    routes: [
      '/dashboard',
      '/products',
      '/reports',
      '/quotations',
      '/pipeline',
      '/builder',
      '/approval',
    ],
    canConfigureProducts: false,
    canConfigurePricing: false,
    canManageUsers: false,
    canManageWarehouses: false,
    canManageSubscriptions: false,
    canApproveQuotes: true,
    canConfigureDiscountThresholds: true,
    canConfigureApprovalChains: true,
    canCreateQuotes: true,
    isReadOnlyProducts: true,
  },
  [ROLES.FINANCE]: {
    portal: PORTAL_TYPES.INTERNAL,
    routes: [
      '/dashboard',
      '/products',
      '/builder',
      '/approval',
      '/fulfillment',
      '/subscriptions',
    ],
    canConfigureProducts: true,
    canConfigurePricing: true,
    canManageUsers: false,
    canManageWarehouses: true,
    canManageSubscriptions: true,
    canApproveQuotes: true, // Finance level approval
    canCreateQuotes: false,
    isReadOnlyProducts: false,
  },
  [ROLES.CUSTOMER]: {
    portal: PORTAL_TYPES.CUSTOMER,
    routes: [
      '/portal',
      '/builder',
      '/products',
    ],
    canConfigureProducts: false,
    canConfigurePricing: false,
    canManageUsers: false,
    canManageWarehouses: false,
    canManageSubscriptions: false,
    canApproveQuotes: false,
    canCreateQuotes: true,
  },
};

/**
 * Returns portal classification for a given user
 */
export function getPortalType(user) {
  if (!user || !user.role) return PORTAL_TYPES.CUSTOMER;
  return user.role === ROLES.CUSTOMER ? PORTAL_TYPES.CUSTOMER : PORTAL_TYPES.INTERNAL;
}

/**
 * Returns human-readable role name
 */
export function getRoleLabel(role) {
  return ROLE_LABELS[role] || 'Internal User';
}

/**
 * Check if a user has access to a specific route
 */
export function hasRouteAccess(user, pathname) {
  if (!user || !user.role) return false;
  const roleConfig = ROLE_PERMISSIONS[user.role];
  if (!roleConfig) return false;

  // Root path handling
  if (pathname === '/' || pathname === '') return true;

  return roleConfig.routes.some(route => pathname.startsWith(route));
}

/**
 * Check if user has specific permission feature
 */
export function hasPermission(user, permissionKey) {
  if (!user || !user.role) return false;
  const roleConfig = ROLE_PERMISSIONS[user.role];
  return Boolean(roleConfig?.[permissionKey]);
}
