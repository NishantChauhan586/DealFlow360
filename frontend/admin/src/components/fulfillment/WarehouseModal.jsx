import { useState, useEffect } from 'react';

export default function WarehouseModal({ isOpen, onClose, warehouse = null, onSave }) {
  const isEdit = Boolean(warehouse);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    address: '',
    manager: '',
    contactEmail: '',
    baseShippingCost: 25,
    shippingWeightFactor: 1.0,
    priorityRank: 1,
    capacityUnits: 3000,
    status: 'Active',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (warehouse) {
      setFormData({
        name: warehouse.name || '',
        code: warehouse.code || '',
        location: warehouse.location || '',
        address: warehouse.address || '',
        manager: warehouse.manager || '',
        contactEmail: warehouse.contactEmail || '',
        baseShippingCost: warehouse.baseShippingCost !== undefined ? warehouse.baseShippingCost : 25,
        shippingWeightFactor: warehouse.shippingWeightFactor !== undefined ? warehouse.shippingWeightFactor : 1.0,
        priorityRank: warehouse.priorityRank !== undefined ? warehouse.priorityRank : 1,
        capacityUnits: warehouse.capacityUnits !== undefined ? warehouse.capacityUnits : 3000,
        status: warehouse.status || 'Active',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        location: '',
        address: '',
        manager: '',
        contactEmail: '',
        baseShippingCost: 25,
        shippingWeightFactor: 1.0,
        priorityRank: 1,
        capacityUnits: 3000,
        status: 'Active',
      });
    }
    setError('');
  }, [warehouse, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Warehouse Name is required.');
      return;
    }
    if (Number(formData.baseShippingCost) < 0) {
      setError('Base shipping cost cannot be negative.');
      return;
    }
    if (Number(formData.shippingWeightFactor) <= 0) {
      setError('Shipping weight factor must be greater than zero.');
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
          maxWidth: '620px',
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
              {isEdit ? `Edit Facility — ${warehouse.name}` : 'Create New Warehouse Node'}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--viridian-100)', marginTop: '2px' }}>
              Configure physical inventory capacity, dispatch fees, and auto-split priority weighting
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

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Warehouse Name <span style={{ color: 'var(--rose)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Main Warehouse"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Facility Code
              </label>
              <input
                type="text"
                placeholder="e.g. WH-MAIN"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Region / Metro Area
              </label>
              <input
                type="text"
                placeholder="e.g. Chicago, IL (Midwest Hub)"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Physical Address & Loading Dock
            </label>
            <input
              type="text"
              placeholder="e.g. 4200 Logistics Pkwy, Chicago, IL 60666"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Shipping Cost Weighting Configuration */}
          <div
            style={{
              background: 'var(--paper-2)',
              padding: '14px 16px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--burnham)', marginBottom: '10px' }}>
              Shipping Cost Weighting & Auto-Split Rules
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                  Base Dispatch Fee ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.baseShippingCost}
                  onChange={(e) => setFormData({ ...formData, baseShippingCost: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
                <div style={{ fontSize: '10.5px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  Flat fee per split shipment
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                  Distance Weight Factor
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.05"
                  value={formData.shippingWeightFactor}
                  onChange={(e) => setFormData({ ...formData, shippingWeightFactor: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
                <div style={{ fontSize: '10.5px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  Cost multiplier (1.0 = standard)
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                  Priority Rank
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priorityRank}
                  onChange={(e) => setFormData({ ...formData, priorityRank: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
                <div style={{ fontSize: '10.5px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  1 = Highest preference
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Maximum Unit Capacity
              </label>
              <input
                type="number"
                min="100"
                value={formData.capacityUnits}
                onChange={(e) => setFormData({ ...formData, capacityUnits: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Facility Manager Name
              </label>
              <input
                type="text"
                placeholder="e.g. Marcus Vance"
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-dark">
              {isEdit ? 'Save Changes' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
