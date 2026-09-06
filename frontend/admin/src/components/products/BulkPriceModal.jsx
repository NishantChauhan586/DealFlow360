import { useState, useMemo } from 'react';
import productService, { formatINR } from '../../services/productService';

export default function BulkPriceModal({
  isOpen,
  onClose,
  selectedProductIds = [],
  onApply,
}) {
  const categories = productService.getCategories();
  const allProducts = productService.getAllProducts();

  const [targetField, setTargetField] = useState('basePrice'); // 'basePrice' | 'costPrice'
  const [mode, setMode] = useState('PCT_INC');
  const [value, setValue] = useState(10);
  const [category, setCategory] = useState('All');
  const [useSelectedOnly, setUseSelectedOnly] = useState(selectedProductIds.length > 0);

  // Filter candidate products
  const candidates = useMemo(() => {
    let list = allProducts;
    if (useSelectedOnly && selectedProductIds.length > 0) {
      const set = new Set(selectedProductIds);
      list = list.filter((p) => set.has(p.id));
    } else if (category !== 'All') {
      list = list.filter((p) => p.category === category);
    }
    return list;
  }, [allProducts, selectedProductIds, useSelectedOnly, category]);

  // Preview simulation
  const previewData = useMemo(() => {
    const val = Number(value) || 0;
    return candidates.slice(0, 5).map((p) => {
      const currentPrice = Number(p[targetField]) || 0;
      let newPrice = currentPrice;
      if (mode === 'PCT_INC') newPrice = currentPrice * (1 + val / 100);
      else if (mode === 'PCT_DEC') newPrice = Math.max(0, currentPrice * (1 - val / 100));
      else if (mode === 'FIX_INC') newPrice = currentPrice + val;
      else if (mode === 'FIX_DEC') newPrice = Math.max(0, currentPrice - val);

      newPrice = Math.round(newPrice * 100) / 100;
      const delta = Math.round((newPrice - currentPrice) * 100) / 100;

      const baseForMargin = targetField === 'basePrice' ? newPrice : (p.basePrice || 0);
      const costForMargin = targetField === 'costPrice' ? newPrice : (p.costPrice || 0);

      const oldMargin = p.basePrice > 0 ? ((p.basePrice - (p.costPrice || 0)) / p.basePrice) * 100 : 0;
      const newMargin = baseForMargin > 0 ? ((baseForMargin - costForMargin) / baseForMargin) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        oldPrice: currentPrice,
        newPrice,
        delta,
        oldMargin: oldMargin.toFixed(1),
        newMargin: newMargin.toFixed(1),
      };
    });
  }, [candidates, targetField, mode, value]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const val = Number(value);
    if (isNaN(val) || val <= 0) {
      alert('Adjustment value must be greater than zero.');
      return;
    }

    onApply({
      targetField,
      mode,
      value: val,
      categoryFilter: useSelectedOnly ? 'All' : category,
      category: useSelectedOnly ? 'All' : category,
      productIds: useSelectedOnly ? selectedProductIds : null,
    });
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
          maxWidth: '720px',
          boxShadow: '0 20px 45px rgba(0, 34, 28, 0.22)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
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
              Bulk Price Adjustment Engine
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--viridian-100)', marginTop: '2px' }}>
              Simulate and execute commercial price rate changes in INR (₹)
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

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Target Price Field
              </label>
              <select
                value={targetField}
                onChange={(e) => setTargetField(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <option value="basePrice">Selling Price (Base Price ₹)</option>
                <option value="costPrice">Cost Price (Procurement ₹)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Adjustment Type
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <option value="PCT_INC">Increase by Percentage (+%)</option>
                <option value="PCT_DEC">Decrease by Percentage (-%)</option>
                <option value="FIX_INC">Increase by Fixed Amount (+₹)</option>
                <option value="FIX_DEC">Decrease by Fixed Amount (-₹)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Adjustment Value {mode.startsWith('PCT') ? '(%)' : '(₹ INR)'}
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              />
            </div>
          </div>

          {/* Scope Selector */}
          <div style={{ background: 'var(--paper-2)', padding: '14px 16px', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '8px' }}>Target Scope</div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {selectedProductIds.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="scope"
                    checked={useSelectedOnly}
                    onChange={() => setUseSelectedOnly(true)}
                  />
                  Selected Products Only ({selectedProductIds.length} item{selectedProductIds.length === 1 ? '' : 's'})
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scope"
                  checked={!useSelectedOnly}
                  onChange={() => setUseSelectedOnly(false)}
                />
                By Category
              </label>
              {!useSelectedOnly && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    fontSize: '12.5px',
                  }}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--viridian-600)', marginTop: '8px', fontWeight: 600 }}>
              ✓ Affects {candidates.length} product{candidates.length === 1 ? '' : 's'} in catalog
            </div>
          </div>

          {/* Impact Simulation Table */}
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '8px', color: 'var(--burnham)' }}>
              Live Impact Simulation (Sample Preview in ₹ INR)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', background: '#fff', border: '1px solid var(--line)', borderRadius: '4px' }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '8px 10px' }}>Product</th>
                  <th style={{ padding: '8px 10px' }}>Current {targetField === 'basePrice' ? 'Selling Price' : 'Cost Price'}</th>
                  <th style={{ padding: '8px 10px' }}>Adjusted Price</th>
                  <th style={{ padding: '8px 10px' }}>Delta</th>
                  <th style={{ padding: '8px 10px' }}>Margin Shift</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(8,32,26,0.06)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: '8px 10px' }} className="tnum">{formatINR(row.oldPrice)}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--viridian-600)' }} className="tnum">
                      {formatINR(row.newPrice)}
                    </td>
                    <td style={{ padding: '8px 10px' }} className="tnum">
                      <span style={{ color: row.delta >= 0 ? 'var(--viridian-600)' : 'var(--rose)' }}>
                        {row.delta >= 0 ? `+${formatINR(row.delta)}` : `-${formatINR(Math.abs(row.delta))}`}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }} className="tnum">
                      {row.oldMargin}% → {row.newMargin}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-dark" onClick={handleConfirm}>
              Apply Changes to {candidates.length} Product{candidates.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
