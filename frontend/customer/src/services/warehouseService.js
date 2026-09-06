/**
 * warehouseService.js — Full-featured client service for Warehouse & Fulfillment Operations
 * Governs multi-facility stock allocation, product-to-warehouse mappings, sum calculations,
 * replenishment thresholds, and weighted shipping auto-split optimization.
 */

import {
  INITIAL_WAREHOUSES,
  INITIAL_WAREHOUSE_INVENTORY,
  SAMPLE_FULFILLMENT_ORDERS,
} from '../data/warehouseData';
import productService from './productService';

import syncBus from '../utils/syncBus';

const STORAGE_KEYS = {
  WAREHOUSES: 'dealflow_warehouses_v2',
  INVENTORY: 'dealflow_warehouse_inventory_v2',
  ORDERS: 'dealflow_fulfillment_orders_v2',
};

class WarehouseService {
  constructor() {
    this.listeners = new Set();
    this._init();
    this._initSyncBus();
  }

  _init() {
    if (!localStorage.getItem(STORAGE_KEYS.WAREHOUSES)) {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(INITIAL_WAREHOUSES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_WAREHOUSE_INVENTORY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(SAMPLE_FULFILLMENT_ORDERS));
    }
  }

  _initSyncBus() {
    syncBus.subscribe('warehouses', (payload) => {
      try {
        if (payload?.warehouses && Array.isArray(payload.warehouses)) {
          localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(payload.warehouses));
        } else if (payload?.warehouse && payload?.action === 'create') {
          const items = this._getRawWarehouses();
          if (!items.some((w) => w.id === payload.warehouse.id)) {
            items.push(payload.warehouse);
            localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(items));
          }
        }
        if (payload?.inventory) {
          const invList = this._getRawInventory();
          const idx = invList.findIndex((inv) => inv.warehouseId === payload.inventory.warehouseId && inv.productId === payload.inventory.productId);
          if (idx !== -1) {
            invList[idx] = { ...invList[idx], ...payload.inventory };
          } else {
            invList.push(payload.inventory);
          }
          localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(invList));
        }
      } catch (err) {
        console.error('[Customer WarehouseService] Error in sync handler:', err);
      }
      this._notify();
    });

    syncBus.subscribe('fulfillment_orders', (payload) => {
      try {
        if (payload?.orders && Array.isArray(payload.orders)) {
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(payload.orders));
        }
      } catch (err) {
        console.error('[Customer WarehouseService] Error in orders sync handler:', err);
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
        console.error('Error in warehouseService listener:', err);
      }
    });
  }

  // --- Storage Accessors ---
  _getRawWarehouses() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WAREHOUSES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _saveWarehouses(warehouses) {
    localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(warehouses));
    this._notify();
    syncBus.publish('warehouses', { action: 'save', warehouses });
  }

  _getRawInventory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _saveInventory(inventory) {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    this._notify();
    syncBus.publish('warehouses', { action: 'save_inventory', inventory });
  }

  _getRawOrders() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _saveOrders(orders) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this._notify();
    syncBus.publish('fulfillment_orders', { action: 'save_orders', orders });
  }


  // --- Warehouse Facility Management ---
  getWarehouses() {
    return this._getRawWarehouses().sort((a, b) => (a.priorityRank || 99) - (b.priorityRank || 99));
  }

  getWarehouseById(id) {
    return this._getRawWarehouses().find((w) => w.id === id) || null;
  }

  createWarehouse(warehouseData) {
    if (!warehouseData.name || !warehouseData.name.trim()) {
      throw new Error('Warehouse Name is required');
    }
    const warehouses = this._getRawWarehouses();
    const code = (warehouseData.code || `WH-${warehouseData.name.substring(0, 4).toUpperCase()}`).trim();

    if (warehouses.some((w) => w.code.toLowerCase() === code.toLowerCase())) {
      throw new Error(`Warehouse with code "${code}" already exists.`);
    }

    const newWarehouse = {
      ...warehouseData,
      id: 'wh_' + Date.now().toString(36),
      name: warehouseData.name.trim(),
      code,
      baseShippingCost: Number(warehouseData.baseShippingCost) || 25.0,
      shippingWeightFactor: Number(warehouseData.shippingWeightFactor) || 1.0,
      priorityRank: Number(warehouseData.priorityRank) || warehouses.length + 1,
      capacityUnits: Number(warehouseData.capacityUnits) || 3000,
      status: warehouseData.status || 'Active',
      updatedAt: new Date().toISOString(),
    };

    warehouses.push(newWarehouse);
    this._saveWarehouses(warehouses);

    // Initialize inventory records for existing products
    const products = productService.getAllProducts();
    const currentInventory = this._getRawInventory();
    products.forEach((p) => {
      currentInventory.push({
        id: 'inv_' + Math.random().toString(36).substring(2, 9),
        warehouseId: newWarehouse.id,
        productId: p.id,
        onHand: 0,
        reserved: 0,
        reorderPoint: 10,
        replenishmentQty: 25,
        leadTimeDays: 5,
        autoReplenish: true,
        lastReplenished: new Date().toISOString(),
      });
    });
    this._saveInventory(currentInventory);

    return newWarehouse;
  }

  updateWarehouse(id, updates) {
    const warehouses = this._getRawWarehouses();
    const index = warehouses.findIndex((w) => w.id === id);
    if (index === -1) throw new Error('Warehouse not found');

    const updated = {
      ...warehouses[index],
      ...updates,
      baseShippingCost: updates.baseShippingCost !== undefined ? Number(updates.baseShippingCost) : warehouses[index].baseShippingCost,
      shippingWeightFactor: updates.shippingWeightFactor !== undefined ? Number(updates.shippingWeightFactor) : warehouses[index].shippingWeightFactor,
      priorityRank: updates.priorityRank !== undefined ? Number(updates.priorityRank) : warehouses[index].priorityRank,
      capacityUnits: updates.capacityUnits !== undefined ? Number(updates.capacityUnits) : warehouses[index].capacityUnits,
      updatedAt: new Date().toISOString(),
    };

    warehouses[index] = updated;
    this._saveWarehouses(warehouses);
    return updated;
  }

  deleteWarehouse(id) {
    const warehouses = this._getRawWarehouses().filter((w) => w.id !== id);
    const inventory = this._getRawInventory().filter((inv) => inv.warehouseId !== id);
    this._saveWarehouses(warehouses);
    this._saveInventory(inventory);
    return true;
  }

  // --- Product-to-Warehouse Inventory & Sum Calculations ---
  /**
   * Retrieves enriched inventory list for a specific warehouse
   */
  getInventoryByWarehouse(warehouseId) {
    const allInventory = this._getRawInventory();
    const products = productService.getAllProducts();
    const whInventory = allInventory.filter((inv) => inv.warehouseId === warehouseId);

    return whInventory.map((inv) => {
      const product = products.find((p) => p.id === inv.productId) || {
        name: 'Unknown Product',
        sku: 'UNKNOWN',
        category: 'General',
        basePrice: 0,
        unit: 'Piece',
      };

      const available = Math.max(0, (inv.onHand || 0) - (inv.reserved || 0));
      const isReorderTriggered = available <= (inv.reorderPoint || 0);

      return {
        ...inv,
        product,
        available,
        isReorderTriggered,
      };
    });
  }

  /**
   * Calculates key summary metrics for a warehouse:
   * - Total distinct products
   * - Total Sum of Units of all products in this warehouse
   * - Total inventory valuation
   * - Stock health / Low stock count
   */
  getWarehouseSummary(warehouseId) {
    const warehouse = this.getWarehouseById(warehouseId);
    if (!warehouse) return null;

    const inventory = this.getInventoryByWarehouse(warehouseId);
    const totalDistinctProducts = inventory.length;

    // SUM OF PRODUCT IN WAREHOUSE
    const totalProductUnits = inventory.reduce((sum, item) => sum + (Number(item.onHand) || 0), 0);
    const totalReservedUnits = inventory.reduce((sum, item) => sum + (Number(item.reserved) || 0), 0);
    const totalAvailableUnits = Math.max(0, totalProductUnits - totalReservedUnits);

    const totalValuation = inventory.reduce(
      (sum, item) => sum + (Number(item.onHand) || 0) * (item.product?.basePrice || 0),
      0
    );

    const lowStockCount = inventory.filter((item) => item.available <= item.reorderPoint).length;
    const capacityPct = warehouse.capacityUnits > 0
      ? Math.min(100, Math.round((totalProductUnits / warehouse.capacityUnits) * 100))
      : 0;

    return {
      warehouse,
      totalDistinctProducts,
      totalProductUnits,
      totalReservedUnits,
      totalAvailableUnits,
      totalValuation,
      lowStockCount,
      capacityPct,
    };
  }

  /**
   * Global aggregated metrics across all warehouses
   */
  getAllWarehousesSummary() {
    const warehouses = this.getWarehouses();
    const summaries = warehouses.map((w) => this.getWarehouseSummary(w.id)).filter(Boolean);

    const globalSumUnits = summaries.reduce((acc, s) => acc + s.totalProductUnits, 0);
    const globalReservedUnits = summaries.reduce((acc, s) => acc + s.totalReservedUnits, 0);
    const globalAvailableUnits = summaries.reduce((acc, s) => acc + s.totalAvailableUnits, 0);
    const globalValuation = summaries.reduce((acc, s) => acc + s.totalValuation, 0);
    const totalLowStockAlerts = summaries.reduce((acc, s) => acc + s.lowStockCount, 0);

    return {
      totalWarehouses: warehouses.length,
      globalSumUnits,
      globalReservedUnits,
      globalAvailableUnits,
      globalValuation,
      totalLowStockAlerts,
      summaries,
    };
  }

  /**
   * Returns product stock distribution across all warehouses and global sum
   */
  getProductStockAcrossWarehouses(productId) {
    const allInventory = this._getRawInventory();
    const warehouses = this.getWarehouses();

    const distribution = warehouses.map((wh) => {
      const inv = allInventory.find((i) => i.warehouseId === wh.id && i.productId === productId);
      const onHand = inv ? Number(inv.onHand) || 0 : 0;
      const reserved = inv ? Number(inv.reserved) || 0 : 0;
      const available = Math.max(0, onHand - reserved);

      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseCode: wh.code,
        onHand,
        reserved,
        available,
      };
    });

    const totalOnHand = distribution.reduce((sum, d) => sum + d.onHand, 0);
    const totalReserved = distribution.reduce((sum, d) => sum + d.reserved, 0);
    const totalAvailable = Math.max(0, totalOnHand - totalReserved);

    return {
      productId,
      totalOnHand,
      totalReserved,
      totalAvailable,
      distribution,
    };
  }

  /**
   * Add a product to a warehouse's inventory
   */
  addProductToWarehouse(warehouseId, data) {
    if (!warehouseId || !data.productId) {
      throw new Error('Warehouse ID and Product ID are required.');
    }

    const inventory = this._getRawInventory();
    const existing = inventory.find(
      (i) => i.warehouseId === warehouseId && i.productId === data.productId
    );

    if (existing) {
      throw new Error('This product is already stocked in this warehouse. Please edit the existing record.');
    }

    const newRecord = {
      id: 'inv_' + Math.random().toString(36).substring(2, 9),
      warehouseId,
      productId: data.productId,
      onHand: Math.max(0, Number(data.onHand) || 0),
      reserved: Math.max(0, Number(data.reserved) || 0),
      reorderPoint: Math.max(0, Number(data.reorderPoint) || 15),
      replenishmentQty: Math.max(1, Number(data.replenishmentQty) || 50),
      leadTimeDays: Math.max(1, Number(data.leadTimeDays) || 7),
      autoReplenish: data.autoReplenish !== undefined ? Boolean(data.autoReplenish) : true,
      lastReplenished: new Date().toISOString(),
    };

    inventory.push(newRecord);
    this._saveInventory(inventory);
    return newRecord;
  }

  /**
   * Update an existing product's inventory configuration in a warehouse
   */
  updateWarehouseProduct(warehouseId, productId, updates) {
    const inventory = this._getRawInventory();
    const record = inventory.find(
      (i) => i.warehouseId === warehouseId && i.productId === productId
    );

    if (!record) {
      throw new Error('Inventory record not found in this warehouse.');
    }

    if (updates.onHand !== undefined) record.onHand = Math.max(0, Number(updates.onHand));
    if (updates.reserved !== undefined) record.reserved = Math.max(0, Number(updates.reserved));
    if (updates.reorderPoint !== undefined) record.reorderPoint = Math.max(0, Number(updates.reorderPoint));
    if (updates.replenishmentQty !== undefined) record.replenishmentQty = Math.max(1, Number(updates.replenishmentQty));
    if (updates.leadTimeDays !== undefined) record.leadTimeDays = Math.max(1, Number(updates.leadTimeDays));
    if (updates.autoReplenish !== undefined) record.autoReplenish = Boolean(updates.autoReplenish);

    this._saveInventory(inventory);
    return record;
  }

  /**
   * Remove / delete a product from a warehouse facility
   */
  removeProductFromWarehouse(warehouseId, productId) {
    const inventory = this._getRawInventory().filter(
      (i) => !(i.warehouseId === warehouseId && i.productId === productId)
    );
    this._saveInventory(inventory);
    return true;
  }

  /**
   * Adjust stock for a product in a warehouse
   */
  adjustStock(warehouseId, productId, deltaQuantity, reason = 'Cycle count adjustment') {
    const inventory = this._getRawInventory();
    let record = inventory.find((i) => i.warehouseId === warehouseId && i.productId === productId);

    const delta = Number(deltaQuantity);
    if (isNaN(delta)) throw new Error('Invalid quantity adjustment');

    if (!record) {
      record = {
        id: 'inv_' + Math.random().toString(36).substring(2, 9),
        warehouseId,
        productId,
        onHand: Math.max(0, delta),
        reserved: 0,
        reorderPoint: 10,
        replenishmentQty: 25,
        leadTimeDays: 5,
        autoReplenish: true,
        lastReplenished: new Date().toISOString(),
      };
      inventory.push(record);
    } else {
      record.onHand = Math.max(0, (record.onHand || 0) + delta);
    }

    this._saveInventory(inventory);
    return record;
  }

  /**
   * Update replenishment rules for a product in a warehouse
   */
  updateReplenishmentRules(warehouseId, productId, { reorderPoint, replenishmentQty, leadTimeDays, autoReplenish }) {
    const inventory = this._getRawInventory();
    const record = inventory.find((i) => i.warehouseId === warehouseId && i.productId === productId);
    if (!record) throw new Error('Inventory record not found');

    if (reorderPoint !== undefined) record.reorderPoint = Math.max(0, Number(reorderPoint));
    if (replenishmentQty !== undefined) record.replenishmentQty = Math.max(1, Number(replenishmentQty));
    if (leadTimeDays !== undefined) record.leadTimeDays = Math.max(1, Number(leadTimeDays));
    if (autoReplenish !== undefined) record.autoReplenish = Boolean(autoReplenish);

    this._saveInventory(inventory);
    return record;
  }

  /**
   * Trigger manual or automated restock
   */
  triggerReplenishment(warehouseId, productId) {
    const inventory = this._getRawInventory();
    const record = inventory.find((i) => i.warehouseId === warehouseId && i.productId === productId);
    if (!record) throw new Error('Inventory record not found');

    const restockAmount = record.replenishmentQty || 25;
    record.onHand = (record.onHand || 0) + restockAmount;
    record.lastReplenished = new Date().toISOString();

    this._saveInventory(inventory);
    return { restockAmount, newTotal: record.onHand };
  }

  // --- Heuristic Auto-Split & Shipping Cost Weighting Engine ---
  /**
   * Evaluates order items across warehouses with the following goals:
   * 1. MINIMIZE NUMBER OF SHIPMENTS (consolidated single shipment preferred).
   * 2. OPTIMIZE SHIPPING COST WEIGHTING:
   *    Estimated Cost = Base Shipping Fee + (Total Units * Unit Handling Rate * Shipping Weight Factor)
   * 3. Accurately detect and isolate backordered quantities with expected landing dates.
   */
  calculateOptimalSplit(orderItems = []) {
    const warehouses = this.getWarehouses().filter((w) => w.status === 'Active');
    const allInventory = this._getRawInventory();

    // Map items requested
    const itemsReq = orderItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      requestedQty: Number(item.requestedQty) || 1,
    }));

    const totalRequestedUnits = itemsReq.reduce((acc, it) => acc + it.requestedQty, 0);

    // Check stock per warehouse
    const whStockMap = {};
    warehouses.forEach((wh) => {
      whStockMap[wh.id] = {
        warehouse: wh,
        stockByProduct: {},
        canFulfillAll: true,
      };

      itemsReq.forEach((item) => {
        const inv = allInventory.find((i) => i.warehouseId === wh.id && i.productId === item.productId);
        const available = inv ? Math.max(0, (inv.onHand || 0) - (inv.reserved || 0)) : 0;
        whStockMap[wh.id].stockByProduct[item.productId] = available;

        if (available < item.requestedQty) {
          whStockMap[wh.id].canFulfillAll = false;
        }
      });
    });

    // Helper to calculate weighted shipping cost
    const calculateWarehouseCost = (wh, units) => {
      const unitRate = 1.5; // Base per-unit dispatch fee
      const weightMultiplier = wh.shippingWeightFactor || 1.0;
      return Math.round((wh.baseShippingCost + units * unitRate * weightMultiplier) * 100) / 100;
    };

    // Strategy 1: Look for a Single Warehouse that can fulfill 100% of items (Zero Split)
    const singleFulfillers = warehouses.filter((wh) => whStockMap[wh.id].canFulfillAll);

    if (singleFulfillers.length > 0) {
      // Pick the single warehouse with the lowest weighted shipping cost
      singleFulfillers.sort((a, b) => {
        const costA = calculateWarehouseCost(a, totalRequestedUnits);
        const costB = calculateWarehouseCost(b, totalRequestedUnits);
        return costA - costB;
      });

      const bestWh = singleFulfillers[0];
      const shippingCost = calculateWarehouseCost(bestWh, totalRequestedUnits);

      return {
        strategy: 'SINGLE_WAREHOUSE_CONSOLIDATED',
        totalShipments: 1,
        totalShippingCost: shippingCost,
        allocations: [
          {
            warehouseId: bestWh.id,
            warehouseName: bestWh.name,
            warehouseCode: bestWh.code,
            allocatedUnits: totalRequestedUnits,
            shippingCost,
            items: itemsReq.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              allocatedQty: it.requestedQty,
            })),
          },
        ],
        backorders: [],
      };
    }

    // Strategy 2: Greedy Multi-Warehouse Split to minimize split count
    // Sort warehouses by priority and available stock
    const sortedWarehouses = [...warehouses].sort((a, b) => {
      return (a.priorityRank || 99) - (b.priorityRank || 99);
    });

    const remainingToAllocate = {};
    itemsReq.forEach((it) => {
      remainingToAllocate[it.productId] = it.requestedQty;
    });

    const allocations = [];
    let totalShippingCost = 0;

    sortedWarehouses.forEach((wh) => {
      const allocatedItemsForWh = [];
      let whTotalAllocated = 0;

      itemsReq.forEach((it) => {
        const remaining = remainingToAllocate[it.productId];
        if (remaining > 0) {
          const availableInWh = whStockMap[wh.id].stockByProduct[it.productId] || 0;
          if (availableInWh > 0) {
            const take = Math.min(remaining, availableInWh);
            allocatedItemsForWh.push({
              productId: it.productId,
              productName: it.productName,
              allocatedQty: take,
            });
            remainingToAllocate[it.productId] -= take;
            whTotalAllocated += take;
          }
        }
      });

      if (whTotalAllocated > 0) {
        const whCost = calculateWarehouseCost(wh, whTotalAllocated);
        totalShippingCost += whCost;
        allocations.push({
          warehouseId: wh.id,
          warehouseName: wh.name,
          warehouseCode: wh.code,
          allocatedUnits: whTotalAllocated,
          shippingCost: whCost,
          items: allocatedItemsForWh,
        });
      }
    });

    // Check for unfulfilled backorders
    const backorders = [];
    itemsReq.forEach((it) => {
      const unfulfilled = remainingToAllocate[it.productId];
      if (unfulfilled > 0) {
        backorders.push({
          productId: it.productId,
          productName: it.productName,
          backorderQty: unfulfilled,
          expectedLandingDays: 7,
          targetDepot: 'East Depot',
        });
      }
    });

    return {
      strategy: allocations.length > 1 ? 'MULTI_WAREHOUSE_SPLIT' : 'PARTIAL_WITH_BACKORDER',
      totalShipments: allocations.length,
      totalShippingCost: Math.round(totalShippingCost * 100) / 100,
      allocations,
      backorders,
    };
  }

  // --- Fulfillment Orders ---
  getFulfillmentOrders() {
    return this._getRawOrders();
  }

  getFulfillmentOrderById(id) {
    return this._getRawOrders().find((o) => o.id === id) || null;
  }
}

export const warehouseService = new WarehouseService();
export default warehouseService;
