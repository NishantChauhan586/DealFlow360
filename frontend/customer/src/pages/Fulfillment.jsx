import { useState, useEffect, useMemo, useCallback } from 'react';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import {
  IconTruck,
  IconBox,
  IconSliders,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconCheck,
} from '../components/Icons';
import WarehouseModal from '../components/fulfillment/WarehouseModal';
import StockAdjustmentModal from '../components/fulfillment/StockAdjustmentModal';
import ReplenishmentRulesModal from '../components/fulfillment/ReplenishmentRulesModal';
import WarehouseProductModal from '../components/fulfillment/WarehouseProductModal';
import ConfirmDialog from '../components/products/ConfirmDialog';
import styles from './Fulfillment.module.css';

export default function Fulfillment({ user }) {
  // Current user & role permissions
  const [currentUser] = useState(() => {
    if (user) return user;
    try {
      const saved = localStorage.getItem('dealflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'finance';
  const isAdmin = canManage;

  // Active Tab: 'inventory' | 'facilities' | 'autosplit'
  const [activeTab, setActiveTab] = useState('autosplit');

  // Warehouses & Selection
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('wh_main');

  // Search & Filter in Inventory table
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [targetStockItem, setTargetStockItem] = useState(null);

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [targetRulesItem, setTargetRulesItem] = useState(null);

  const [isWhProductModalOpen, setIsWhProductModalOpen] = useState(false);
  const [editingWhProductItem, setEditingWhProductItem] = useState(null);

  // Auto-split & Manual Override state
  const [selectedOrderId, setSelectedOrderId] = useState('ORD-4821');
  const [splitResult, setSplitResult] = useState(null);
  const [isConsolidated, setIsConsolidated] = useState(false);
  const [isManualOverrideOpen, setIsManualOverrideOpen] = useState(false);
  const [manualAllocations, setManualAllocations] = useState({});

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    onConfirm: () => {},
  });

  // Toast feedback
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Load / Refresh Data
  const refreshData = useCallback(() => {
    const whs = warehouseService.getWarehouses();
    setWarehouses(whs);

    if (whs.length > 0 && !whs.some((w) => w.id === selectedWarehouseId)) {
      setSelectedWarehouseId(whs[0].id);
    }
  }, [selectedWarehouseId]);

  useEffect(() => {
    refreshData();
    const unsubscribe = warehouseService.subscribe(refreshData);
    return () => unsubscribe();
  }, [refreshData]);

  // Active selected warehouse
  const activeWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0] || null;
  }, [warehouses, selectedWarehouseId]);

  // Summary of selected warehouse (including sum of products)
  const warehouseSummary = useMemo(() => {
    if (!activeWarehouse) return null;
    return warehouseService.getWarehouseSummary(activeWarehouse.id);
  }, [activeWarehouse, warehouses]);

  // Global summary across all facilities
  const globalSummary = useMemo(() => {
    return warehouseService.getAllWarehousesSummary();
  }, [warehouses]);

  // Inventory items for the selected warehouse
  const rawInventory = useMemo(() => {
    if (!activeWarehouse) return [];
    return warehouseService.getInventoryByWarehouse(activeWarehouse.id);
  }, [activeWarehouse, warehouses]);

  // Filtered Inventory items
  const filteredInventory = useMemo(() => {
    return rawInventory.filter((item) => {
      const matchSearch =
        !search.trim() ||
        (item.product?.name || '').toLowerCase().includes(search.toLowerCase().trim()) ||
        (item.product?.sku || '').toLowerCase().includes(search.toLowerCase().trim());

      const matchCategory =
        selectedCategory === 'All' || item.product?.category === selectedCategory;

      let matchStatus = true;
      if (statusFilter === 'Healthy') matchStatus = !item.isReorderTriggered;
      else if (statusFilter === 'Reorder') matchStatus = item.isReorderTriggered;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [rawInventory, search, selectedCategory, statusFilter]);

  // Auto Split Simulator Calculation
  const orders = useMemo(() => warehouseService.getFulfillmentOrders(), []);
  const activeOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0];
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (activeOrder && activeOrder.items) {
      const result = warehouseService.calculateOptimalSplit(activeOrder.items);
      setSplitResult(result);
      setIsConsolidated(false);
    }
  }, [activeOrder, warehouses]);

  // Actions: Warehouse CRUD
  const handleOpenCreateWarehouse = () => {
    if (!isAdmin) return;
    setEditingWarehouse(null);
    setIsWarehouseModalOpen(true);
  };

  const handleOpenEditWarehouse = (wh) => {
    if (!isAdmin) return;
    setEditingWarehouse(wh);
    setIsWarehouseModalOpen(true);
  };

  const handleSaveWarehouse = (formData) => {
    try {
      if (editingWarehouse) {
        warehouseService.updateWarehouse(editingWarehouse.id, formData);
        showToast(`Warehouse "${formData.name}" updated successfully.`);
      } else {
        const created = warehouseService.createWarehouse(formData);
        setSelectedWarehouseId(created.id);
        showToast(`Warehouse "${formData.name}" created.`);
      }
      setIsWarehouseModalOpen(false);
      setEditingWarehouse(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteWarehouse = (wh) => {
    if (!isAdmin) return;
    setConfirmDialog({
      isOpen: true,
      title: `Delete Facility — ${wh.name}`,
      message: `Are you sure you want to remove ${wh.name}? Inventory records will be detached.`,
      confirmText: 'Delete Facility',
      isDestructive: true,
      onConfirm: () => {
        warehouseService.deleteWarehouse(wh.id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast(`Warehouse "${wh.name}" removed.`);
      },
    });
  };

  // Actions: Stock & Replenishment
  const handleOpenStockAdjust = (item) => {
    if (!isAdmin) return;
    setTargetStockItem(item);
    setIsStockModalOpen(true);
  };

  const handleConfirmStockAdjust = (whId, prodId, delta, reason) => {
    try {
      warehouseService.adjustStock(whId, prodId, delta, reason);
      setIsStockModalOpen(false);
      setTargetStockItem(null);
      showToast(`Stock adjusted successfully: ${delta >= 0 ? `+${delta}` : delta} units.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenRules = (item) => {
    if (!isAdmin) return;
    setTargetRulesItem(item);
    setIsRulesModalOpen(true);
  };

  const handleSaveRules = (whId, prodId, rules) => {
    try {
      warehouseService.updateReplenishmentRules(whId, prodId, rules);
      setIsRulesModalOpen(false);
      setTargetRulesItem(null);
      showToast('Replenishment & safety thresholds updated.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTriggerRestock = (whId, prodId) => {
    try {
      const res = warehouseService.triggerReplenishment(whId, prodId);
      setIsRulesModalOpen(false);
      setTargetRulesItem(null);
      showToast(`Restock successful: Received +${res.restockAmount} units. New total: ${res.newTotal}.`);
    } catch (err) {
      alert(err.message);
    }
  };

  // Product in Warehouse Actions (Create, Update, Delete)
  const handleOpenAddWhProduct = () => {
    if (!isAdmin) return;
    setEditingWhProductItem(null);
    setIsWhProductModalOpen(true);
  };

  const handleOpenEditWhProduct = (item) => {
    if (!isAdmin) return;
    setEditingWhProductItem(item);
    setIsWhProductModalOpen(true);
  };

  const handleSaveWhProduct = (formData) => {
    try {
      if (editingWhProductItem) {
        warehouseService.updateWarehouseProduct(activeWarehouse.id, editingWhProductItem.productId, formData);
        showToast(`Updated "${editingWhProductItem.product?.name}" in ${activeWarehouse.name}.`);
      } else {
        warehouseService.addProductToWarehouse(activeWarehouse.id, formData);
        showToast(`Successfully stocked product in ${activeWarehouse.name}.`);
      }
      setIsWhProductModalOpen(false);
      setEditingWhProductItem(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteWhProduct = (item) => {
    if (!isAdmin) return;
    setConfirmDialog({
      isOpen: true,
      title: `Remove Product from ${activeWarehouse.name}`,
      message: `Are you sure you want to remove "${item.product?.name}" from ${activeWarehouse.name}? The inventory records for this facility will be permanently deleted.`,
      confirmText: 'Remove Product',
      isDestructive: true,
      onConfirm: () => {
        warehouseService.removeProductFromWarehouse(activeWarehouse.id, item.productId);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast(`Removed "${item.product?.name}" from ${activeWarehouse.name}.`);
      },
    });
  };

  // Backorder Consolidation Action
  const handleConsolidateBackorder = () => {
    setIsConsolidated(true);
    showToast('Consolidated into a single scheduled shipment landing at East Depot on Sept 12.');
  };

  return (
    <div className={styles.container}>
      {/* Toast Banner */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            background: toast.type === 'error' ? 'var(--rose)' : 'var(--burnham)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0, 34, 28, 0.25)',
            zIndex: 1100,
            fontSize: '13.5px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <IconCheck style={{ width: 16, height: 16 }} />
          {toast.message}
        </div>
      )}

      {/* Main Header & Tab Navigation */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <h2>Warehouse & Fulfillment Operations</h2>
            <p>
              Facility management, stock aggregation per warehouse node, replenishment thresholds, and weighted auto-split optimization
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!isAdmin && (
              <span style={{ fontSize: '12px', color: 'var(--amber)', fontWeight: 600, background: 'var(--amber-100)', padding: '4px 10px', borderRadius: '4px' }}>
                Read-Only Access
              </span>
            )}
            <button
              type="button"
              className="btn btn-dark"
              onClick={handleOpenCreateWarehouse}
              disabled={!isAdmin}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconPlus style={{ width: 15, height: 15 }} /> Add Warehouse Facility
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'inventory' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <IconBox style={{ width: 16, height: 16 }} />
            Warehouse Inventory & Product Sums
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'facilities' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('facilities')}
          >
            <IconTruck style={{ width: 16, height: 16 }} />
            Facilities & Shipping Cost Weights <span className={styles.tabBadge}>{warehouses.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'autosplit' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('autosplit')}
          >
            <IconSliders style={{ width: 16, height: 16 }} />
            Intelligent Auto-Split Simulator
          </button>
        </div>
      </div>

      {/* ----------------- TAB 1: WAREHOUSE INVENTORY & PRODUCT SUMS ----------------- */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Global Aggregate Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Facilities</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--burnham)', marginTop: '4px' }} className="tnum">
                {globalSummary.totalWarehouses} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--ink-40)' }}>Nodes</span>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Global Stock Units (All Warehouses)</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--viridian-600)', marginTop: '4px' }} className="tnum">
                {globalSummary.globalSumUnits.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--ink-40)' }}>units</span>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Available to Dispatch</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--burnham)', marginTop: '4px' }} className="tnum">
                {globalSummary.globalAvailableUnits.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--ink-40)' }}>units</span>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Low Stock / Reorder Flags</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: globalSummary.totalLowStockAlerts > 0 ? 'var(--amber)' : 'var(--burnham)', marginTop: '4px' }} className="tnum">
                {globalSummary.totalLowStockAlerts}
              </div>
            </div>
          </div>

          {/* Facility Selector Chips Bar with Sum of Products Badge */}
          <div className={styles.facilitySelectorBar}>
            <span className={styles.facilityLabel}>Select Facility:</span>
            {warehouses.map((wh) => {
              const summary = warehouseService.getWarehouseSummary(wh.id);
              const isSelected = wh.id === selectedWarehouseId;

              return (
                <button
                  key={wh.id}
                  type="button"
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={`${styles.facilityChip} ${isSelected ? styles.activeChip : ''}`}
                >
                  <span>{wh.name}</span>
                  {/* SUM OF PRODUCT IN WAREHOUSE BADGE */}
                  <span className={styles.chipCountBadge} title="Total product units in warehouse">
                    {summary ? summary.totalProductUnits : 0} units
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Facility Summary Card */}
          {warehouseSummary && (
            <div className={styles.summaryBanner}>
              <div className={styles.summaryCol}>
                <span className={styles.label}>Facility Name & Code</span>
                <span className={styles.value} style={{ fontSize: '17px' }}>
                  {activeWarehouse.name} ({activeWarehouse.code})
                </span>
                <span style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  {activeWarehouse.location}
                </span>
              </div>

              {/* SUM OF PRODUCT IN WAREHOUSE */}
              <div className={styles.summaryCol}>
                <span className={styles.label}>Sum of Total Product Units</span>
                <span className={styles.value} style={{ color: 'var(--viridian-600)' }}>
                  {warehouseSummary.totalProductUnits.toLocaleString()} units
                </span>
                <span style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  {warehouseSummary.totalDistinctProducts} distinct products stocked
                </span>
              </div>

              <div className={styles.summaryCol}>
                <span className={styles.label}>Available to Fulfill</span>
                <span className={styles.value}>
                  {warehouseSummary.totalAvailableUnits.toLocaleString()} units
                </span>
                <span style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  Reserved for orders: {warehouseSummary.totalReservedUnits} units
                </span>
              </div>

              <div className={styles.summaryCol}>
                <span className={styles.label}>Inventory Valuation</span>
                <span className={styles.value}>
                  ₹{warehouseSummary.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  Capacity utilization: {warehouseSummary.capacityPct}%
                </span>
              </div>
            </div>
          )}

          {/* Search and Filters for Inventory Table */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#fff', padding: '12px 18px', border: '1px solid var(--line)', borderRadius: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', position: 'relative' }}>
              <IconSearch style={{ position: 'absolute', left: 10, width: 15, height: 15, color: 'var(--ink-40)' }} />
              <input
                type="text"
                placeholder="Search products in this warehouse by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  padding: '7px 12px 7px 32px',
                  fontSize: '13px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '12.5px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
              >
                {productService.getCategories().map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '12.5px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
              >
                <option value="All">All Stock Statuses</option>
                <option value="Healthy">Healthy Stock</option>
                <option value="Reorder">Reorder Triggered / Low</option>
              </select>

              {isAdmin && (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleOpenAddWhProduct}
                  title={`Stock a product into ${activeWarehouse?.name || 'this warehouse'}`}
                >
                  <IconPlus style={{ width: 14, height: 14 }} />
                  Stock Product
                </button>
              )}
            </div>
          </div>

          {/* Product Inventory Table (Lists products in this warehouse) */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.inventoryTable}>
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Category</th>
                    <th>On-Hand Stock</th>
                    <th>Reserved</th>
                    <th>Available</th>
                    <th>Reorder Point</th>
                    <th>Batch Restock</th>
                    <th>Lead Time</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-40)' }}>
                        No products found matching the criteria in this warehouse.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className={styles.productCell}>
                              {item.product?.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className={styles.thumbnail}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className={styles.thumbnail} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--viridian)' }}>
                                  <IconBox style={{ width: 18, height: 18 }} />
                                </div>
                              )}
                              <div className={styles.productInfo}>
                                <span className={styles.productName}>{item.product?.name}</span>
                                <div className={styles.productSub}>
                                  <span className={styles.skuBadge}>{item.product?.sku}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span style={{ background: 'var(--paper-2)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 500 }}>
                              {item.product?.category}
                            </span>
                          </td>

                          <td>
                            <strong className="tnum" style={{ color: 'var(--burnham)', fontSize: '13.5px' }}>
                              {item.onHand} {item.product?.unit || 'units'}
                            </strong>
                          </td>

                          <td>
                            <span className="tnum" style={{ color: 'var(--ink-60)', fontSize: '12.5px' }}>
                              {item.reserved}
                            </span>
                          </td>

                          <td>
                            <span
                              className="tnum"
                              style={{
                                fontWeight: 700,
                                color: item.available <= item.reorderPoint ? 'var(--rose)' : 'var(--viridian-600)',
                                fontSize: '13.5px',
                              }}
                            >
                              {item.available}
                            </span>
                          </td>

                          <td>
                            <span className="tnum" style={{ fontSize: '12.5px', color: 'var(--ink-60)' }}>
                              ≤ {item.reorderPoint}
                            </span>
                          </td>

                          <td>
                            <span className="tnum" style={{ fontSize: '12.5px', color: 'var(--ink)' }}>
                              +{item.replenishmentQty}
                            </span>
                          </td>

                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--ink-60)' }}>
                              {item.leadTimeDays} days
                            </span>
                          </td>

                          <td>
                            {item.available === 0 ? (
                              <span className={styles.stockBadgeReorder}>Out of Stock</span>
                            ) : item.isReorderTriggered ? (
                              <span className={styles.stockBadgeLow}>Reorder Triggered</span>
                            ) : (
                              <span className={styles.stockBadgeHealthy}>Healthy</span>
                            )}
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div className={styles.actionBtnGroup}>
                              <button
                                type="button"
                                className={styles.smallBtn}
                                onClick={() => handleOpenEditWhProduct(item)}
                                disabled={!isAdmin}
                                title="Edit product stock & rules in this facility"
                              >
                                <IconEdit style={{ width: 12, height: 12, marginRight: 3, verticalAlign: -1 }} />
                                Edit
                              </button>
                              <button
                                type="button"
                                className={styles.smallBtn}
                                onClick={() => handleOpenStockAdjust(item)}
                                disabled={!isAdmin}
                                title="Adjust on-hand quantity"
                              >
                                Adjust
                              </button>
                              <button
                                type="button"
                                className={styles.smallBtn}
                                onClick={() => handleOpenRules(item)}
                                disabled={!isAdmin}
                                title="Configure safety thresholds & lead time"
                              >
                                Rules
                              </button>
                              <button
                                type="button"
                                className={styles.smallBtnDanger}
                                onClick={() => handleDeleteWhProduct(item)}
                                disabled={!isAdmin}
                                title="Remove product from this warehouse"
                              >
                                <IconTrash style={{ width: 12, height: 12 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: WAREHOUSE FACILITIES & SHIPPING COST WEIGHTING ----------------- */}
      {activeTab === 'facilities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--burnham)' }}>
                  Warehouse Facilities & Shipping Cost Weighting Setup
                </h3>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-60)', marginTop: '3px' }}>
                  Define dispatch fees and regional cost multipliers utilized by the auto-split algorithm to minimize split shipments.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-dark"
                onClick={handleOpenCreateWarehouse}
                disabled={!isAdmin}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus style={{ width: 14, height: 14 }} /> New Facility
              </button>
            </div>

            <div className={styles.facilityGrid}>
              {warehouses.map((wh) => {
                const summary = warehouseService.getWarehouseSummary(wh.id);

                return (
                  <div key={wh.id} className={styles.facilityCard}>
                    <div className={styles.facilityTop}>
                      <div>
                        <h4 className={styles.facilityTitle}>{wh.name}</h4>
                        <div className={styles.facilityLoc}>{wh.location}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-40)', marginTop: '2px' }}>
                          Code: <strong style={{ color: 'var(--burnham)' }}>{wh.code}</strong>
                        </div>
                      </div>
                      <span
                        className={`tag ${wh.status === 'Active' ? 'tag-green' : 'tag-amber'}`}
                        style={{ fontSize: '11px' }}
                      >
                        {wh.status}
                      </span>
                    </div>

                    <div className={styles.metaGrid}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Base Dispatch Fee</span>
                        <span className={`${styles.metaVal} tnum`}>${wh.baseShippingCost.toFixed(2)}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Weight Cost Factor</span>
                        <span className={`${styles.metaVal} tnum`}>{wh.shippingWeightFactor}x</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Priority Rank</span>
                        <span className={`${styles.metaVal} tnum`}>#{wh.priorityRank} Priority</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Total Stock Sum</span>
                        <span className={`${styles.metaVal} tnum`} style={{ color: 'var(--viridian-600)' }}>
                          {summary ? summary.totalProductUnits : 0} units
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>
                        Capacity: <strong className="tnum">{wh.capacityUnits}</strong> units
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleOpenEditWarehouse(wh)}
                          disabled={!isAdmin}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          <IconEdit style={{ width: 13, height: 13 }} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleDeleteWarehouse(wh)}
                          disabled={!isAdmin || warehouses.length <= 1}
                          style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--rose)' }}
                        >
                          <IconTrash style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: FULFILLMENT & WAREHOUSE SPLIT SCREEN ----------------- */}
      {activeTab === 'autosplit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.splitCard}>
            <div className={styles.splitHeader}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--burnham)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconTruck style={{ width: 20, height: 20, color: 'var(--viridian-600)' }} />
                  Fulfillment & Warehouse Split Management
                </h3>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  Evaluates live on-hand stock across facilities to generate optimal warehouse routing, minimize freight cost, and manage backorder consolidations.
                </div>
              </div>

              {/* Order Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-60)' }}>Active Order:</span>
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    setIsConsolidated(false);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    background: '#fff',
                    fontWeight: 600,
                    color: 'var(--burnham)'
                  }}
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.customerName} ({o.destinationRegion})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Split Metrics Summary */}
            {splitResult && (
              <div
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Customer & Destination
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--burnham)', marginTop: '2px' }}>
                    {activeOrder.customerName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>
                    Region: {activeOrder.destinationRegion}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Fulfillment Strategy
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--burnham)', marginTop: '2px' }}>
                    {isConsolidated ? (
                      <span style={{ color: 'var(--viridian-600)' }}>✓ Backorder Consolidated</span>
                    ) : splitResult.totalShipments === 1 ? (
                      <span style={{ color: 'var(--viridian-600)' }}>Single Facility Dispatch</span>
                    ) : (
                      <span style={{ color: 'var(--amber)' }}>Multi-Warehouse Split Required</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Estimated Shipment Count
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                    <span className={`tag ${isConsolidated || splitResult.totalShipments === 1 ? 'tag-viridian' : 'tag-amber'}`}>
                      {isConsolidated ? '1 Consolidated Shipment' : `${splitResult.totalShipments} Separate Shipments`}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Estimated Shipping Freight Cost
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--burnham)', marginTop: '2px' }} className="tnum">
                    ${isConsolidated ? '35.00' : splitResult.totalShippingCost.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Warehouse Split Cards Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--burnham)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Recommended Warehouse Split Allocation based on Live Stock</span>
                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--ink-60)' }}>
                  Total Requested: <strong>{activeOrder.items.reduce((s, i) => s + i.requestedQty, 0)} units</strong>
                </span>
              </div>

              {splitResult &&
                splitResult.allocations.map((alloc, idx) => {
                  const totalReq = activeOrder.items.reduce((sum, it) => sum + it.requestedQty, 0);
                  const pct = totalReq > 0 ? Math.round((alloc.allocatedUnits / totalReq) * 100) : 0;
                  const estShipmentCount = alloc.allocatedUnits > 50 ? 2 : 1;

                  return (
                    <div
                      key={alloc.warehouseId}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--burnham)' }}>
                              🏢 {alloc.warehouseName}
                            </span>
                            <span className="tag tag-viridian" style={{ fontSize: '10.5px' }}>
                              Priority #{idx + 1} Node
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                            Live Stock Fulfillment Allocation for Order {activeOrder.id}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-60)', display: 'block' }}>Estimated Freight Cost</span>
                          <strong style={{ fontSize: '16px', color: 'var(--burnham)' }} className="tnum">
                            ${alloc.shippingCost.toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      {/* Details Grid: Warehouse Name, Quantity Fulfilled, Shipment Count & Cost */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', background: 'var(--paper-2)', padding: '12px 14px', borderRadius: '6px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: 'var(--ink-60)', display: 'block', fontSize: '11px' }}>Warehouse Facility</span>
                          <strong>{alloc.warehouseName}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--ink-60)', display: 'block', fontSize: '11px' }}>Quantity Fulfilled</span>
                          <strong style={{ color: 'var(--viridian-600)' }} className="tnum">
                            {alloc.allocatedUnits} units ({pct}% of order)
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--ink-60)', display: 'block', fontSize: '11px' }}>Estimated Shipment Count</span>
                          <strong style={{ color: 'var(--burnham)' }}>
                            {estShipmentCount} Package{estShipmentCount > 1 ? 's' : ''} (Standard Freight)
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--ink-60)', display: 'block', fontSize: '11px' }}>Routing Fee Breakdown</span>
                          <span>Base Fee: ${alloc.shippingCost > 20 ? (alloc.shippingCost - 12).toFixed(2) : '15.00'} + Weight</span>
                        </div>
                      </div>

                      {/* Visual Allocation Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, height: '8px', background: 'var(--paper-2)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--viridian-600)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                        </div>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-60)' }}>{pct}% Allocated</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Mid-Fulfillment Stock Arrival & Backorder Consolidation Prompt */}
            {!isConsolidated && splitResult && splitResult.backorders && splitResult.backorders.length > 0 && (
              <div style={{
                background: 'rgba(235, 172, 50, 0.08)',
                border: '1px solid var(--amber)',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>⚡</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--burnham)' }}>
                      Automatic Mid-Fulfillment Stock Arrival Alert
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                      Stock for remaining <strong>{splitResult.backorders.reduce((sum, b) => sum + b.backorderQty, 0)} backordered units</strong> arrived mid-fulfillment at East Depot. Consolidate into a single shipment?
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={handleConsolidateBackorder}
                  style={{ fontSize: '12.5px', fontWeight: 700, padding: '8px 16px', background: 'var(--amber)', color: '#000', border: 'none' }}
                >
                  Consolidate Remaining Backorder
                </button>
              </div>
            )}

            {isConsolidated && (
              <div style={{ background: 'rgba(67, 138, 126, 0.12)', border: '1px solid var(--viridian-600)', padding: '14px 20px', borderRadius: '8px', fontSize: '13px', color: 'var(--viridian-600)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconCheck style={{ width: 18, height: 18 }} />
                <span>Consolidated Remaining Backorder: Order merged into 1 single dispatch from East Depot upon stock receipt! Freight savings applied.</span>
              </div>
            )}

            {/* Action Buttons: Accept Suggested Split & Manual Override */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => showToast('Suggested warehouse split accepted and committed to fulfillment dispatch queue.')}
                disabled={!isAdmin}
                style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 700 }}
              >
                Accept Suggested Split
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsManualOverrideOpen(true)}
                disabled={!isAdmin}
                style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 700 }}
              >
                Manual Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Modal */}
      {isManualOverrideOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 22, 18, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--paper)',
            borderRadius: '12px',
            border: '1px solid var(--line)',
            width: '100%',
            maxWidth: '560px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--burnham)' }}>
              Manual Warehouse Allocation Override — {activeOrder.id}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginBottom: '16px' }}>
              Override algorithm recommendations and manually assign dispatch quantities per warehouse facility.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {warehouses.map(wh => {
                const existingAlloc = splitResult?.allocations?.find(a => a.warehouseId === wh.id);
                const currentQty = manualAllocations[wh.id] !== undefined ? manualAllocations[wh.id] : (existingAlloc?.allocatedUnits || 0);

                return (
                  <div key={wh.id} style={{ background: 'var(--paper-2)', padding: '12px 16px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--burnham)' }}>{wh.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-60)' }}>{wh.location} · Base Fee: ${wh.baseShippingCost}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        value={currentQty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setManualAllocations(prev => ({ ...prev, [wh.id]: val }));
                        }}
                        style={{ width: '80px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)', fontSize: '13px', fontWeight: 700, textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--ink-60)' }}>units</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsManualOverrideOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => {
                  setIsManualOverrideOpen(false);
                  showToast('Manual warehouse split override saved and applied.');
                }}
              >
                Apply Custom Split Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Facility Modal */}
      <WarehouseModal
        isOpen={isWarehouseModalOpen}
        warehouse={editingWarehouse}
        onClose={() => {
          setIsWarehouseModalOpen(false);
          setEditingWarehouse(null);
        }}
        onSave={handleSaveWarehouse}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isStockModalOpen}
        warehouse={activeWarehouse}
        productItem={targetStockItem}
        onClose={() => {
          setIsStockModalOpen(false);
          setTargetStockItem(null);
        }}
        onAdjust={handleConfirmStockAdjust}
      />

      {/* Replenishment Rules Modal */}
      <ReplenishmentRulesModal
        isOpen={isRulesModalOpen}
        warehouse={activeWarehouse}
        productItem={targetRulesItem}
        onClose={() => {
          setIsRulesModalOpen(false);
          setTargetRulesItem(null);
        }}
        onSaveRules={handleSaveRules}
        onTriggerRestock={handleTriggerRestock}
      />

      {/* Product in Warehouse (Create / Edit) Modal */}
      <WarehouseProductModal
        isOpen={isWhProductModalOpen}
        warehouse={activeWarehouse}
        existingItem={editingWhProductItem}
        onClose={() => {
          setIsWhProductModalOpen(false);
          setEditingWhProductItem(null);
        }}
        onSave={handleSaveWhProduct}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
