import { useState, useEffect } from 'react';
import productService from '../../services/productService';

export default function PriceListModal({ isOpen, onClose, priceList = null, onSave }) {
  const isEdit = Boolean(priceList);
  const currencies = productService.getCurrencies();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'INR',
    customerType: 'Commercial Direct',
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    status: 'Active',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (priceList) {
      setFormData({
        name: priceList.name || '',
        description: priceList.description || '',
        currency: priceList.currency || 'INR',
        customerType: priceList.customerType || 'Commercial Direct',
        effectiveDate: priceList.effectiveDate || '',
        expiryDate: priceList.expiryDate || '',
        status: priceList.status || 'Active',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        currency: 'INR',
        customerType: 'Commercial Direct',
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        status: 'Active',
      });
    }
    setError('');
  }, [priceList, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Price List Name is required.');
      return;
    }
    if (formData.expiryDate && formData.expiryDate < formData.effectiveDate) {
      setError('Expiry Date must be after Effective Date.');
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
          maxWidth: '560px',
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
          <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px' }}>
            {isEdit ? 'Edit Price List Schedule' : 'Create New Price List'}
          </h3>
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
          <div
            style={{
              padding: '10px 24px',
              background: 'var(--rose-100)',
              color: 'var(--rose)',
              fontSize: '12.5px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Price List Name <span style={{ color: 'var(--rose)' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 2026 Direct Enterprise Rate Card"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                fontSize: '13.5px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Base Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  fontSize: '13.5px',
                }}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Customer Type / Segment
              </label>
              <input
                type="text"
                placeholder="e.g. Distributor, Commercial Direct"
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Effective Date
              </label>
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
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
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
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

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Commercial scope and contractual notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                fontSize: '13.5px',
              }}
            >
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-dark">
              {isEdit ? 'Save Changes' : 'Create Price List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
