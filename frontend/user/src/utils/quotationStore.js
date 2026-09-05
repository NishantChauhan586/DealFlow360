/**
 * DealFlow360 — Customer Quotation Store
 * Manages self-service customer created quotations with local storage persistence.
 */

const STORAGE_KEY = 'dealflow_customer_quotations';
const COUNTER_KEY = 'dealflow_quote_counter';

/**
 * Retrieves the current counter for generating unique quote numbers (e.g. Q-1001).
 * @returns {number}
 */
function getNextQuoteCounter() {
  const current = localStorage.getItem(COUNTER_KEY);
  const nextNumber = current ? parseInt(current, 10) + 1 : 1001;
  localStorage.setItem(COUNTER_KEY, nextNumber.toString());
  return nextNumber;
}

/**
 * Calculates line totals, subtotal, tax, and grand total.
 * @param {Array<{ name: string, description: string, quantity: number, unitPrice: number }>} items 
 * @param {number} discountPercent 
 * @returns {{ lineItems: Array, subtotal: number, tax: number, discountAmount: number, grandTotal: number }}
 */
export function calculateQuotationTotals(items = [], discountPercent = 0) {
  const processedItems = items.map(item => {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const price = Math.max(0, parseFloat(item.unitPrice) || 0);
    const total = qty * price;
    return {
      id: item.id || `item_${Math.random().toString(36).substring(2, 9)}`,
      name: item.name || '',
      description: item.description || '',
      quantity: qty,
      unitPrice: price,
      lineTotal: total
    };
  });

  const subtotal = processedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountRate = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
  const discountAmount = (subtotal * discountRate) / 100;
  const taxableTotal = Math.max(0, subtotal - discountAmount);
  const tax = taxableTotal * 0.10; // 10% standard tax rate
  const grandTotal = taxableTotal + tax;

  return {
    lineItems: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountPercent: discountRate,
    discountAmount: Math.round(discountAmount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100
  };
}

/**
 * Retrieves all stored quotations from local storage.
 * @returns {Array}
 */
export function getAllQuotations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error reading quotations from localStorage:", err);
    return [];
  }
}

/**
 * Retrieves quotations belonging to a specific customer email or user.
 * @param {string} userEmail 
 * @returns {Array}
 */
export function getQuotationsForUser(userEmail) {
  const all = getAllQuotations();
  if (!userEmail) return all;
  const cleanEmail = userEmail.trim().toLowerCase();
  return all.filter(q => (q.customerEmail || '').trim().toLowerCase() === cleanEmail);
}

/**
 * Saves a new quotation or updates an existing draft quotation.
 * @param {Object} formData 
 * @param {Object} currentUser 
 * @returns {Object} savedQuotation
 */
export function saveQuotation(formData, currentUser) {
  const all = getAllQuotations();
  const totals = calculateQuotationTotals(formData.lineItems, formData.discountPercent);

  const quoteId = formData.id || `Q-${getNextQuoteCounter()}`;
  const now = new Date().toISOString().split('T')[0];

  const existingIndex = all.findIndex(q => q.id === quoteId);

  const quotationObject = {
    id: quoteId,
    customerName: formData.customerName || currentUser?.name || 'Valued Client',
    customerEmail: (currentUser?.email || formData.customerEmail || 'customer@dealflow360.com').toLowerCase(),
    companyName: formData.companyName || 'My Company',
    title: formData.title || 'Untitled Quotation',
    description: formData.description || '',
    currency: formData.currency || 'USD ($)',
    validUntil: formData.validUntil || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    dateCreated: formData.dateCreated || now,
    status: formData.status || 'Draft', // 'Draft' | 'Pending Review' | 'Under Negotiation' | 'Approved' | 'Rejected'
    lineItems: totals.lineItems,
    subtotal: totals.subtotal,
    discountPercent: totals.discountPercent,
    discountAmount: totals.discountAmount,
    tax: totals.tax,
    grandTotal: totals.grandTotal,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    // Only allow updating if existing quote is in Draft status (or admin)
    if (all[existingIndex].status !== 'Draft' && currentUser?.role !== 'admin') {
      throw new Error('Only Draft quotations can be modified.');
    }
    all[existingIndex] = quotationObject;
  } else {
    all.unshift(quotationObject);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return quotationObject;
}

/**
 * Submits a draft quotation for approval ('Pending Review').
 * @param {string} quoteId 
 * @param {Object} currentUser 
 * @returns {Object} updatedQuotation
 */
export function submitQuotation(quoteId, currentUser) {
  const all = getAllQuotations();
  const index = all.findIndex(q => q.id === quoteId);

  if (index < 0) {
    throw new Error('Quotation not found.');
  }

  const quote = all[index];

  if (quote.status !== 'Draft' && currentUser?.role !== 'customer') {
    throw new Error('Only Draft quotations can be submitted for review.');
  }

  quote.status = 'Pending Review';
  quote.submittedAt = new Date().toISOString().split('T')[0];
  all[index] = quote;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return quote;
}

/**
 * Deletes a draft quotation.
 * @param {string} quoteId 
 * @param {Object} currentUser 
 * @returns {boolean}
 */
export function deleteQuotation(quoteId, currentUser) {
  const all = getAllQuotations();
  const index = all.findIndex(q => q.id === quoteId);

  if (index < 0) return false;

  const quote = all[index];

  // Permissions: Customer can delete only Drafts
  if (quote.status !== 'Draft' && currentUser?.role !== 'admin') {
    throw new Error('Only Draft quotations can be deleted.');
  }

  all.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return true;
}
