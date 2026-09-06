import { useState, useEffect } from 'react';
import productService from '../../services/productService';
import { IconBox } from '../Icons';
import ProductImageUploader from '../products/ProductImageUploader';

export default function WarehouseProductModal({
  isOpen,
  onClose,
  warehouse,
  existingItem = null, // If provided, edit mode. If null, add mode.
  onSave,
}) {
  const isEdit = Boolean(existingItem);
  const allCatalogProducts = productService.getAllProducts();
  const categories = productService.getCategories().filter((c) => c !== 'All');
  const units = productService.getUnits();

  // Mode for adding: 'EXISTING' | 'NEW'
  const [sourceMode, setSourceMode] = useState('EXISTING');

  // Existing product selection
  const [selectedProductId, setSelectedProductId] = useState('');

  // New product fields if creating from scratch
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Hardware');
  const [newProductBasePrice, setNewProductBasePrice] = useState('');
  const [newProductCostPrice, setNewProductCostPrice] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('Piece');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');

  // Inventory fields
  const [onHand, setOnHand] = useState(50);
  const [reserved, setReserved] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(15);
  const [replenishmentQty, setReplenishmentQty] = useState(50);
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [autoReplenish, setAutoReplenish] = useState(true);

  const [error, setError] = useState('');

  useEffect(() => {
    if (existingItem) {
      setSelectedProductId(existingItem.productId || '');
      setOnHand(existingItem.onHand !== undefined ? existingItem.onHand : 0);
      setReserved(existingItem.reserved !== undefined ? existingItem.reserved : 0);
      setReorderPoint(existingItem.reorderPoint !== undefined ? existingItem.reorderPoint : 15);
      setReplenishmentQty(existingItem.replenishmentQty !== undefined ? existingItem.replenishmentQty : 50);
      setLeadTimeDays(existingItem.leadTimeDays !== undefined ? existingItem.leadTimeDays : 7);
      setAutoReplenish(existingItem.autoReplenish !== undefined ? existingItem.autoReplenish : true);
    } else {
      setSelectedProductId(allCatalogProducts[0]?.id || '');
      setSourceMode('EXISTING');
      setNewProductName('');
      setNewProductSku('');
      setNewProductCategory('Hardware');
      setNewProductBasePrice('');
      setNewProductCostPrice('');
      setNewProductUnit('Piece');
      setNewProductImageUrl('');
      setOnHand(50);
      setReserved(0);
      setReorderPoint(15);
      setReplenishmentQty(50);
      setLeadTimeDays(7);
      setAutoReplenish(true);
    }
    setError('');
  }, [existingItem, isOpen]);

  if (!isOpen || !warehouse) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    let finalProductId = selectedProductId;

    if (!isEdit && sourceMode === 'NEW') {
      if (!newProductName.trim()) {
        setError('Product Name is required.');
        return;
      }
      if (!newProductBasePrice || Number(newProductBasePrice) <= 0) {
        setError('Base Price must be greater than zero.');
        return;
      }

      // Create new catalog product first
      try {
        const createdProd = productService.createProduct({
          name: newProductName.trim(),
          sku: newProductSku.trim() || undefined,
          category: newProductCategory,
          basePrice: Number(newProductBasePrice),
          costPrice: Number(newProductCostPrice) || 0,
          unit: newProductUnit,
          imageUrl: newProductImageUrl.trim() || undefined,
          taxRate: 18,
          status: 'Active',
          trackStock: true,
          stockQuantity: Number(onHand),
          attributes: [],
          variants: [],
        });
        finalProductId = createdProd.id;
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    if (!finalProductId) {
      setError('Please select or create a product.');
      return;
    }

    onSave({
      productId: finalProductId,
      onHand: Number(onHand),
      reserved: Number(reserved),
      reorderPoint: Number(reorderPoint),
      replenishmentQty: Number(replenishmentQty),
      leadTimeDays: Number(leadTimeDays),
      autoReplenish,
    });
  };

  const selectedProduct = allCatalogProducts.find((p) => p.id === selectedProductId);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 34, 28, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--paper)',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '620px',
          boxShadow: '0 20px 45px rgba(0, 34, 28, 0.22)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            background: 'var(--burnham)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px' }}>
              {isEdit ? `Edit Product Stock — ${existingItem.product?.name}` : 'Stock Product in Facility'}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--viridian-100)', marginTop: '2px' }}>
              Facility: {warehouse.name} ({warehouse.code})
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 24px', background: 'var(--rose-100)', color: 'var(--rose)', fontSize: '12.5px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* If Add Mode: Source Selector */}
          {!isEdit && (
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Product Source
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn ${sourceMode === 'EXISTING' ? 'btn-dark' : 'btn-ghost'}`}
                  onClick={() => setSourceMode('EXISTING')}
                  style={{ fontSize: '12.5px' }}
                >
                  Select from Catalog
                </button>
                <button
                  type="button"
                  className={`btn ${sourceMode === 'NEW' ? 'btn-dark' : 'btn-ghost'}`}
                  onClick={() => setSourceMode('NEW')}
                  style={{ fontSize: '12.5px' }}
                >
                  + Create New Product
                </button>
              </div>
            </div>
          )}

          {/* Option A: Select from Catalog */}
          {(!isEdit && sourceMode === 'EXISTING') && (
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Choose Catalog Product <span style={{ color: 'var(--rose)' }}>*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13.5px',
                  background: '#fff',
                }}
              >
                {allCatalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || 'No SKU'}) · {p.category} — ${p.basePrice}
                  </option>
                ))}
              </select>

              {selectedProduct && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--paper-2)', padding: '10px 14px', borderRadius: '6px', marginTop: '8px', border: '1px solid var(--line)' }}>
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)', background: '#fff', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: '42px', height: '42px', borderRadius: '4px', background: '#fff', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--viridian)', flexShrink: 0 }}>
                      <IconBox style={{ width: 20, height: 20 }} />
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--ink-60)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--burnham)' }}>{selectedProduct.name}</span>
                    <span>SKU: <strong style={{ color: 'var(--burnham)', fontFamily: 'monospace' }}>{selectedProduct.sku || 'N/A'}</strong> · Unit: {selectedProduct.unit || 'Piece'} · Base Price: ${selectedProduct.basePrice}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Option B: Create New Product On the Fly */}
          {(!isEdit && sourceMode === 'NEW') && (
            <div style={{ background: 'var(--paper-2)', padding: '16px', borderRadius: '6px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--burnham)' }}>
                New Product Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                    Product Name <span style={{ color: 'var(--rose)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4K UltraWide Monitor 34"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HW-MON-34"
                    value={newProductSku}
                    onChange={(e) => setNewProductSku(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Category</label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="450.00"
                    value={newProductBasePrice}
                    onChange={(e) => setNewProductBasePrice(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Unit</label>
                  <select
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Product Image (Upload / URL / Presets)
                </label>
                <ProductImageUploader
                  value={newProductImageUrl}
                  onChange={setNewProductImageUrl}
                />
              </div>
            </div>
          )}

          {/* If Edit Mode: Product Static Info Card */}
          {isEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: '6px' }}>
              {existingItem.product?.imageUrl ? (
                <img
                  src={existingItem.product.imageUrl}
                  alt={existingItem.product.name}
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)', background: '#fff', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '4px', background: 'var(--paper-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--viridian)', flexShrink: 0 }}>
                  <IconBox style={{ width: 22, height: 22 }} />
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, color: 'var(--burnham)', fontSize: '14px' }}>
                  {existingItem.product?.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  SKU: <span style={{ fontFamily: 'monospace' }}>{existingItem.product?.sku}</span> · Category: {existingItem.product?.category} · Base Price: ${existingItem.product?.basePrice}
                </div>
              </div>
            </div>
          )}

          {/* Stock Levels & Rules */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                On-Hand Physical Stock
              </label>
              <input
                type="number"
                min="0"
                value={onHand}
                onChange={(e) => setOnHand(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--ink-60)', marginTop: '3px' }}>
                Available to fulfill: <strong className="tnum" style={{ color: 'var(--viridian-600)' }}>{Math.max(0, Number(onHand) - Number(reserved))} units</strong>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Reserved for Open Orders
              </label>
              <input
                type="number"
                min="0"
                value={reserved}
                onChange={(e) => setReserved(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13.5px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Reorder Point
              </label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
              <div style={{ fontSize: '10.5px', color: 'var(--ink-60)', marginTop: '2px' }}>
                Min alert threshold
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Batch Restock Qty
              </label>
              <input
                type="number"
                min="1"
                value={replenishmentQty}
                onChange={(e) => setReplenishmentQty(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
              <div style={{ fontSize: '10.5px', color: 'var(--ink-60)', marginTop: '2px' }}>
                Target PO batch
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
              <div style={{ fontSize: '10.5px', color: 'var(--ink-60)', marginTop: '2px' }}>
                Supplier arrival window
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: 'var(--paper-2)',
              borderRadius: '6px',
              border: '1px solid var(--line)',
            }}
          >
            <input
              type="checkbox"
              id="whProductAutoReplenish"
              checked={autoReplenish}
              onChange={(e) => setAutoReplenish(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--viridian)' }}
            />
            <label htmlFor="whProductAutoReplenish" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Automate Reorder PO when stock reaches or breaches threshold
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-dark">
              {isEdit ? 'Update Product in Warehouse' : 'Save & Stock Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
