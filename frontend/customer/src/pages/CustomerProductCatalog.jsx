import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import productService from '../services/productService';
import {
  IconBox,
  IconSearch,
  IconCart,
  IconCheck,
  IconLayers,
  IconPlus,
} from '../components/Icons';
import styles from './CustomerProductCatalog.module.css';

/* ─── Inline SVG helpers ─── */
const ChevronDown = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const ChevronUp = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const XIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ArrowRight = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
const MinusIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const fmt = (n) =>
  '\u20B9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── Product Card (Grid) ─── */
function ProductCard({ product, onAddToQuotation }) {
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variantOpen, setVariantOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const variants = product.variants || [];
  const basePrice = Number(product.basePrice) || 0;
  const displayPrice = selectedVariant ? Number(selectedVariant.price || basePrice) : basePrice;
  const isLowStock = product.trackStock && product.stockQuantity <= (product.lowStockThreshold || 10);
  const isOutOfStock = product.trackStock && product.stockQuantity === 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToQuotation({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      variant: selectedVariant,
      qty,
      unitPrice: displayPrice,
      unit: product.unit || 'Piece',
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className={`${styles.card} ${isOutOfStock ? styles.cardOutOfStock : ''}`}>
      <div className={styles.cardImage}>
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className={styles.cardImg}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        {!product.imageUrl && (
          <div className={styles.cardImgFallback}>
            <IconBox style={{ width: 32, height: 32 }} />
          </div>
        )}
        <div className={styles.cardBadges}>
          <span className={styles.catBadge}>{product.category}</span>
          {isLowStock && !isOutOfStock && <span className={styles.lowStockBadge}>Low Stock</span>}
          {isOutOfStock && <span className={styles.outOfStockBadge}>Out of Stock</span>}
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          {product.brand && <span className={styles.brand}>{product.brand}</span>}
          {product.sku && <span className={styles.sku}>{product.sku}</span>}
        </div>
        <h3 className={styles.cardTitle}>{product.name}</h3>
        {product.description && <p className={styles.cardDesc}>{product.description}</p>}

        {variants.length > 0 && (
          <div className={styles.variantSection}>
            <button
              type="button"
              className={styles.variantToggle}
              onClick={() => setVariantOpen((o) => !o)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <IconLayers style={{ width: 13, height: 13 }} />
                {selectedVariant
                  ? selectedVariant.name
                  : `${variants.length} variant${variants.length > 1 ? 's' : ''} available`}
              </span>
              {variantOpen ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
            </button>
            {variantOpen && (
              <div className={styles.variantDropdown}>
                <button
                  type="button"
                  className={`${styles.variantOption} ${!selectedVariant ? styles.variantSelected : ''}`}
                  onClick={() => { setSelectedVariant(null); setVariantOpen(false); }}
                >
                  Base — {fmt(basePrice)}
                </button>
                {variants.map((v, idx) => (
                  <button
                    type="button"
                    key={v.id || idx}
                    className={`${styles.variantOption} ${selectedVariant && selectedVariant.id === v.id ? styles.variantSelected : ''}`}
                    onClick={() => { setSelectedVariant(v); setVariantOpen(false); }}
                  >
                    {v.name}
                    {v.price && <span className={styles.variantPrice}>{fmt(v.price)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.priceRow}>
          <span className={styles.price}>{fmt(displayPrice)}</span>
          <span className={styles.priceUnit}>/ {product.unit || 'Piece'}</span>
        </div>

        {product.trackStock && (
          <div className={styles.stockRow}>
            <span className={styles.stockDot} style={{
              background: isOutOfStock ? 'var(--rose)' : isLowStock ? 'var(--amber)' : 'var(--viridian)',
            }} />
            <span className={styles.stockText}>
              {isOutOfStock ? 'Out of stock' : isLowStock ? `Only ${product.stockQuantity} left` : `${product.stockQuantity} in stock`}
            </span>
          </div>
        )}

        <div className={styles.cardActions}>
          <div className={styles.qtyControl}>
            <button type="button" className={styles.qtyBtn}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={isOutOfStock} aria-label="Decrease quantity">
              <MinusIcon style={{ width: 13, height: 13 }} />
            </button>
            <span className={styles.qtyValue}>{qty}</span>
            <button type="button" className={styles.qtyBtn}
              onClick={() => setQty((q) => product.trackStock ? Math.min(product.stockQuantity, q + 1) : q + 1)}
              disabled={isOutOfStock} aria-label="Increase quantity">
              <IconPlus style={{ width: 13, height: 13 }} />
            </button>
          </div>

          <button
            type="button"
            className={`${styles.addBtn} ${added ? styles.addBtnAdded : ''}`}
            onClick={handleAdd}
            disabled={isOutOfStock}
          >
            {added
              ? <><IconCheck style={{ width: 15, height: 15 }} /> Added</>
              : <><IconCart style={{ width: 15, height: 15 }} /> Add to Quotation</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Product List Row ─── */
function ProductListRow({ product, onAddToQuotation }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const basePrice = Number(product.basePrice) || 0;
  const isLowStock = product.trackStock && product.stockQuantity <= (product.lowStockThreshold || 10);
  const isOutOfStock = product.trackStock && product.stockQuantity === 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToQuotation({ productId: product.id, name: product.name, sku: product.sku, variant: null, qty, unitPrice: basePrice, unit: product.unit || 'Piece' });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className={`${styles.listRow} ${isOutOfStock ? styles.listRowOutOfStock : ''}`}>
      <div className={styles.listThumb}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className={styles.listThumbImg} onError={(e) => { e.target.style.display = 'none'; }} />
          : <div className={styles.listThumbFallback}><IconBox style={{ width: 20, height: 20 }} /></div>}
      </div>
      <div className={styles.listInfo}>
        <div className={styles.listInfoTop}>
          <span className={styles.listCategory}>{product.category}</span>
          {product.sku && <span className={styles.listSku}>{product.sku}</span>}
        </div>
        <span className={styles.listName}>{product.name}</span>
        {product.description && <p className={styles.listDesc}>{product.description}</p>}
      </div>
      <div className={styles.listStock}>
        {product.trackStock
          ? <span className={styles.listStockLabel} style={{ color: isOutOfStock ? 'var(--rose)' : isLowStock ? 'var(--amber)' : 'var(--viridian-600)' }}>
            {isOutOfStock ? 'Out of stock' : isLowStock ? `Only ${product.stockQuantity} left` : `${product.stockQuantity} in stock`}
          </span>
          : <span className={styles.listStockLabel} style={{ color: 'var(--ink-40)' }}>Unmetered</span>}
      </div>
      <div className={styles.listPrice}>
        <strong className="tnum">{fmt(basePrice)}</strong>
        <span className={styles.listPriceUnit}>/ {product.unit || 'Piece'}</span>
      </div>
      <div className={styles.listControls}>
        <div className={styles.qtyControl}>
          <button type="button" className={styles.qtyBtn} onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={isOutOfStock}>
            <MinusIcon style={{ width: 11, height: 11 }} />
          </button>
          <span className={styles.qtyValue}>{qty}</span>
          <button type="button" className={styles.qtyBtn} onClick={() => setQty((q) => q + 1)} disabled={isOutOfStock}>
            <IconPlus style={{ width: 11, height: 11 }} />
          </button>
        </div>
        <button type="button" className={`${styles.addBtnSmall} ${added ? styles.addBtnAdded : ''}`} onClick={handleAdd} disabled={isOutOfStock}>
          {added ? <IconCheck style={{ width: 14, height: 14 }} /> : <IconCart style={{ width: 14, height: 14 }} />}
          {added ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  );
}

/* ─── Quotation Drawer ─── */
function QuotationDrawer({ items, onRemove, onUpdateQty, onProceed, onClose }) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div>
            <h3 className={styles.drawerTitle}>Your Quotation</h3>
            <p className={styles.drawerSub}>{items.length} item{items.length !== 1 ? 's' : ''} selected</p>
          </div>
          <button type="button" className={styles.drawerClose} onClick={onClose}>
            <XIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className={styles.drawerItems}>
          {items.length === 0 && (
            <div className={styles.drawerEmpty}>
              <IconCart style={{ width: 28, height: 28 }} />
              <p>No products added yet.<br />Browse the catalog and add items.</p>
            </div>
          )}
          {items.map((item) => (
            <div key={item.lineId} className={styles.drawerItem}>
              <div className={styles.drawerItemInfo}>
                <span className={styles.drawerItemName}>{item.name}</span>
                {item.variant && <span className={styles.drawerItemVariant}>{item.variant.name}</span>}
                {item.sku && <span className={styles.drawerItemSku}>{item.sku}</span>}
              </div>
              <div className={styles.drawerItemControls}>
                <div className={styles.miniQty}>
                  <button type="button" className={styles.miniQtyBtn}
                    onClick={() => onUpdateQty(item.lineId, Math.max(1, item.qty - 1))}>
                    <MinusIcon style={{ width: 11, height: 11 }} />
                  </button>
                  <span className={styles.miniQtyVal}>{item.qty}</span>
                  <button type="button" className={styles.miniQtyBtn}
                    onClick={() => onUpdateQty(item.lineId, item.qty + 1)}>
                    <IconPlus style={{ width: 11, height: 11 }} />
                  </button>
                </div>
                <span className={styles.drawerItemPrice}>{fmt(item.unitPrice * item.qty)}</span>
                <button type="button" className={styles.drawerItemRemove} onClick={() => onRemove(item.lineId)} title="Remove">
                  <XIcon style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className={styles.drawerFooter}>
            <div className={styles.drawerSubtotal}>
              <span>Estimated Total</span>
              <strong className="tnum">{fmt(subtotal)}</strong>
            </div>
            <p className={styles.drawerNote}>Final pricing subject to approval and discount policy.</p>
            <button type="button" className={styles.proceedBtn} onClick={onProceed}>
              Proceed to Quotation Builder
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Catalog Page ─── */
export default function CustomerProductCatalog({ user }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name:asc');
  const [viewMode, setViewMode] = useState('grid');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quotationItems, setQuotationItems] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    const load = () => {
      const all = productService.getAllProducts().filter((p) => p.status === 'Active');
      setProducts(all);
    };
    load();
    const unsub = productService.subscribe(load);
    return unsub;
  }, []);

  const categories = useMemo(() => productService.getCategories(), []);

  const displayProducts = useMemo(() => {
    let items = [...products];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== 'All') {
      items = items.filter((p) => p.category === selectedCategory);
    }
    const [field, dir] = sortBy.split(':');
    items.sort((a, b) => {
      let aVal = a[field] != null ? a[field] : '';
      let bVal = b[field] != null ? b[field] : '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [products, search, selectedCategory, sortBy]);

  const handleAddToQuotation = useCallback((lineData) => {
    setQuotationItems((prev) => {
      const variantId = lineData.variant ? lineData.variant.id : null;
      const existing = prev.find((i) => i.productId === lineData.productId && (i.variant ? i.variant.id : null) === variantId);
      if (existing) {
        showToast(`Updated quantity for "${lineData.name}"`);
        return prev.map((i) => i.lineId === existing.lineId ? { ...i, qty: i.qty + lineData.qty } : i);
      }
      showToast(`"${lineData.name}" added to quotation`);
      return [...prev, { ...lineData, lineId: `${Date.now()}-${Math.random()}` }];
    });
  }, [showToast]);

  const handleRemoveItem = useCallback((lineId) => {
    setQuotationItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const handleUpdateQty = useCallback((lineId, qty) => {
    setQuotationItems((prev) => prev.map((i) => i.lineId === lineId ? { ...i, qty } : i));
  }, []);

  const handleProceed = () => {
    const draftItems = quotationItems.map((i) => ({
      id: i.productId, name: i.name, qty: i.qty, unitPrice: i.unitPrice, variant: i.variant,
    }));
    sessionStorage.setItem('df360_draft_quotation', JSON.stringify(draftItems));
    navigate('/builder');
  };

  const totalItems = quotationItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
          <IconCheck style={{ width: 15, height: 15 }} />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Product Catalog</h1>
          <p className={styles.pageSubtitle}>Browse our full range and request a tailored quotation</p>
        </div>
        <button type="button" className={styles.cartButton} onClick={() => setDrawerOpen(true)} id="open-quotation-drawer">
          <IconCart style={{ width: 17, height: 17 }} />
          <span>My Quotation</span>
          {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <IconSearch className={styles.searchIcon} />
          <input
            id="product-search"
            type="text"
            placeholder="Search products, SKU, brand\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button type="button" className={styles.searchClear} onClick={() => setSearch('')}>
              <XIcon style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        <div className={styles.filterRow}>
          <div className={styles.categoryPills}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.catPill} ${selectedCategory === cat ? styles.catPillActive : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'All' ? 'All Products' : cat}
              </button>
            ))}
          </div>

          <div className={styles.rightControls}>
            <select id="product-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortSelect}>
              <option value="name:asc">Name (A\u2013Z)</option>
              <option value="name:desc">Name (Z\u2013A)</option>
              <option value="basePrice:asc">Price: Low to High</option>
              <option value="basePrice:desc">Price: High to Low</option>
            </select>

            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view" aria-label="Grid view"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                onClick={() => setViewMode('list')}
                title="List view" aria-label="List view"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className={styles.resultsMeta}>
        <span>
          {displayProducts.length === 0
            ? 'No products found'
            : `${displayProducts.length} product${displayProducts.length !== 1 ? 's' : ''} available`}
        </span>
        {search && <span className={styles.searchLabel}> for <em>"{search}"</em></span>}
      </div>

      {displayProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <IconBox style={{ width: 40, height: 40 }} />
          <h3>No products found</h3>
          <p>Try adjusting your search or category filters.</p>
          <button type="button" className={styles.resetBtn}
            onClick={() => { setSearch(''); setSelectedCategory('All'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? styles.productGrid : styles.productList}>
          {displayProducts.map((product) =>
            viewMode === 'grid' ? (
              <ProductCard key={product.id} product={product} onAddToQuotation={handleAddToQuotation} />
            ) : (
              <ProductListRow key={product.id} product={product} onAddToQuotation={handleAddToQuotation} />
            )
          )}
        </div>
      )}

      {drawerOpen && (
        <QuotationDrawer
          items={quotationItems}
          onRemove={handleRemoveItem}
          onUpdateQty={handleUpdateQty}
          onProceed={handleProceed}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
