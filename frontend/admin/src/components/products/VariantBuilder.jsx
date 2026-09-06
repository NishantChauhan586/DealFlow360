import { useState } from 'react';
import { IconPlus, IconTrash, IconLayers } from '../Icons';
import productService, { formatINR } from '../../services/productService';

export default function VariantBuilder({
  attributes,
  setAttributes,
  variants,
  setVariants,
  basePrice,
  baseSku,
}) {
  const [newAttrName, setNewAttrName] = useState('');
  const [newValueInput, setNewValueInput] = useState({});

  // Add a new attribute group (e.g. Size, Color, Pack)
  const handleAddAttribute = (e) => {
    e.preventDefault();
    if (!newAttrName.trim()) return;
    const exists = attributes.some(
      (a) => a.name.toLowerCase() === newAttrName.trim().toLowerCase()
    );
    if (exists) {
      alert(`Attribute "${newAttrName}" already exists.`);
      return;
    }
    setAttributes([...attributes, { name: newAttrName.trim(), values: [] }]);
    setNewAttrName('');
  };

  // Remove an attribute group
  const handleRemoveAttribute = (attrIndex) => {
    const updated = attributes.filter((_, idx) => idx !== attrIndex);
    setAttributes(updated);
  };

  // Add a value tag to an attribute
  const handleAddValue = (attrIndex) => {
    const val = (newValueInput[attrIndex] || '').trim();
    if (!val) return;
    const attr = attributes[attrIndex];
    if (attr.values.includes(val)) return;

    const updated = [...attributes];
    updated[attrIndex] = {
      ...attr,
      values: [...attr.values, val],
    };
    setAttributes(updated);
    setNewValueInput({ ...newValueInput, [attrIndex]: '' });
  };

  // Remove a value tag
  const handleRemoveValue = (attrIndex, valIndex) => {
    const updated = [...attributes];
    updated[attrIndex] = {
      ...updated[attrIndex],
      values: updated[attrIndex].values.filter((_, idx) => idx !== valIndex),
    };
    setAttributes(updated);
  };

  // Cartesian Auto-Generation
  const handleGenerateCombinations = () => {
    const generated = productService.generateVariantMatrix(attributes, basePrice, baseSku);
    if (generated.length === 0) {
      alert('Please add at least one attribute with values first.');
      return;
    }
    setVariants(generated);
  };

  // Update a single variant field
  const handleVariantChange = (id, field, value) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const updated = { ...v, [field]: value };
          if (field === 'extraPrice') {
            const extra = Number(value) || 0;
            updated.finalPrice = Math.max(0, (Number(basePrice) || 0) + extra);
          }
          return updated;
        }
        return v;
      })
    );
  };

  // Delete a single variant
  const handleDeleteVariant = (id) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner: Instructions */}
      <div style={{
        background: 'var(--paper-2)',
        padding: '14px 18px',
        borderRadius: '6px',
        border: '1px solid var(--line)',
        fontSize: '13px',
        lineHeight: 1.5,
        color: 'var(--ink)'
      }}>
        <strong>Variant Generator:</strong> Define attributes like <em>Size, Pack, or Color</em>.
        DealFlow360 will compute the Cartesian combination matrix with custom SKU codes, stock counts, and price differentials.
      </div>

      {/* Attributes Configurator */}
      <div style={{
        border: '1px solid var(--line)',
        borderRadius: '6px',
        padding: '16px',
        background: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--burnham)' }}>
            1. Configure Attributes
          </h4>
          <span style={{ fontSize: '12px', color: 'var(--ink-60)' }}>
            {attributes.length} attribute{attributes.length === 1 ? '' : 's'} defined
          </span>
        </div>

        {/* Existing attributes list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {attributes.map((attr, aIdx) => (
            <div
              key={aIdx}
              style={{
                border: '1px solid rgba(8,32,26,0.08)',
                background: 'var(--paper)',
                padding: '12px 14px',
                borderRadius: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--burnham)' }}>
                  Attribute: {attr.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(aIdx)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--rose)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <IconTrash style={{ width: 14, height: 14 }} /> Remove
                </button>
              </div>

              {/* Tag badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {attr.values.map((val, vIdx) => (
                  <span
                    key={vIdx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--white)',
                      border: '1px solid var(--viridian-300)',
                      padding: '3px 10px',
                      borderRadius: '14px',
                      fontSize: '12px',
                      color: 'var(--burnham)',
                      fontWeight: 500
                    }}
                  >
                    {val}
                    <button
                      type="button"
                      onClick={() => handleRemoveValue(aIdx, vIdx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--ink-40)',
                        fontSize: '14px',
                        lineHeight: 1,
                        padding: 0
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}

                {/* Add value input */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="text"
                    placeholder={`Add ${attr.name} value...`}
                    value={newValueInput[aIdx] || ''}
                    onChange={(e) => setNewValueInput({ ...newValueInput, [aIdx]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddValue(aIdx);
                      }
                    }}
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      width: '140px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddValue(aIdx)}
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', fontSize: '12px', height: '26px' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* New Attribute Form */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <input
              type="text"
              placeholder="New attribute name (e.g. Size, Color, Pack)..."
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              style={{
                flex: 1,
                fontSize: '13px',
                padding: '8px 12px',
                border: '1px solid var(--line)',
                borderRadius: '4px'
              }}
            />
            <button
              type="button"
              onClick={handleAddAttribute}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconPlus style={{ width: 14, height: 14 }} /> Add Attribute
            </button>
          </div>
        </div>

        {/* Generate Matrix Button */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleGenerateCombinations}
            className="btn btn-dark"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <IconLayers style={{ width: 16, height: 16 }} /> Generate All Combinations
          </button>
        </div>
      </div>

      {/* 2. Variants Matrix Table */}
      <div style={{
        border: '1px solid var(--line)',
        borderRadius: '6px',
        background: '#fff',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '12px 16px',
          background: 'var(--paper)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--burnham)' }}>
              2. Generated Variants ({variants.length})
            </h4>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', marginTop: '2px' }}>
              Base Price: <strong className="tnum">{formatINR(Number(basePrice) || 0)}</strong>
            </div>
          </div>
        </div>

        {variants.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--ink-40)', fontSize: '13px' }}>
            No variants generated yet. Define attributes above and click "Generate All Combinations".
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '10px 12px' }}>Combination</th>
                  <th style={{ padding: '10px 12px' }}>Variant SKU</th>
                  <th style={{ padding: '10px 12px' }}>Extra Price (₹)</th>
                  <th style={{ padding: '10px 12px' }}>Final Price (₹)</th>
                  <th style={{ padding: '10px 12px' }}>Barcode</th>
                  <th style={{ padding: '10px 12px' }}>Stock</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(8,32,26,0.06)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--burnham)' }}>
                      {Object.entries(v.combination || {}).map(([k, val]) => (
                        <span
                          key={k}
                          style={{
                            display: 'inline-block',
                            background: 'var(--viridian-100)',
                            color: 'var(--viridian-600)',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '11px',
                            marginRight: '4px'
                          }}
                        >
                          {val}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={v.variantSku || ''}
                        onChange={(e) => handleVariantChange(v.id, 'variantSku', e.target.value)}
                        style={{
                          width: '120px',
                          padding: '4px 6px',
                          fontSize: '12px',
                          border: '1px solid var(--line)',
                          borderRadius: '3px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={v.extraPrice !== undefined ? v.extraPrice : 0}
                        onChange={(e) => handleVariantChange(v.id, 'extraPrice', e.target.value)}
                        style={{
                          width: '75px',
                          padding: '4px 6px',
                          fontSize: '12px',
                          border: '1px solid var(--line)',
                          borderRadius: '3px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        className="tnum"
                        style={{
                          fontWeight: 700,
                          color: 'var(--viridian-600)',
                          fontSize: '13px'
                        }}
                      >
                        {formatINR(v.finalPrice !== undefined ? v.finalPrice : basePrice)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={v.barcode || ''}
                        placeholder="Optional"
                        onChange={(e) => handleVariantChange(v.id, 'barcode', e.target.value)}
                        style={{
                          width: '90px',
                          padding: '4px 6px',
                          fontSize: '12px',
                          border: '1px solid var(--line)',
                          borderRadius: '3px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="number"
                        value={v.stockQuantity || 0}
                        onChange={(e) => handleVariantChange(v.id, 'stockQuantity', Number(e.target.value))}
                        style={{
                          width: '65px',
                          padding: '4px 6px',
                          fontSize: '12px',
                          border: '1px solid var(--line)',
                          borderRadius: '3px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={v.status || 'Active'}
                        onChange={(e) => handleVariantChange(v.id, 'status', e.target.value)}
                        style={{
                          padding: '4px 6px',
                          fontSize: '11.5px',
                          border: '1px solid var(--line)',
                          borderRadius: '3px'
                        }}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteVariant(v.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--rose)',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Remove variant"
                      >
                        <IconTrash style={{ width: 14, height: 14 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
