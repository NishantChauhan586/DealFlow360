import { useState, useEffect } from 'react';

export default function ReplenishmentRulesModal({
  isOpen,
  onClose,
  warehouse,
  productItem,
  onSaveRules,
  onTriggerRestock,
}) {
  const [reorderPoint, setReorderPoint] = useState(25);
  const [replenishmentQty, setReplenishmentQty] = useState(50);
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [autoReplenish, setAutoReplenish] = useState(true);

  useEffect(() => {
    if (productItem) {
      setReorderPoint(productItem.reorderPoint !== undefined ? productItem.reorderPoint : 25);
      setReplenishmentQty(productItem.replenishmentQty !== undefined ? productItem.replenishmentQty : 50);
      setLeadTimeDays(productItem.leadTimeDays !== undefined ? productItem.leadTimeDays : 7);
      setAutoReplenish(productItem.autoReplenish !== undefined ? productItem.autoReplenish : true);
    }
  }, [productItem, isOpen]);

  if (!isOpen || !warehouse || !productItem) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveRules(warehouse.id, productItem.productId, {
      reorderPoint: Number(reorderPoint),
      replenishmentQty: Number(replenishmentQty),
      leadTimeDays: Number(leadTimeDays),
      autoReplenish,
    });
  };

  const handleInstantRestock = () => {
    onTriggerRestock(warehouse.id, productItem.productId);
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
          maxWidth: '540px',
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
              Replenishment & Safety Stock Rules
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--viridian-100)', marginTop: '2px' }}>
              {warehouse.name} ({warehouse.code})
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
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--line)',
              padding: '12px 16px',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--burnham)', fontSize: '14px' }}>
              {productItem.product?.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
              Current On-Hand: <strong className="tnum">{productItem.onHand} units</strong> · Reserved: <span className="tnum">{productItem.reserved} units</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Reorder Point (Threshold)
              </label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13.5px',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--ink-60)', marginTop: '3px' }}>
                Triggers restock alert when available falls to or below this
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Replenishment Batch Size
              </label>
              <input
                type="number"
                min="1"
                value={replenishmentQty}
                onChange={(e) => setReplenishmentQty(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13.5px',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--ink-60)', marginTop: '3px' }}>
                Standard purchase order restock quantity
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Supplier Lead Time (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                fontSize: '13.5px',
              }}
            />
            <div style={{ fontSize: '11px', color: 'var(--ink-60)', marginTop: '3px' }}>
              Expected days for stock to arrive and clear receiving inspection
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
              id="autoReplenishCheckbox"
              checked={autoReplenish}
              onChange={(e) => setAutoReplenish(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--viridian)' }}
            />
            <label htmlFor="autoReplenishCheckbox" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Automate Inbound Restock PO Creation When Breached
            </label>
          </div>

          {/* Instant Restock Action */}
          <div
            style={{
              borderTop: '1px solid var(--line)',
              paddingTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleInstantRestock}
                style={{ fontSize: '12px', color: 'var(--viridian-600)', borderColor: 'var(--viridian-300)' }}
              >
                ⚡ Trigger Immediate Restock (+{replenishmentQty} units)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-dark">
                Save Rules
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
