/**
 * productService.js — Comprehensive client-side service implementing RESTful contracts
 * with local persistence, Cartesian variant matrix generation, bulk price calculators,
 * and deterministic business rule validation.
 */

import {
  INITIAL_PRODUCTS,
  INITIAL_PRICE_LISTS,
  INITIAL_CUSTOMER_TIERS,
  INITIAL_CATEGORIES,
  INITIAL_UNITS,
  CURRENCIES,
} from '../data/productCatalogData';

import syncBus from '../utils/syncBus';

const STORAGE_KEYS = {
  PRODUCTS: 'dealflow_catalog_products_v2',
  PRICE_LISTS: 'dealflow_catalog_pricelists_v2',
  CUSTOMER_TIERS: 'dealflow_catalog_tiers_v2',
};

class ProductService {
  constructor() {
    this.listeners = new Set();
    this._init();
    this._initSyncBus();
  }

  _init() {
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRICE_LISTS)) {
      localStorage.setItem(STORAGE_KEYS.PRICE_LISTS, JSON.stringify(INITIAL_PRICE_LISTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMER_TIERS)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_TIERS, JSON.stringify(INITIAL_CUSTOMER_TIERS));
    }
  }

  _initSyncBus() {
    syncBus.subscribe('products', (payload) => {
      try {
        if (payload?.products && Array.isArray(payload.products)) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(payload.products));
        } else if (payload?.product && payload?.action === 'create') {
          const prods = this._getRawProducts();
          if (!prods.some((p) => p.id === payload.product.id)) {
            prods.unshift(payload.product);
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
          }
        } else if (payload?.product && payload?.action === 'update') {
          const prods = this._getRawProducts();
          const idx = prods.findIndex((p) => p.id === payload.product.id);
          if (idx !== -1) {
            prods[idx] = { ...prods[idx], ...payload.product };
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
          }
        } else if (payload?.action === 'delete' && payload?.productId) {
          const prods = this._getRawProducts().filter((p) => p.id !== payload.productId);
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
        }
      } catch (err) {
        console.error('[Customer ProductService] Error handling sync event:', err);
      }
      this._notify();
    });

    syncBus.subscribe('price_lists', (payload) => {
      try {
        if (payload?.priceLists && Array.isArray(payload.priceLists)) {
          localStorage.setItem(STORAGE_KEYS.PRICE_LISTS, JSON.stringify(payload.priceLists));
        }
      } catch (err) {
        console.error('[Customer ProductService] Error handling price_lists sync:', err);
      }
      this._notify();
    });

    syncBus.subscribe('discount_tiers', (payload) => {
      try {
        if (payload?.tiers && Array.isArray(payload.tiers)) {
          localStorage.setItem(STORAGE_KEYS.CUSTOMER_TIERS, JSON.stringify(payload.tiers));
        }
      } catch (err) {
        console.error('[Customer ProductService] Error handling discount_tiers sync:', err);
      }
      this._notify();
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in catalog service listener:', err);
      }
    });
  }

  // --- Internal Storage Helpers ---
  _getRawProducts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const prods = data ? JSON.parse(data) : [];
      const whInvData = localStorage.getItem('dealflow_warehouse_inventory_v1');
      if (whInvData) {
        const whInventory = JSON.parse(whInvData);
        prods.forEach((p) => {
          if (p.trackStock) {
            const sumOnHand = whInventory
              .filter((inv) => inv.productId === p.id)
              .reduce((acc, inv) => acc + (Number(inv.onHand) || 0), 0);
            if (sumOnHand > 0 || whInventory.some((inv) => inv.productId === p.id)) {
              p.stockQuantity = sumOnHand;
            }
          }
        });
      }
      return prods;
    } catch {
      return [];
    }
  }

  _saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this._notify();
    syncBus.publish('products', { action: 'save', products });
  }

  _getRawPriceLists() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRICE_LISTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _savePriceLists(priceLists) {
    localStorage.setItem(STORAGE_KEYS.PRICE_LISTS, JSON.stringify(priceLists));
    this._notify();
    syncBus.publish('price_lists', { action: 'save', priceLists });
  }

  _getRawTiers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMER_TIERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _saveTiers(tiers) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMER_TIERS, JSON.stringify(tiers));
    this._notify();
    syncBus.publish('discount_tiers', { action: 'save', tiers });
  }


  // --- Static Enums ---
  getCategories() {
    return INITIAL_CATEGORIES;
  }

  getUnits() {
    return INITIAL_UNITS;
  }

  getCurrencies() {
    return CURRENCIES;
  }

  // --- Validation ---
  validateProduct(product, editingId = null) {
    const errors = {};
    if (!product.name || !product.name.trim()) {
      errors.name = 'Product Name is required';
    }
    if (product.basePrice === undefined || product.basePrice === null || Number(product.basePrice) <= 0) {
      errors.basePrice = 'Base Price must be greater than zero';
    }
    if (product.costPrice !== undefined && Number(product.costPrice) < 0) {
      errors.costPrice = 'Cost Price cannot be negative';
    }
    if (product.sku && product.sku.trim()) {
      const all = this._getRawProducts();
      const duplicate = all.find(
        (p) => p.sku && p.sku.toLowerCase() === product.sku.trim().toLowerCase() && p.id !== editingId
      );
      if (duplicate) {
        errors.sku = `SKU "${product.sku}" is already assigned to ${duplicate.name}`;
      }
    }
    return errors;
  }

  // --- Products CRUD (RESTful) ---
  getProducts({
    search = '',
    category = 'All',
    status = 'All',
    sortBy = 'name',
    sortDir = 'asc',
    page = 1,
    pageSize = 10,
  } = {}) {
    let items = [...this._getRawProducts()];

    // Search filter
    if (search && search.trim()) {
      const query = search.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.sku && p.sku.toLowerCase().includes(query)) ||
          (p.brand && p.brand.toLowerCase().includes(query)) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (category && category !== 'All') {
      items = items.filter((p) => p.category === category);
    }

    // Status filter
    if (status && status !== 'All') {
      items = items.filter((p) => p.status === status);
    }

    // Sorting
    items.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'margin') {
        const marginA = a.basePrice > 0 ? ((a.basePrice - (a.costPrice || 0)) / a.basePrice) * 100 : 0;
        const marginB = b.basePrice > 0 ? ((b.basePrice - (b.costPrice || 0)) / b.basePrice) * 100 : 0;
        valA = marginA;
        valB = marginB;
      }

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortDir === 'asc' ? numA - numB : numB - numA;
    });

    const total = items.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = items.slice(startIndex, startIndex + pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  getAllProducts() {
    return this._getRawProducts();
  }

  getProductById(id) {
    const products = this._getRawProducts();
    return products.find((p) => p.id === id) || null;
  }

  createProduct(productData) {
    const errors = this.validateProduct(productData);
    if (Object.keys(errors).length > 0) {
      throw new Error(Object.values(errors).join(', '));
    }

    const products = this._getRawProducts();
    const newProduct = {
      ...productData,
      id: 'prod_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      basePrice: Number(productData.basePrice),
      costPrice: productData.costPrice ? Number(productData.costPrice) : 0,
      taxRate: productData.taxRate !== undefined ? Number(productData.taxRate) : 18,
      stockQuantity: productData.stockQuantity ? Number(productData.stockQuantity) : 0,
      status: productData.status || 'Active',
      attributes: productData.attributes || [],
      variants: productData.variants || [],
      updatedAt: new Date().toISOString(),
    };

    products.unshift(newProduct);
    this._saveProducts(products);
    return newProduct;
  }

  updateProduct(id, updates) {
    const errors = this.validateProduct(updates, id);
    if (Object.keys(errors).length > 0) {
      throw new Error(Object.values(errors).join(', '));
    }

    const products = this._getRawProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');

    const updated = {
      ...products[index],
      ...updates,
      basePrice: Number(updates.basePrice ?? products[index].basePrice),
      costPrice: updates.costPrice !== undefined ? Number(updates.costPrice) : products[index].costPrice,
      taxRate: updates.taxRate !== undefined ? Number(updates.taxRate) : products[index].taxRate,
      stockQuantity: updates.stockQuantity !== undefined ? Number(updates.stockQuantity) : products[index].stockQuantity,
      updatedAt: new Date().toISOString(),
    };

    products[index] = updated;
    this._saveProducts(products);
    return updated;
  }

  deleteProduct(id) {
    const products = this._getRawProducts().filter((p) => p.id !== id);
    this._saveProducts(products);
    return true;
  }

  duplicateProduct(id) {
    const product = this.getProductById(id);
    if (!product) throw new Error('Product not found to duplicate');

    const copySuffix = ` (Copy ${Math.floor(100 + Math.random() * 900)})`;
    const newSku = product.sku ? `${product.sku}-CPY` : '';

    const newProduct = {
      ...product,
      id: 'prod_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: product.name + copySuffix,
      sku: newSku,
      status: 'Active',
      variants: (product.variants || []).map((v) => ({
        ...v,
        id: 'var_' + Math.random().toString(36).substring(2, 9),
        variantSku: v.variantSku ? `${v.variantSku}-CPY` : '',
      })),
      updatedAt: new Date().toISOString(),
    };

    const products = this._getRawProducts();
    products.unshift(newProduct);
    this._saveProducts(products);
    return newProduct;
  }

  archiveProduct(id) {
    return this.updateProduct(id, { status: 'Archived' });
  }

  restoreProduct(id) {
    return this.updateProduct(id, { status: 'Active' });
  }

  // --- Bulk Actions ---
  bulkDelete(productIds) {
    const idsSet = new Set(productIds);
    const remaining = this._getRawProducts().filter((p) => !idsSet.has(p.id));
    this._saveProducts(remaining);
    return true;
  }

  bulkUpdateStatus(productIds, status) {
    const idsSet = new Set(productIds);
    const updated = this._getRawProducts().map((p) => {
      if (idsSet.has(p.id)) {
        return { ...p, status, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    this._saveProducts(updated);
    return true;
  }

  /**
   * Bulk Price Update:
   * mode: 'PCT_INC' | 'PCT_DEC' | 'FIX_INC' | 'FIX_DEC'
   * value: number
   * category: string ('All' or specific category)
   * productIds: array of IDs (optional filter)
   */
  bulkUpdatePrices({ mode, value, category = 'All', productIds = null }) {
    const val = Number(value);
    if (isNaN(val) || val <= 0) {
      throw new Error('Price adjustment value must be greater than zero');
    }

    const targetIds = productIds ? new Set(productIds) : null;
    let affectedCount = 0;

    const updated = this._getRawProducts().map((p) => {
      const matchCategory = category === 'All' || p.category === category;
      const matchSelection = !targetIds || targetIds.has(p.id);

      if (matchCategory && matchSelection) {
        let newPrice = p.basePrice;
        if (mode === 'PCT_INC') newPrice = p.basePrice * (1 + val / 100);
        else if (mode === 'PCT_DEC') newPrice = Math.max(1, p.basePrice * (1 - val / 100));
        else if (mode === 'FIX_INC') newPrice = p.basePrice + val;
        else if (mode === 'FIX_DEC') newPrice = Math.max(1, p.basePrice - val);

        newPrice = Math.round(newPrice * 100) / 100;
        affectedCount++;

        // Also update variants proportionally if present
        const updatedVariants = (p.variants || []).map((v) => ({
          ...v,
          finalPrice: Math.round((newPrice + (Number(v.extraPrice) || 0)) * 100) / 100,
        }));

        return {
          ...p,
          basePrice: newPrice,
          variants: updatedVariants,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    this._saveProducts(updated);
    return { affectedCount };
  }

  // --- Variant Cartesian Generator ---
  generateVariantMatrix(attributes, basePrice, baseSku = '') {
    const validAttributes = attributes.filter(
      (a) => a.name && a.name.trim() && Array.isArray(a.values) && a.values.length > 0
    );

    if (validAttributes.length === 0) return [];

    // Cartesian product generator
    const cartesian = (arrays) => {
      return arrays.reduce(
        (acc, curr) => acc.flatMap((x) => curr.map((y) => [...x, y])),
        [[]]
      );
    };

    const valueArrays = validAttributes.map((attr) =>
      attr.values.map((val) => ({ attrName: attr.name, value: val }))
    );

    const combinations = cartesian(valueArrays);

    return combinations.map((combo, idx) => {
      const comboObj = {};
      const skuParts = [];
      combo.forEach((item) => {
        comboObj[item.attrName] = item.value;
        skuParts.push(item.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4));
      });

      const sku = baseSku ? `${baseSku}-${skuParts.join('-')}` : `VAR-${idx + 1}`;

      return {
        id: 'var_' + Math.random().toString(36).substring(2, 9),
        combination: comboObj,
        variantSku: sku,
        extraPrice: 0,
        finalPrice: Number(basePrice) || 0,
        barcode: '',
        stockQuantity: 50,
        status: 'Active',
      };
    });
  }

  // --- Price Lists (RESTful) ---
  getPriceLists() {
    return this._getRawPriceLists();
  }

  getPriceListById(id) {
    return this._getRawPriceLists().find((pl) => pl.id === id) || null;
  }

  createPriceList(data) {
    if (!data.name || !data.name.trim()) throw new Error('Price List Name is required');

    const priceLists = this._getRawPriceLists();
    const newPriceList = {
      ...data,
      id: 'pl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      currency: data.currency || 'INR',
      status: data.status || 'Active',
      tierPricing: data.tierPricing || {},
      currencyPricing: data.currencyPricing || {},
      updatedAt: new Date().toISOString(),
    };

    priceLists.unshift(newPriceList);
    this._savePriceLists(priceLists);
    return newPriceList;
  }

  updatePriceList(id, updates) {
    const priceLists = this._getRawPriceLists();
    const index = priceLists.findIndex((pl) => pl.id === id);
    if (index === -1) throw new Error('Price list not found');

    const updated = {
      ...priceLists[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    priceLists[index] = updated;
    this._savePriceLists(priceLists);
    return updated;
  }

  deletePriceList(id) {
    const priceLists = this._getRawPriceLists().filter((pl) => pl.id !== id);
    this._savePriceLists(priceLists);
    return true;
  }

  updateCustomerTierPrice(priceListId, productId, tierCode, price) {
    const priceLists = this._getRawPriceLists();
    const index = priceLists.findIndex((pl) => pl.id === priceListId);
    if (index === -1) throw new Error('Price list not found');

    const pl = priceLists[index];
    if (!pl.tierPricing) pl.tierPricing = {};
    if (!pl.tierPricing[productId]) pl.tierPricing[productId] = {};

    pl.tierPricing[productId][tierCode] = Number(price);
    pl.updatedAt = new Date().toISOString();

    priceLists[index] = pl;
    this._savePriceLists(priceLists);
    return pl;
  }

  updateCurrencyPrice(priceListId, productId, currencyCode, price) {
    const priceLists = this._getRawPriceLists();
    const index = priceLists.findIndex((pl) => pl.id === priceListId);
    if (index === -1) throw new Error('Price list not found');

    const pl = priceLists[index];
    if (!pl.currencyPricing) pl.currencyPricing = {};
    if (!pl.currencyPricing[productId]) pl.currencyPricing[productId] = {};

    pl.currencyPricing[productId][currencyCode] = Number(price);
    pl.updatedAt = new Date().toISOString();

    priceLists[index] = pl;
    this._savePriceLists(priceLists);
    return pl;
  }

  // --- Customer Tiers CRUD ---
  getCustomerTiers() {
    return this._getRawTiers().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  addCustomerTier(tierData) {
    if (!tierData.name || !tierData.code) {
      throw new Error('Tier Name and Code are required');
    }
    const tiers = this._getRawTiers();
    const codeUpper = tierData.code.toUpperCase().trim();
    if (tiers.some((t) => t.code === codeUpper)) {
      throw new Error(`Customer Tier with code "${codeUpper}" already exists`);
    }

    const newTier = {
      id: 'tier_' + Date.now().toString(36),
      name: tierData.name.trim(),
      code: codeUpper,
      defaultDiscount: Number(tierData.defaultDiscount) || 0,
      minOrderQty: Number(tierData.minOrderQty) || 1,
      sortOrder: tiers.length + 1,
    };

    tiers.push(newTier);
    this._saveTiers(tiers);
    return newTier;
  }

  deleteCustomerTier(id) {
    const tiers = this._getRawTiers().filter((t) => t.id !== id);
    this._saveTiers(tiers);
    return true;
  }
}

export const productService = new ProductService();
export default productService;
