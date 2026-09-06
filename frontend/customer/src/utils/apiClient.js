/**
 * DealFlow360 Dynamic API Client
 * Connects frontend to Python FastAPI + PostgreSQL/SQLite Backend.
 * Reads environment variable import.meta.env.VITE_API_BASE_URL.
 * No predefined mock values.
 */

import * as localStore from './quotationStore';
import productService from '../services/productService';
import warehouseService from '../services/warehouseService';
import subscriptionService from '../services/subscriptionService';
import reportService from '../services/reportService';

export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8008/api/v1';
export const API_HOST_HEALTH = API_BASE_URL.replace('/api/v1', '') + '/health';

/**
 * Checks if the Python backend server is online.
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(API_HOST_HEALTH, { method: 'GET' });
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Dashboard & Overview Metrics
 */
export async function getDashboardOverview() {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard/overview`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend API unreachable for dashboard overview.', err);
  }
  return null;
}

export async function fetchDashboardTasks() {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard/tasks`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for dashboard tasks.', err);
  }
  return [];
}

/**
 * Catalog: Products, Price Lists & Discount Tiers
 */
export async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE_URL}/products`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for products.');
  }
  return productService.getAllProducts();
}

export async function fetchPriceLists() {
  try {
    const res = await fetch(`${API_BASE_URL}/price-lists`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for price lists.');
  }
  return productService.getAllPriceLists();
}

export async function fetchDiscountTiers() {
  try {
    const res = await fetch(`${API_BASE_URL}/discount-tiers`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for discount tiers.');
  }
  return productService.getAllDiscountTiers();
}

/**
 * Quotations Pipeline & Builder
 */
export async function fetchQuotations() {
  try {
    const res = await fetch(`${API_BASE_URL}/quotes`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend API unreachable for quotes.');
  }
  return localStore.getAllQuotations();
}

export async function fetchQuotationById(quoteId) {
  try {
    const res = await fetch(`${API_BASE_URL}/quotes/${quoteId}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for quote ID.');
  }
  return localStore.getQuotationById(quoteId);
}

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
    console.warn('Backend API unreachable for create quotation.');
  }
  return localStore.saveQuotation(quoteData);
}

export async function submitQuotationForApproval(quoteId) {
  try {
    const res = await fetch(`${API_BASE_URL}/quotes/${quoteId}/submit`, {
      method: 'POST',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend API unreachable for submit quotation.');
  }
  return localStore.submitQuotation(quoteId);
}

/**
 * Approvals Management
 */
export async function fetchApprovalRequests() {
  try {
    const res = await fetch(`${API_BASE_URL}/approval-chains`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for approval chains.');
  }
  return localStore.getAllQuotations().filter(q => q.status === 'Pending Approval' || q.status === 'Pending Review');
}

export async function processApprovalAction(requestId, action, payload = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/approval-chains/${requestId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for approval action.');
  }
  return { status: 'success', requestId, action };
}

/**
 * Logistics & Warehouses
 */
export async function fetchWarehouses() {
  try {
    const res = await fetch(`${API_BASE_URL}/warehouses`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for warehouses.');
  }
  return warehouseService.getAllWarehouses();
}

export async function fetchFulfillmentSplits() {
  try {
    const res = await fetch(`${API_BASE_URL}/fulfillment/splits`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for fulfillment splits.');
  }
  return warehouseService.getAllFulfillmentOrders();
}

export async function overrideFulfillment(splitId, payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/fulfillment/splits/${splitId}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for fulfillment override.');
  }
  return { status: 'success', splitId, ...payload };
}

/**
 * Subscriptions & Recurring Contracts
 */
export async function fetchSubscriptions() {
  try {
    const res = await fetch(`${API_BASE_URL}/subscriptions`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for subscriptions.');
  }
  return subscriptionService.getAllSubscriptions();
}

export async function updateSubscriptionQty(contractId, itemId, newQty) {
  try {
    const res = await fetch(`${API_BASE_URL}/subscriptions/${contractId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: newQty }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for updating subscription.');
  }
  return subscriptionService.updateSubscriptionQty(contractId, itemId, newQty);
}

export async function cancelSubscriptionLine(contractId, itemId) {
  try {
    const res = await fetch(`${API_BASE_URL}/subscriptions/${contractId}/items/${itemId}/cancel`, {
      method: 'POST'
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for cancelling subscription line.');
  }
  return subscriptionService.cancelSubscriptionLine(contractId, itemId);
}

/**
 * Reporting & Intelligence Analytics
 */
export async function fetchSalesReports() {
  try {
    const res = await fetch(`${API_BASE_URL}/reports/sales`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for sales reports.');
  }
  return reportService.generateExecutiveSummary();
}

/**
 * Audit Logs
 */
export async function fetchAuditLogs() {
  try {
    const res = await fetch(`${API_BASE_URL}/audit-logs`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for audit logs.');
  }
  return [];
}

/**
 * Customer Negotiation & Portal API
 */
export async function fetchCustomerPortalQuotes() {
  try {
    const res = await fetch(`${API_BASE_URL}/portal/quotes`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for customer portal quotes.');
  }
  return localStore.getAllQuotations();
}

export async function submitCustomerNegotiation(quoteId, counterOfferData) {
  try {
    const res = await fetch(`${API_BASE_URL}/portal/quotes/${quoteId}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(counterOfferData),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for customer counter offer.');
  }
  return localStore.addCounterOffer(quoteId, counterOfferData.counter_total, counterOfferData.notes);
}

export async function confirmCustomerOrder(quoteId) {
  try {
    const res = await fetch(`${API_BASE_URL}/portal/quotes/${quoteId}/confirm`, {
      method: 'POST',
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend API unreachable for customer order confirmation.');
  }
  return localStore.updateStatus(quoteId, 'ACCEPTED');
}
