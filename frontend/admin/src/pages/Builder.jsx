import { useState } from 'react';
import { useEnter } from '../components/Animations';
import { CountUp } from '../components/Animations';
import { catalog, upsells } from '../data/mockData';

export default function Builder() {
  const ref = useEnter([]);
  const [lines, setLines] = useState([
    { id: 'p1', qty: 1, discount: 12 },
    { id: 'p2', qty: 1, discount: 18 },
  ]);

  const addProduct = (id) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === id);
      if (existing) return prev.map((l) => l.id === id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { id, qty: 1, discount: 0 }];
    });
  };

  const updateQty = (id, d) =>
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, qty: Math.max(1, l.qty + d) } : l));

  const updateDiscount = (id, val) =>
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, discount: Math.max(0, val) } : l));

  const enriched = lines.map((l) => ({ ...l, product: catalog.find((p) => p.id === l.id) }));
  const subtotal = enriched.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discountTotal = enriched.reduce((s, l) => s + l.product.price * l.qty * (l.discount / 100), 0);
  const total = subtotal - discountTotal;
  const cost = enriched.reduce((s, l) => s + l.product.cost * l.qty, 0);
  const marginPct = total > 0 ? Math.max(0, ((total - cost) / total) * 100) : 0;

  return (
    <div ref={ref} className="builder">
      {/* Catalog */}
      <div className="panel fade-target">
        <div className="panel-header"><h3>Catalog</h3></div>
        <div className="panel-body">
          {catalog.map((p) => (
            <div className="catalog-item" key={p.id}>
              <div>
                <div className="name">{p.name}</div>
                <div className="cat">{p.cat} · ${p.price}</div>
              </div>
              <button className="add-btn" onClick={() => addProduct(p.id)}>+</button>
            </div>
          ))}
        </div>
      </div>

      {/* Quotation table */}
      <div className="panel fade-target">
        <div className="panel-header">
          <h3>Quotation — Acme Corp</h3>
          <span className="tag tag-green">Gold tier</span>
        </div>
        <table className="cart">
          <thead>
            <tr>
              <th>Line</th><th>Qty</th><th>Discount</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((l) => {
              const over = l.discount > l.product.ceiling;
              return (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.product.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-60)' }}>
                      {l.product.cat} · ceiling {l.product.ceiling}%
                    </div>
                  </td>
                  <td>
                    <div className="qty-ctrl">
                      <button onClick={() => updateQty(l.id, -1)}>−</button>
                      <span className="tnum">{l.qty}</span>
                      <button onClick={() => updateQty(l.id, 1)}>+</button>
                    </div>
                  </td>
                  <td>
                    <input
                      className={'disc-input' + (over ? ' over' : '')}
                      type="number"
                      value={l.discount}
                      onChange={(e) => updateDiscount(l.id, Number(e.target.value))}
                    />%
                    {over && (
                      <div style={{ fontSize: 10.5, color: 'var(--rose)', marginTop: 3 }}>
                        +{l.discount - l.product.ceiling} pts over
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }} className="tnum">
                    ${Math.round(l.product.price * l.qty * (1 - l.discount / 100)).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
          <span className="row-sub">
            Subtotal ${subtotal.toLocaleString()} · Discount −${Math.round(discountTotal).toLocaleString()}
          </span>
          <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 19 }} className="tnum">
            ${Math.round(total).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Right column: margin + upsells + send */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="panel fade-target">
          <div className="panel-header"><h3>Live margin</h3></div>
          <div className="margin-box">
            <div className="margin-num"><CountUp value={marginPct} decimals={1} />%</div>
            <div className="margin-bar">
              <div className="fill" style={{ width: Math.min(100, marginPct) + '%' }} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>
              Updates instantly as lines and discounts change
            </div>
          </div>
        </div>

        <div className="panel fade-target">
          <div className="panel-header"><h3>Upsell suggestions</h3></div>
          <div className="panel-body">
            {upsells.map((u) => (
              <div className="upsell-item" key={u.id}>
                <div className="name">
                  {u.name}{' '}
                  {u.tag && <span className="tag tag-green" style={{ marginLeft: 6 }}>{u.tag}</span>}
                </div>
                <div className="delta">{u.delta}</div>
                <div className="upsell-actions">
                  <button className="btn btn-primary" onClick={() => addProduct(u.id === 'u1' ? 'p3' : 'p4')}>
                    Add to quote
                  </button>
                  <button className="btn btn-ghost">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-dark" style={{ justifyContent: 'center' }}>
          Send for approval →
        </button>
      </div>
    </div>
  );
}
