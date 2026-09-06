import { useState, useEffect, useMemo, useCallback } from 'react';
import productService from '../services/productService';
import CustomerProductCatalog from './CustomerProductCatalog';
import {
  IconBox,
  IconTag,
  IconSliders,
  IconCopy,
  IconLayers,
  IconEdit,
  IconTrash,
  IconArchive,
  IconPlus,
  IconSearch,
  IconCheck,
} from '../components/Icons';
import ProductModal from '../components/products/ProductModal';
import PriceListModal from '../components/products/PriceListModal';
import BulkPriceModal from '../components/products/BulkPriceModal';
import ConfirmDialog from '../components/products/ConfirmDialog';
import styles from './ProductManagement.module.css';

export default function ProductManagement({ user }) {
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

  // Customer role gets the consumer-facing catalog, not the admin governance view
  if (currentUser?.role === 'customer') {
    return <CustomerProductCatalog user={currentUser} />;
  }

  // Navigation tabs: 'products' | 'pricelists' | 'bulk'
  const [activeTab, setActiveTab] = useState('products');

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected products for bulk operations
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Data states
  const [productsData, setProductsData] = useState({ items: [], total: 0, totalPages: 1 });
  const [priceLists, setPriceLists] = useState([]);
  const [customerTiers, setCustomerTiers] = useState([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState(null);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState(null);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    onConfirm: () => {},
  });

  // Toast Notification state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch / Refresh data
  const loadData = useCallback(() => {
    const result = productService.getProducts({
      search,
      category: selectedCategory,
      status: selectedStatus,
      sortBy,
      sortDir,
      page,
      pageSize,
    });
    setProductsData(result);

    const pls = productService.getPriceLists();
    setPriceLists(pls);
    if (pls.length > 0 && !selectedPriceListId) {
      setSelectedPriceListId(pls[0].id);
    }

    setCustomerTiers(productService.getCustomerTiers());
  }, [search, selectedCategory, selectedStatus, sortBy, sortDir, page, pageSize, selectedPriceListId]);

  useEffect(() => {
    loadData();
    const unsubscribe = productService.subscribe(loadData);
    return () => unsubscribe();
  }, [loadData]);

  // Overall catalog metrics
  const catalogStats = useMemo(() => {
    const all = productService.getAllProducts();
    const activeCount = all.filter((p) => p.status === 'Active').length;
    const lowStockCount = all.filter((p) => p.trackStock && p.stockQuantity <= (p.lowStockThreshold || 10)).length;
    const totalMargin = all.reduce((acc, p) => {
      const m = p.basePrice > 0 ? ((p.basePrice - (p.costPrice || 0)) / p.basePrice) * 100 : 0;
      return acc + m;
    }, 0);
    const avgMargin = all.length > 0 ? (totalMargin / all.length).toFixed(1) : '0.0';

    return {
      total: all.length,
      active: activeCount,
      lowStock: lowStockCount,
      avgMargin,
    };
  }, [productsData]);

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(productsData.items.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Product CRUD actions
  const handleOpenCreateProduct = () => {
    if (!isAdmin) {
      showToast('Admin permission required to create products', 'error');
      return;
    }
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product) => {
    if (!isAdmin) {
      showToast('Admin permission required to edit products', 'error');
      return;
    }
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (formData) => {
    try {
      if (editingProduct) {
        productService.updateProduct(editingProduct.id, formData);
        showToast(`Product "${formData.name}" updated successfully.`);
      } else {
        productService.createProduct(formData);
        showToast(`Product "${formData.name}" created successfully.`);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDuplicateProduct = (product) => {
    if (!isAdmin) return;
    try {
      const copy = productService.duplicateProduct(product.id);
      showToast(`Duplicated "${product.name}" as "${copy.name}".`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleArchiveToggle = (product) => {
    if (!isAdmin) return;
    if (product.status === 'Archived') {
      productService.restoreProduct(product.id);
      showToast(`Restored "${product.name}" to Active.`);
    } else {
      productService.archiveProduct(product.id);
      showToast(`Archived "${product.name}".`);
    }
  };

  const handleDeleteProduct = (product) => {
    if (!isAdmin) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Product',
      message: `Are you sure you want to permanently delete "${product.name}"? This action cannot be undone.`,
      confirmText: 'Delete Product',
      isDestructive: true,
      onConfirm: () => {
        productService.deleteProduct(product.id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
        showToast(`Product "${product.name}" deleted.`);
      },
    });
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (!isAdmin || selectedIds.size === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${selectedIds.size} Products`,
      message: `Are you sure you want to delete all ${selectedIds.size} selected products?`,
      confirmText: 'Delete Selected',
      isDestructive: true,
      onConfirm: () => {
        productService.bulkDelete(Array.from(selectedIds));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setSelectedIds(new Set());
        showToast(`Successfully deleted ${selectedIds.size} products.`);
      },
    });
  };

  const handleBulkStatus = (status) => {
    if (!isAdmin || selectedIds.size === 0) return;
    productService.bulkUpdateStatus(Array.from(selectedIds), status);
    setSelectedIds(new Set());
    showToast(`Updated status to "${status}" for selected products.`);
  };

  const handleApplyBulkPrice = (payload) => {
    try {
      const result = productService.bulkUpdatePrices(payload);
      setIsBulkModalOpen(false);
      setSelectedIds(new Set());
      showToast(`Successfully updated prices across ${result.affectedCount} product(s).`);
    } catch (err) {
      alert(err.message);
    }
  };

  // Price List CRUD
  const handleSavePriceList = (formData) => {
    try {
      if (editingPriceList) {
        productService.updatePriceList(editingPriceList.id, formData);
        showToast(`Price List "${formData.name}" updated.`);
      } else {
        const created = productService.createPriceList(formData);
        setSelectedPriceListId(created.id);
        showToast(`Price List "${formData.name}" established.`);
      }
      setIsPriceListModalOpen(false);
      setEditingPriceList(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePriceList = (pl) => {
    if (!isAdmin) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Price List',
      message: `Are you sure you want to remove the price list "${pl.name}"?`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        productService.deletePriceList(pl.id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setSelectedPriceListId(null);
        showToast(`Price list "${pl.name}" deleted.`);
      },
    });
  };

  const selectedPriceList = useMemo(() => {
    return priceLists.find((pl) => pl.id === selectedPriceListId) || priceLists[0] || null;
  }, [priceLists, selectedPriceListId]);

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

      {/* Header Card with Metrics & Tabs */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <h2>Product & Price List Governance</h2>
            <p>
              Unified CPQ catalog management, Cartesian SKU variant generation, multi-tier pricing, and multi-currency matrix
            </p>
          </div>

          <div className={styles.headerActions}>
            {!isAdmin && (
              <span style={{ fontSize: '12px', color: 'var(--amber)', fontWeight: 600, background: 'var(--amber-100)', padding: '4px 10px', borderRadius: '4px' }}>
                Read-Only Access
              </span>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => setIsBulkModalOpen(true)}
              disabled={!isAdmin}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconSliders style={{ width: 15, height: 15 }} /> Bulk Pricing Update
            </button>
            <button
              className="btn btn-dark"
              onClick={handleOpenCreateProduct}
              disabled={!isAdmin}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconPlus style={{ width: 15, height: 15 }} /> Add New Product
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'products' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <IconBox style={{ width: 16, height: 16 }} />
            Catalog Products <span className={styles.tabBadge}>{catalogStats.total}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'pricelists' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('pricelists')}
          >
            <IconTag style={{ width: 16, height: 16 }} />
            Price Lists & Customer Tiers <span className={styles.tabBadge}>{priceLists.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'bulk' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('bulk')}
          >
            <IconSliders style={{ width: 16, height: 16 }} />
            Pricing Rules & Bulk Adjustments
          </button>
        </div>
      </div>

      {/* ----------------- TAB 1: PRODUCTS CATALOG ----------------- */}
      {activeTab === 'products' && (
        <>
          {/* Quick Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Products</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--burnham)', marginTop: '4px' }} className="tnum">
                {catalogStats.active} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--ink-40)' }}>/ {catalogStats.total}</span>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average Margin</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--viridian-600)', marginTop: '4px' }} className="tnum">
                {catalogStats.avgMargin}%
              </div>
            </div>

            <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Low Stock Warnings</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: catalogStats.lowStock > 0 ? 'var(--amber)' : 'var(--burnham)', marginTop: '4px' }} className="tnum">
                {catalogStats.lowStock}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Price Schedules</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--burnham)', marginTop: '4px' }} className="tnum">
                {priceLists.filter((pl) => pl.status === 'Active').length}
              </div>
            </div>
          </div>

          {/* Toolbar & Filters */}
          <div className={styles.toolbarCard}>
            <div className={styles.searchGroup}>
              <IconSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search products by name, SKU, brand, or specs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className={styles.selectInput}
              >
                {productService.getCategories().map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className={styles.selectInput}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>

              <select
                value={`${sortBy}:${sortDir}`}
                onChange={(e) => {
                  const [b, d] = e.target.value.split(':');
                  setSortBy(b);
                  setSortDir(d);
                }}
                className={styles.selectInput}
              >
                <option value="name:asc">Name (A → Z)</option>
                <option value="name:desc">Name (Z → A)</option>
                <option value="basePrice:desc">Price: High to Low</option>
                <option value="basePrice:asc">Price: Low to High</option>
                <option value="margin:desc">Margin: High to Low</option>
                <option value="stockQuantity:asc">Stock: Low to High</option>
              </select>
            </div>
          </div>

          {/* Floating Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className={styles.bulkBar}>
              <div className={styles.bulkInfo}>
                <span className={styles.bulkBadge}>{selectedIds.size}</span>
                <span>product{selectedIds.size === 1 ? '' : 's'} selected</span>
              </div>
              <div className={styles.bulkActions}>
                <button
                  type="button"
                  className={styles.btnBulkAction}
                  onClick={() => setIsBulkModalOpen(true)}
                >
                  <IconSliders style={{ width: 14, height: 14 }} /> Bulk Price Adjustment
                </button>
                <button
                  type="button"
                  className={styles.btnBulkAction}
                  onClick={() => handleBulkStatus('Active')}
                >
                  Mark Active
                </button>
                <button
                  type="button"
                  className={styles.btnBulkAction}
                  onClick={() => handleBulkStatus('Inactive')}
                >
                  Mark Inactive
                </button>
                <button
                  type="button"
                  className={`${styles.btnBulkAction} ${styles.btnBulkDanger}`}
                  onClick={handleBulkDelete}
                >
                  <IconTrash style={{ width: 14, height: 14 }} /> Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Products Data Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.catalogTable}>
                <thead>
                  <tr>
                    <th style={{ width: '38px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={
                          productsData.items.length > 0 &&
                          productsData.items.every((p) => selectedIds.has(p.id))
                        }
                        onChange={handleSelectAll}
                        style={{ accentColor: 'var(--viridian)' }}
                      />
                    </th>
                    <th>Product & SKU</th>
                    <th>Category</th>
                    <th>Base Price</th>
                    <th>Cost Price</th>
                    <th>Gross Margin</th>
                    <th>Unit</th>
                    <th>Variants</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.items.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-40)' }}>
                        No products match the selected search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    productsData.items.map((product) => {
                      const basePrice = Number(product.basePrice) || 0;
                      const costPrice = Number(product.costPrice) || 0;
                      const margin = basePrice > 0 ? ((basePrice - costPrice) / basePrice) * 100 : 0;
                      const variantCount = (product.variants || []).length;
                      const isLowStock = product.trackStock && product.stockQuantity <= (product.lowStockThreshold || 10);

                      let marginClass = styles.marginHigh;
                      if (margin < 20) marginClass = styles.marginLow;
                      else if (margin < 35) marginClass = styles.marginMed;

                      return (
                        <tr key={product.id}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onChange={() => handleSelectRow(product.id)}
                              style={{ accentColor: 'var(--viridian)' }}
                            />
                          </td>

                          <td>
                            <div className={styles.productCell}>
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className={styles.thumbnail}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div
                                  className={styles.thumbnail}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--viridian)',
                                  }}
                                >
                                  <IconBox style={{ width: 18, height: 18 }} />
                                </div>
                              )}
                              <div className={styles.productInfo}>
                                <span className={styles.productName}>{product.name}</span>
                                <div className={styles.productSub}>
                                  {product.sku ? <span className={styles.skuBadge}>{product.sku}</span> : null}
                                  {product.brand ? <span> · {product.brand}</span> : null}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                background: 'var(--paper-2)',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 500,
                              }}
                            >
                              {product.category}
                            </span>
                          </td>

                          <td>
                            <strong className="tnum" style={{ color: 'var(--burnham)', fontSize: '13.5px' }}>
                              ₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </td>

                          <td>
                            <span className="tnum" style={{ color: 'var(--ink-60)', fontSize: '12.5px' }}>
                              ₹{costPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>

                          <td>
                            <span className={`${styles.marginPill} ${marginClass} tnum`}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>

                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--ink-60)' }}>{product.unit || 'Piece'}</span>
                          </td>

                          <td>
                            {variantCount > 0 ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'var(--viridian-100)',
                                  color: 'var(--viridian-600)',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                }}
                              >
                                <IconLayers style={{ width: 12, height: 12 }} /> {variantCount} variant{variantCount === 1 ? '' : 's'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--ink-40)' }}>—</span>
                            )}
                          </td>

                          <td>
                            {product.trackStock ? (
                              <span
                                className="tnum"
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  color: isLowStock ? 'var(--rose)' : 'var(--burnham)',
                                }}
                              >
                                {product.stockQuantity}
                                {isLowStock && (
                                  <span style={{ fontSize: '10.5px', marginLeft: '4px', color: 'var(--rose)' }}>
                                    (Low)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: 'var(--ink-40)' }}>Unmetered</span>
                            )}
                          </td>

                          <td>
                            <span
                              className={`tag ${
                                product.status === 'Active'
                                  ? 'tag-green'
                                  : product.status === 'Archived'
                                  ? 'tag-amber'
                                  : 'tag-red'
                              }`}
                              style={{ fontSize: '11px' }}
                            >
                              {product.status}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div className={styles.actionButtonGroup}>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                title="Edit Product"
                                onClick={() => handleOpenEditProduct(product)}
                                disabled={!isAdmin}
                              >
                                <IconEdit style={{ width: 15, height: 15 }} />
                              </button>

                              <button
                                type="button"
                                className={styles.iconBtn}
                                title="Duplicate Product"
                                onClick={() => handleDuplicateProduct(product)}
                                disabled={!isAdmin}
                              >
                                <IconCopy style={{ width: 14, height: 14 }} />
                              </button>

                              <button
                                type="button"
                                className={styles.iconBtn}
                                title={product.status === 'Archived' ? 'Restore Product' : 'Archive Product'}
                                onClick={() => handleArchiveToggle(product)}
                                disabled={!isAdmin}
                              >
                                <IconArchive style={{ width: 14, height: 14 }} />
                              </button>

                              <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                title="Delete Product"
                                onClick={() => handleDeleteProduct(product)}
                                disabled={!isAdmin}
                              >
                                <IconTrash style={{ width: 14, height: 14 }} />
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

            {/* Pagination Controls */}
            <div className={styles.paginationBar}>
              <div>
                Showing{' '}
                <strong className="tnum">
                  {productsData.total === 0 ? 0 : (page - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="tnum">
                  {Math.min(page * pageSize, productsData.total)}
                </strong>{' '}
                of <strong className="tnum">{productsData.total}</strong> products
              </div>

              <div className={styles.paginationControls}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  Per page:
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '3px',
                      border: '1px solid var(--line)',
                      fontSize: '12px',
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                  Page {page} of {productsData.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={page >= productsData.totalPages}
                  onClick={() => setPage((p) => Math.min(productsData.totalPages, p + 1))}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ----------------- TAB 2: PRICE LISTS & TIERS ----------------- */}
      {activeTab === 'pricelists' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section: Price Lists Schedule Cards */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--burnham)' }}>
                  Active Price Lists ({priceLists.length})
                </h3>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-60)', marginTop: '3px' }}>
                  Select a price schedule to inspect tier pricing matrices and multi-currency conversions
                </div>
              </div>

              <button
                type="button"
                className="btn btn-dark"
                onClick={() => {
                  setEditingPriceList(null);
                  setIsPriceListModalOpen(true);
                }}
                disabled={!isAdmin}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus style={{ width: 14, height: 14 }} /> Create Price List
              </button>
            </div>

            <div className={styles.priceListGrid}>
              {priceLists.map((pl) => {
                const isSelected = selectedPriceList?.id === pl.id;
                return (
                  <div
                    key={pl.id}
                    className={`${styles.priceListCard} ${isSelected ? styles.activeCard : ''}`}
                    onClick={() => setSelectedPriceListId(pl.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.cardTop}>
                      <div>
                        <h4 className={styles.cardTitle}>{pl.name}</h4>
                        <div className={styles.cardSub}>{pl.description || 'No description provided.'}</div>
                      </div>
                      <span
                        className={`tag ${pl.status === 'Active' ? 'tag-green' : pl.status === 'Draft' ? 'tag-amber' : 'tag-red'}`}
                        style={{ fontSize: '11px' }}
                      >
                        {pl.status}
                      </span>
                    </div>

                    <div className={styles.cardMeta}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Currency:</span>
                        <span className={styles.metaValue}>{pl.currency}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Customer Scope:</span>
                        <span className={styles.metaValue}>{pl.customerType || 'Direct'}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Effective Window:</span>
                        <span className={styles.metaValue}>{pl.effectiveDate} → {pl.expiryDate || 'Indefinite'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', color: isSelected ? 'var(--viridian-600)' : 'var(--ink-40)', fontWeight: 600 }}>
                        {isSelected ? '● Currently Active View' : 'Click to inspect matrix'}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="Edit Price List"
                          onClick={() => {
                            setEditingPriceList(pl);
                            setIsPriceListModalOpen(true);
                          }}
                          disabled={!isAdmin}
                        >
                          <IconEdit style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          title="Delete Price List"
                          onClick={() => handleDeletePriceList(pl)}
                          disabled={!isAdmin}
                        >
                          <IconTrash style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Customer Tier Pricing Matrix */}
          {selectedPriceList && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--burnham)' }}>
                    Customer Tier Pricing Matrix — {selectedPriceList.name}
                  </h3>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-60)', marginTop: '3px' }}>
                    Specific rates and discount structures across customer groups (Retail, Wholesale, Distributor, VIP, Dealer)
                  </div>
                </div>

                <span style={{ fontSize: '12px', background: 'var(--viridian-100)', color: 'var(--viridian-600)', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>
                  Currency: {selectedPriceList.currency}
                </span>
              </div>

              <div className={styles.tierTableWrapper}>
                <table className={styles.tierTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Base Price</th>
                      {customerTiers.map((tier) => (
                        <th key={tier.id}>
                          {tier.name}
                          <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--ink-60)' }}>
                            MOQ: {tier.minOrderQty}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productService.getAllProducts().map((prod) => {
                      const plTierObj = selectedPriceList.tierPricing?.[prod.id] || {};

                      return (
                        <tr key={prod.id}>
                          <td style={{ fontWeight: 600, color: 'var(--burnham)' }}>
                            {prod.name}
                            <div style={{ fontSize: '11px', color: 'var(--ink-60)', fontWeight: 400 }}>{prod.sku}</div>
                          </td>
                          <td>
                            <strong className="tnum">${prod.basePrice}</strong>
                          </td>
                          {customerTiers.map((tier) => {
                            const currentVal = plTierObj[tier.code] !== undefined ? plTierObj[tier.code] : Math.round(prod.basePrice * (1 - tier.defaultDiscount / 100));
                            const discountPct = prod.basePrice > 0 ? (((prod.basePrice - currentVal) / prod.basePrice) * 100).toFixed(0) : 0;

                            return (
                              <td key={tier.id}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    disabled={!isAdmin}
                                    value={currentVal}
                                    onChange={(e) => {
                                      productService.updateCustomerTierPrice(
                                        selectedPriceList.id,
                                        prod.id,
                                        tier.code,
                                        e.target.value
                                      );
                                    }}
                                    className={styles.tierPriceInput}
                                  />
                                  <span style={{ fontSize: '11px', color: discountPct > 0 ? 'var(--viridian-600)' : 'var(--ink-40)', fontWeight: 600 }}>
                                    {discountPct > 0 ? `-${discountPct}%` : '0%'}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: Multi-Currency Pricing Table */}
          {selectedPriceList && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--burnham)' }}>
                  Multi-Currency Product Pricing Schedule
                </h3>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-60)', marginTop: '3px' }}>
                  Governed rate conversion for international territories (INR, USD, EUR, AED, GBP)
                </div>
              </div>

              <div className={styles.tierTableWrapper}>
                <table className={styles.tierTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Base (INR)</th>
                      <th>INR (₹)</th>
                      <th>EUR (€)</th>
                      <th>AED (AED)</th>
                      <th>GBP (£)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productService.getAllProducts().map((prod) => {
                      const currObj = selectedPriceList.currencyPricing?.[prod.id] || {};

                      return (
                        <tr key={prod.id}>
                          <td style={{ fontWeight: 600, color: 'var(--burnham)' }}>
                            {prod.name}
                          </td>
                          <td>
                            <strong className="tnum">${prod.basePrice}</strong>
                          </td>

                          {['INR', 'EUR', 'AED', 'GBP'].map((code) => {
                            const currencyMeta = productService.getCurrencies().find((c) => c.code === code);
                            const defaultConverted = Math.round(prod.basePrice * (currencyMeta?.rateToBase || 1) * 100) / 100;
                            const currentVal = currObj[code] !== undefined ? currObj[code] : defaultConverted;

                            return (
                              <td key={code}>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  disabled={!isAdmin}
                                  value={currentVal}
                                  onChange={(e) => {
                                    productService.updateCurrencyPrice(
                                      selectedPriceList.id,
                                      prod.id,
                                      code,
                                      e.target.value
                                    );
                                  }}
                                  className={styles.tierPriceInput}
                                  style={{ width: '100px' }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 3: BULK OPERATIONS & GOVERNANCE ----------------- */}
      {activeTab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--burnham)' }}>
              Commercial Pricing Governance & Bulk Operations
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-60)', marginTop: '4px', lineHeight: 1.5 }}>
              DealFlow360 guarantees deterministic price limits and margin ceilings. Execute system-wide commercial adjustments
              or category-wide tariff changes safely with automated audit simulation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ border: '1px solid var(--line)', padding: '18px', borderRadius: '6px', background: 'var(--paper)' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--burnham)' }}>Hardware Price Recalibration</h4>
                <p style={{ fontSize: '12px', color: 'var(--ink-60)', margin: '6px 0 14px 0' }}>
                  Adjust all Hardware SKUs by percentage or fixed dollar amount based on component supply chain deltas.
                </p>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={!isAdmin}
                  style={{ fontSize: '12px' }}
                >
                  Configure Hardware Adjustment
                </button>
              </div>

              <div style={{ border: '1px solid var(--line)', padding: '18px', borderRadius: '6px', background: 'var(--paper)' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--burnham)' }}>Subscription & SaaS Annual Indexing</h4>
                <p style={{ fontSize: '12px', color: 'var(--ink-60)', margin: '6px 0 14px 0' }}>
                  Apply annual inflation or packaging adjustments across recurring subscription items.
                </p>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={!isAdmin}
                  style={{ fontSize: '12px' }}
                >
                  Configure Subscription Index
                </button>
              </div>

              <div style={{ border: '1px solid var(--line)', padding: '18px', borderRadius: '6px', background: 'var(--paper)' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--burnham)' }}>ProServices Rate Card</h4>
                <p style={{ fontSize: '12px', color: 'var(--ink-60)', margin: '6px 0 14px 0' }}>
                  Update engineering billing day rates and onsite delivery fees.
                </p>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={!isAdmin}
                  style={{ fontSize: '12px' }}
                >
                  Configure Services Rate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Create / Edit Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={editingProduct}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
      />

      {/* Price List Create / Edit Modal */}
      <PriceListModal
        isOpen={isPriceListModalOpen}
        priceList={editingPriceList}
        onClose={() => {
          setIsPriceListModalOpen(false);
          setEditingPriceList(null);
        }}
        onSave={handleSavePriceList}
      />

      {/* Bulk Price Adjustment Modal */}
      <BulkPriceModal
        isOpen={isBulkModalOpen}
        selectedProductIds={Array.from(selectedIds)}
        onClose={() => setIsBulkModalOpen(false)}
        onApply={handleApplyBulkPrice}
      />

      {/* Generic Confirmation Dialog */}
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
