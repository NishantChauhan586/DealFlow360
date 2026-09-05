/**
 * DealFlow360 API Client
 * Connects frontend to Python FastAPI + PostgreSQL/SQLite Backend (http://localhost:8008/api/v1)
 * Includes graceful fallback to localStorage when backend server is offline.
 */

import * as localStore from './quotationStore';

const API_BASE_URL = 'http://localhost:8008/api/v1';

/**
 * Checks if the local Python backend server is online.
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch('http://localhost:8008/health', { method: 'GET' });
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Retrieves dashboard overview metrics from backend API or local store.
 */
export async function getDashboardOverview() {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard/overview`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend API unreachable, using local storage fallback.', err);
  }
  return null;
}

/**
 * Retrieves all quotations from backend API or local store.
 */
export async function fetchQuotations() {
  try {
    const res = await fetch(`${API_BASE_URL}/quotes`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend API unreachable, using local storage fallback.');
  }
  return localStore.getAllQuotations();
}

/**
 * Saves a new quotation to backend API.
 */
export async function createQuotation(quoteData) {
  try {
    const res = await fetch(`${API_BASE_URL}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quoteData),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend API unreachable, saving to local storage.');
  }
  return localStore.saveQuotation(quoteData);
}

/**
 * Submits quotation for approval.
 */
export async function submitQuotationForApproval(quoteId) {
  try {
    const res = await fetch(`${API_BASE_URL}/quotes/${quoteId}/submit`, {
      method: 'POST',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend API unreachable, using local storage fallback.');
  }
  return localStore.submitQuotation(quoteId);
}
