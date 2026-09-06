import { useState, useEffect } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Send, MessageSquare } from 'lucide-react';
import { useEnter } from '../components/Animations';
import { CountUp } from '../components/Animations';
import productService from '../services/productService';
import { fetchProducts } from '../utils/apiClient';

const INITIAL_UPSELLS = [];

export default function Builder() {
  const ref = useEnter([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Extract deal details from navigation state or URL params
  const customerName = location.state?.customer || searchParams.get('customer') || 'New Customer';
  const dealStage = location.state?.stage || searchParams.get('stage') || 'Draft';
  const dealAmount = location.state?.amt || searchParams.get('amt') || '';

  const [upsellList, setUpsellList] = useState(INITIAL_UPSELLS);

  // B8 Negotiation Modal State for Sales Rep Preview
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
  const [negotiationStatus, setNegotiationStatus] = useState('Sent'); // 'Sent' | 'Under Negotiation' | 'Confirmed'
  const [counterDiscount, setCounterDiscount] = useState(0);
  const [lineComments, setLineComments] = useState({});
  const [negotiationNotice, setNegotiationNotice] = useState('');

  const [catalogItems, setCatalogItems] = useState(() => {
    const prods = productService.getAllProducts();
    if (prods && prods.length > 0) {
      return prods.map((p) => ({
        id: p.id,
        name: p.name,
        cat: p.category,
        price: p.basePrice,
        cost: p.costPrice || 0,
        ceiling: 15,
      }));
    }
    return [];
  });

  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      const apiProds = await fetchProducts();
      if (isMounted && Array.isArray(apiProds) && apiProds.length > 0) {
        setCatalogItems(
          apiProds.map((p) => ({
            id: p.id,
            name: p.name,
            cat: p.category,
            price: p.basePrice || p.unit_price || p.price || 100,
            cost: p.costPrice || p.unit_cost || p.cost || 0,
            ceiling: p.max_discount || 15,
          }))
        );
      }
    }
    loadCatalog();
    const update = () => {
      const prods = productService.getAllProducts();
      if (prods && prods.length > 0) {
        setCatalogItems(
          prods.map((p) => ({
            id: p.id,
            name: p.name,
            cat: p.category,
            price: p.basePrice,
            cost: p.costPrice || 0,
            ceiling: 15,
          }))
        );
      }
    };
    return productService.subscribe(update);
  }, []);

  const [lines, setLines] = useState([]);

  const addProduct = (id) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === id);
      if (existing) return prev.map((l) => l.id === id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { id, qty: 1, discount: 0 }];
    });
  };

  const handleAddUpsell = (upsellItem) => {
    addProduct(upsellItem.targetId);
    setUpsellList((prev) => prev.filter((u) => u.id !== upsellItem.id));
  };

  const handleDismissUpsell = (upsellId) => {
    setUpsellList((prev) => prev.filter((u) => u.id !== upsellId));
  };

  const updateQty = (id, d) =>
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, qty: Math.max(1, l.qty + d) } : l));

  const updateDiscount = (id, val) =>
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, discount: Math.max(0, val) } : l));

  const enriched = lines
    .map((l) => ({ ...l, product: catalogItems.find((p) => p.id === l.id) }))
    .filter((l) => Boolean(l.product));

  const subtotal = enriched.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discountTotal = enriched.reduce((s, l) => s + l.product.price * l.qty * (l.discount / 100), 0);
  const total = subtotal - discountTotal;
  const cost = enriched.reduce((s, l) => s + l.product.cost * l.qty, 0);

  const stageTagClass = 
    dealStage === 'Draft' ? 'tag-viridian' :
    dealStage === 'Pending Approval' ? 'tag-amber' :
    dealStage === 'Approved' ? 'tag-green' :
    dealStage === 'Fulfillment' ? 'tag-blue' : 'tag-rose';

  // B8 Negotiation Screen Actions inside Builder
  const handleSubmitCounterRequest = () => {
    setNegotiationStatus('Under Negotiation');
    setNegotiationNotice('Counter discount proposal and line change comments submitted for review.');
  };

  const handleConfirmQuotation = () => {
    const requestedDiscount = Number(counterDiscount);
    const exceedsThreshold = requestedDiscount > 10; // 10% threshold rule

    if (exceedsThreshold) {
      setNegotiationStatus('Needs Approval');
      setNegotiationNotice('Terms confirmed! Since requested discount exceeds 10% threshold, quotation automatically re-entered the Manager & Finance Approval Flow.');
    } else {
      setNegotiationStatus('Confirmed');
      setNegotiationNotice('Quotation confirmed! Order successfully routed directly to Warehouse Fulfillment.');
    }
  };

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orderDiscount, setOrderDiscount] = useState(0);

  const filteredCatalogItems = catalogItems.filter(p => {
    if (selectedCategory === 'All') return true;
    return (p.cat || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const orderDiscountAmount = ((subtotal - discountTotal) * Math.max(0, orderDiscount)) / 100;
  const finalTotal = Math.max(0, subtotal - discountTotal - orderDiscountAmount);
  const marginPct = finalTotal > 0 ? Math.max(0, ((finalTotal - cost) / finalTotal) * 100) : 0;

  return (
    <div ref={ref} className="builder">
      
      {/* Top Banner with B8 Negotiation Screen Trigger */}
      <div style={{ gridColumn: '1 / -1', background: '#ffffff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--burnham)' }}>
            Quotation Builder — {customerName}
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--ink-60)' }}>
            Target Value: <strong>{dealAmount || (finalTotal > 0 ? `₹${Math.round(finalTotal).toLocaleString('en-IN')}` : '₹0')}</strong> · Stage: <span className={`tag ${stageTagClass}`}>{dealStage}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNegotiationModalOpen(true)}
          style={{
            background: 'var(--burnham)',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '12.5px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <MessageSquare size={15} /> Customer Portal Negotiation Screen (B8)
        </button>
      </div>

      {/* Catalog */}
      <div className="panel fade-target">
        <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          <h3>Product Catalog</h3>
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['All', 'Hardware', 'Services', 'Subscriptions'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: '1px solid var(--line)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  background: selectedCategory === cat ? 'var(--burnham)' : 'var(--paper-2)',
                  color: selectedCategory === cat ? '#ffffff' : 'var(--ink)',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-body">
          {filteredCatalogItems.map((p) => (
            <div className="catalog-item" key={p.id}>
              <div>
                <div className="name">{p.name}</div>
                <div className="cat">{p.cat} · ₹{p.price}</div>
              </div>
              <button className="add-btn" onClick={() => addProduct(p.id)}>+</button>
            </div>
          ))}
          {filteredCatalogItems.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--ink-60)', padding: '12px 0', textAlign: 'center' }}>
              No products found in category "{selectedCategory}".
            </div>
          )}
        </div>
      </div>

      {/* Quotation table */}
      <div className="panel fade-target">
        <div className="panel-header">
          <div>
            <h3>Quotation Cart — {customerName}</h3>
            <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
              Governance: Discounts ≤ 10% auto-approve; &gt; 10% route to Manager & Finance
            </div>
          </div>
          <span className={`tag ${stageTagClass}`}>{dealStage}</span>
        </div>
        <table className="cart">
          <thead>
            <tr>
              <th>Line</th><th>Qty</th><th>Discount</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {enriched.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--ink-40)' }}>
                  Quotation cart is empty. Click "+" next to a product in the catalog to add line items.
                </td>
              </tr>
            ) : (
              enriched.map((l) => {
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
                      ₹{Math.round(l.product.price * l.qty * (1 - l.discount / 100)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Order-Level Discount Controls */}
        <div style={{ padding: '12px 18px', background: 'var(--paper-2)', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--burnham)' }}>
            Apply Order-Level Commercial Discount:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="number"
              min="0"
              max="50"
              value={orderDiscount}
              onChange={(e) => setOrderDiscount(Math.max(0, Number(e.target.value)))}
              style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', fontSize: '12.5px', fontWeight: 700 }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>%</span>
          </div>
        </div>

        <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
          <span className="row-sub">
            Subtotal ₹{subtotal.toLocaleString('en-IN')} · Line Disc −₹{Math.round(discountTotal).toLocaleString('en-IN')} · Order Disc −₹{Math.round(orderDiscountAmount).toLocaleString('en-IN')}
          </span>
          <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 19 }} className="tnum">
            ₹{Math.round(finalTotal).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Right column: margin + send */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Live Margin Indicator */}
        <div className="panel fade-target">
          <div className="panel-header"><h3>Live margin</h3></div>
          <div className="margin-box">
            <div className="margin-num"><CountUp value={marginPct} decimals={1} />%</div>
            <div className="margin-bar">
              <div className="fill" style={{ width: Math.min(100, marginPct) + '%' }} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>
              Updates immediately as lines or discounts are added
            </div>
          </div>
        </div>

        <button
          className="btn btn-dark"
          style={{ justifyContent: 'center', padding: '12px', fontSize: '13px', fontWeight: 700 }}
          onClick={() => {
            const maxLineDisc = Math.max(0, ...enriched.map(l => l.discount), orderDiscount);
            if (maxLineDisc > 10) {
              alert(`Quote Terms Require Approval (${maxLineDisc}% discount > 10% ceiling). Routing to Approval Flow.`);
              navigate('/approval');
            } else {
              alert(`Quote Auto-Approved! (${maxLineDisc}% discount <= 10% threshold). Moving straight to Fulfillment.`);
              navigate('/fulfillment');
            }
          }}
        >
          Confirm & Submit Quotation →
        </button>
      </div>

      {/* B8) CUSTOMER PORTAL NEGOTIATION SCREEN MODAL IN BUILDER */}
      <AnimatePresence>
        {isNegotiationModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 34, 28, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '820px',
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: '36px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                position: 'relative'
              }}
            >
              <button 
                onClick={() => setIsNegotiationModalOpen(false)}
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-60)' }}
              >
                <X size={22} />
              </button>

              {/* B8 Header */}
              <div style={{ borderBottom: '2px solid var(--burnham)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--viridian)', fontWeight: 700 }}>
                    B8 Customer Portal Negotiation Screen
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'var(--serif)', color: 'var(--burnham)' }}>
                    Quotation Proposal — {customerName}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-60)' }}>
                    Customer facing screen (separate from internal workspace)
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--burnham)', fontFamily: 'monospace' }}>
                    {dealAmount}
                  </div>
                  {/* Status Indicator */}
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginTop: '4px',
                    background: 
                      negotiationStatus === 'Confirmed' ? '#EDF7F5' :
                      negotiationStatus === 'Under Negotiation' ? '#FEF3C7' : '#E0F2FE',
                    color:
                      negotiationStatus === 'Confirmed' ? '#00221C' :
                      negotiationStatus === 'Under Negotiation' ? '#D97706' : '#0284C7'
                  }}>
                    Status: {negotiationStatus}
                  </span>
                </div>
              </div>

              {/* Notice Banner */}
              {negotiationNotice && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: negotiationNotice.includes('Approval') ? '#FEF3C7' : '#EDF7F5',
                  color: negotiationNotice.includes('Approval') ? '#D97706' : '#00221C',
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '20px'
                }}>
                  {negotiationNotice}
                </div>
              )}

              {/* B8 Line Level Comment and Change Request Tool */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--burnham)', margin: '0 0 10px 0', fontWeight: 700 }}>
                  Itemized Lines & Line Level Comment Tool
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--line)', background: '#F1F6F5', color: 'var(--burnham)', fontWeight: 700 }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Line Item</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Customer Change Request / Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.product.name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>{item.product.cat}</div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>₹{item.product.price}</td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="text"
                            placeholder="Add line comment or request qty change..."
                            value={lineComments[idx] || ''}
                            onChange={(e) => setLineComments({ ...lineComments, [idx]: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--line)',
                              fontSize: '12px'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* B8 Counter Discount Proposal Field */}
              <div style={{ background: 'var(--paper-2)', padding: '18px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--burnham)' }}>
                    Counter Discount Proposal Field
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                    Enter target counter discount % (Discounts ≤10% auto-approve; &gt;10% re-enter approval flow).
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--burnham)' }}>
                    Counter Proposal:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={counterDiscount}
                    onChange={(e) => setCounterDiscount(e.target.value)}
                    style={{
                      width: '80px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      fontWeight: 700,
                      fontSize: '14px'
                    }}
                  />
                  <span style={{ fontWeight: 700 }}>%</span>
                </div>
              </div>

              {/* B8 Buttons: Submit Request & Confirm Quotation */}
              <div style={{ borderTop: '2px solid var(--line)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsNegotiationModalOpen(false)}
                  style={{ background: 'none', border: '1px solid var(--line)', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                >
                  Close Screen
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleSubmitCounterRequest}
                    style={{
                      background: '#EAF0EE',
                      color: 'var(--burnham)',
                      border: '1px solid var(--viridian)',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '13.5px'
                    }}
                  >
                    Submit Request
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmQuotation}
                    style={{
                      background: 'var(--burnham)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      boxShadow: '0 4px 12px rgba(0,34,28,0.2)'
                    }}
                  >
                    Confirm Quotation
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
