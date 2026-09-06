import { useState, useEffect } from 'react';
import VariantBuilder from './VariantBuilder';
import ProductImageUploader from './ProductImageUploader';
import productService from '../../services/productService';

export default function ProductModal({
  isOpen,
  onClose,
  product = null,
  onSave,
}) {
  const isEdit = Boolean(product);
  const categories = productService.getCategories().filter((c) => c !== 'All');
  const units = productService.getUnits();

  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Hardware',
    brand: '',
    description: '',
    basePrice: '',
    costPrice: '',
    unit: 'Piece',
    taxRate: 18,
    status: 'Active',
    trackStock: true,
    stockQuantity: 50,
    lowStockThreshold: 10,
    imageUrl: '',
    attributes: [],
    variants: [],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category || 'Hardware',
        brand: product.brand || '',
        description: product.description || '',
        basePrice: product.basePrice !== undefined ? product.basePrice : '',
        costPrice: product.costPrice !== undefined ? product.costPrice : '',
        unit: product.unit || 'Piece',
        taxRate: product.taxRate !== undefined ? product.taxRate : 18,
        status: product.status || 'Active',
        trackStock: product.trackStock !== undefined ? product.trackStock : true,
        stockQuantity: product.stockQuantity !== undefined ? product.stockQuantity : 0,
        lowStockThreshold: product.lowStockThreshold !== undefined ? product.lowStockThreshold : 10,
        imageUrl: product.imageUrl || '',
        attributes: product.attributes ? JSON.parse(JSON.stringify(product.attributes)) : [],
        variants: product.variants ? JSON.parse(JSON.stringify(product.variants)) : [],
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        category: 'Hardware',
        brand: '',
        description: '',
        basePrice: '',
        costPrice: '',
        unit: 'Piece',
        taxRate: 18,
        status: 'Active',
        trackStock: true,
        stockQuantity: 50,
        lowStockThreshold: 10,
        imageUrl: '',
        attributes: [],
        variants: [],
      });
    }
    setErrors({});
    setActiveTab('basic');
  }, [product, isOpen]);

  if (!isOpen) return null;

  // Margin calculation
  const basePriceNum = Number(formData.basePrice) || 0;
  const costPriceNum = Number(formData.costPrice) || 0;
  const grossProfit = basePriceNum - costPriceNum;
  const marginPct = basePriceNum > 0 ? (grossProfit / basePriceNum) * 100 : 0;

  let marginBadgeClass = 'tag-green';
  if (marginPct < 20) marginBadgeClass = 'tag-red';
  else if (marginPct < 35) marginBadgeClass = 'tag-amber';

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = productService.validateProduct(formData, product?.id);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Switch to tab where error occurred
      if (validationErrors.name || validationErrors.sku) setActiveTab('basic');
      else if (validationErrors.basePrice || validationErrors.costPrice) setActiveTab('pricing');
      return;
    }

    onSave(formData);
  };

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
        zIndex: 999,
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
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 45px rgba(0, 34, 28, 0.22)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--burnham)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 700 }}>
              {isEdit ? `Edit Product — ${product.name}` : 'Create New Product'}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--viridian-100)', marginTop: '4px' }}>
              Configure master catalog details, tax schedule, and variant matrix
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {basePriceNum > 0 && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.12)',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  color: 'var(--viridian-100)',
                }}
              >
                Margin: {marginPct.toFixed(1)}% (${grossProfit.toFixed(2)})
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '22px',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            background: 'var(--paper-2)',
            borderBottom: '1px solid var(--line)',
            padding: '0 20px',
          }}
        >
          {[
            { id: 'basic', label: '1. Basic Info' },
            { id: 'pricing', label: '2. Pricing & Taxes' },
            { id: 'inventory', label: '3. Inventory & Stock' },
            { id: 'variants', label: `4. Variants (${formData.variants.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--viridian)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--burnham)' : 'var(--ink-60)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Errors banner if any */}
        {Object.keys(errors).length > 0 && (
          <div
            style={{
              padding: '10px 24px',
              background: 'var(--rose-100)',
              color: 'var(--rose)',
              fontSize: '12.5px',
              fontWeight: 500,
              borderBottom: '1px solid rgba(176, 74, 61, 0.2)',
            }}
          >
            Please fix the validation errors: {Object.values(errors).filter(Boolean).join(' · ')}
          </div>
        )}

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            {/* Tab 1: Basic Information */}
            {activeTab === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Product Name <span style={{ color: 'var(--rose)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Orion Enterprise Laptop 14"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: `1px solid ${errors.name ? 'var(--rose)' : 'var(--line)'}`,
                        borderRadius: '4px',
                        fontSize: '13.5px',
                      }}
                    />
                    {errors.name && <div style={{ color: 'var(--rose)', fontSize: '11.5px', marginTop: '4px' }}>{errors.name}</div>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      SKU (Stock Keeping Unit)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HW-ORION-14"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: `1px solid ${errors.sku ? 'var(--rose)' : 'var(--line)'}`,
                        borderRadius: '4px',
                        fontSize: '13.5px',
                      }}
                    />
                    {errors.sku && <div style={{ color: 'var(--rose)', fontSize: '11.5px', marginTop: '4px' }}>{errors.sku}</div>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        fontSize: '13.5px',
                      }}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Brand / Manufacturer
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. OrionTech"
                      value={formData.brand}
                      onChange={(e) => handleChange('brand', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        fontSize: '13.5px',
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                    Product Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter detailed commercial description, specifications, and scope..."
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Unit of Measure
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => handleChange('unit', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        fontSize: '13.5px',
                        background: '#fff',
                      }}
                    >
                      {units.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '8px' }}>
                      Product Media & Imagery (Upload / URL / Presets)
                    </label>
                    <ProductImageUploader
                      value={formData.imageUrl}
                      onChange={(newUrl) => handleChange('imageUrl', newUrl)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Pricing & Taxes */}
            {activeTab === 'pricing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Base Price (₹ INR) <span style={{ color: 'var(--rose)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formData.basePrice}
                      onChange={(e) => handleChange('basePrice', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: `1px solid ${errors.basePrice ? 'var(--rose)' : 'var(--line)'}`,
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    />
                    {errors.basePrice && (
                      <div style={{ color: 'var(--rose)', fontSize: '11.5px', marginTop: '4px' }}>
                        {errors.basePrice}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Cost Price (₹ INR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.costPrice}
                      onChange={(e) => handleChange('costPrice', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    />
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-40)', marginTop: '4px' }}>
                      Internal unit procurement / labor cost
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Applicable Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      placeholder="18"
                      value={formData.taxRate}
                      onChange={(e) => handleChange('taxRate', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                {/* Live Margin Calculation Card */}
                <div
                  style={{
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Profitability & Policy Audit
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--burnham)', marginTop: '4px' }}>
                      Gross Margin: <span className="tnum">{marginPct.toFixed(1)}%</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--ink-60)', marginTop: '2px' }}>
                      Gross Unit Profit: <span className="tnum">${grossProfit.toFixed(2)}</span> per {formData.unit}
                    </div>
                  </div>

                  <span className={`tag ${marginBadgeClass}`} style={{ fontSize: '12px', padding: '6px 14px' }}>
                    {marginPct >= 40 ? 'Optimal Healthy Margin' : marginPct >= 25 ? 'Standard Tolerance' : 'Flagged Low Margin'}
                  </span>
                </div>
              </div>
            )}

            {/* Tab 3: Inventory & Stock */}
            {activeTab === 'inventory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    background: 'var(--paper-2)',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                  }}
                >
                  <input
                    type="checkbox"
                    id="trackStockToggle"
                    checked={formData.trackStock}
                    onChange={(e) => handleChange('trackStock', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--viridian)' }}
                  />
                  <label htmlFor="trackStockToggle" style={{ fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                    Enable Stock & Warehouse Inventory Tracking
                  </label>
                </div>

                {formData.trackStock && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                        Current Stock Available
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stockQuantity}
                        onChange={(e) => handleChange('stockQuantity', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid var(--line)',
                          borderRadius: '4px',
                          fontSize: '13.5px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                        Low Stock Alert Threshold
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.lowStockThreshold}
                        onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
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
                )}
              </div>
            )}

            {/* Tab 4: Variants */}
            {activeTab === 'variants' && (
              <VariantBuilder
                attributes={formData.attributes}
                setAttributes={(attrs) => handleChange('attributes', attrs)}
                variants={formData.variants}
                setVariants={(vars) => handleChange('variants', vars)}
                basePrice={formData.basePrice}
                baseSku={formData.sku}
              />
            )}
          </div>

          {/* Modal Footer Actions */}
          <div
            style={{
              padding: '16px 24px',
              background: 'var(--paper-2)',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-dark">
              {isEdit ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
