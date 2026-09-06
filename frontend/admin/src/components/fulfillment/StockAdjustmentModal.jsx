import { useState } from 'react';

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  warehouse,
  productItem,
  onAdjust,
}) {
  const [mode, setMode] = useState('ADD'); // 'ADD' | 'DEDUCT' | 'SET'
  const [quantity, setQuantity] = useState(10);
  const [reason, setReason] = useState('Inbound shipment receiving');

  if (!isOpen || !warehouse || !productItem) return null;

  const currentOnHand = productItem.onHand || 0;
  const currentReserved = productItem.reserved || 0;
  const qtyNum = Number(quantity) || 0;

  let computedNewOnHand = currentOnHand;
  let delta = 0;
  if (mode === 'ADD') {
    computedNewOnHand = currentOnHand + qtyNum;
    delta = qtyNum;
  } else if (mode === 'DEDUCT') {
    computedNewOnHand = Math.max(0, currentOnHand - qtyNum);
    delta = -qtyNum;
  } else if (mode === 'SET') {
    computedNewOnHand = Math.max(0, qtyNum);
    delta = computedNewOnHand - currentOnHand;
  }

  const computedNewAvailable = Math.max(0, computedNewOnHand - currentReserved);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isNaN(qtyNum) || (qtyNum <= 0 && mode !== 'SET')) {
      alert('Please enter a valid quantity.');
      return;
    }
    onAdjust(warehouse.id, productItem.productId, delta, reason);
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
          maxWidth: '520px',
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
              Adjust Warehouse Inventory
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

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target Product Info Card */}
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--line)',
              padding: '12px 16px',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: 'var(--burnham)', fontSize: '14px' }}>
                {productItem.product?.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                SKU: {productItem.product?.sku} · Category: {productItem.product?.category}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-60)', textTransform: 'uppercase' }}>Current On-Hand</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--burnham)' }} className="tnum">
                {currentOnHand} {productItem.product?.unit || 'units'}
              </div>
            </div>
          </div>

          {/* Adjustment Mode Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Adjustment Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${mode === 'ADD' ? 'btn-dark' : 'btn-ghost'}`}
                onClick={() => setMode('ADD')}
                style={{ fontSize: '12.5px' }}
              >
                + Receive / Add
              </button>
              <button
                type="button"
                className={`btn ${mode === 'DEDUCT' ? 'btn-dark' : 'btn-ghost'}`}
                onClick={() => setMode('DEDUCT')}
                style={{ fontSize: '12.5px' }}
              >
                - Deduct / Scrap
              </button>
              <button
                type="button"
                className={`btn ${mode === 'SET' ? 'btn-dark' : 'btn-ghost'}`}
                onClick={() => setMode('SET')}
                style={{ fontSize: '12.5px' }}
              >
                = Override Count
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              {mode === 'SET' ? 'New Total On-Hand Count' : 'Quantity Units to Adjust'}
            </label>
            <input
              type="number"
              min={mode === 'SET' ? '0' : '1'}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Reason / Audit Note
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                fontSize: '13px',
                marginBottom: '8px',
              }}
            >
              <option value="Inbound shipment receiving">Inbound shipment receiving</option>
              <option value="Physical cycle count reconciliation">Physical cycle count reconciliation</option>
              <option value="Inter-warehouse stock transfer">Inter-warehouse stock transfer</option>
              <option value="Damaged / Scrapped goods write-off">Damaged / Scrapped goods write-off</option>
              <option value="Customer return restocked">Customer return restocked</option>
            </select>
          </div>

          {/* Impact Preview */}
          <div
            style={{
              background: 'var(--paper-2)',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase' }}>
                Inventory Impact
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--burnham)', marginTop: '2px' }}>
                On-Hand: <span className="tnum">{currentOnHand} → {computedNewOnHand}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', textTransform: 'uppercase' }}>
                Available to Fulfill
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--viridian-600)', marginTop: '2px' }}>
                <span className="tnum">{computedNewAvailable} units</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-dark">
              Confirm Stock Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
