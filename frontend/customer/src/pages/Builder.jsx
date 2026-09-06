import { useState, useEffect } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageSquare,
  ShieldCheck,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Tag,
  Package,
} from 'lucide-react';
import { useEnter } from '../components/Animations';
import { CountUp } from '../components/Animations';
import productService from '../services/productService';
import { fetchProducts } from '../utils/apiClient';
import s from './Builder.module.css';

const fallbackCatalog = [
  { id: 'p1', name: 'Orion 15 Pro Laptop', cat: 'Hardware', price: 1200, cost: 850, ceiling: 15 },
  { id: 'p2', name: 'UltraSync 27 Display', cat: 'Hardware', price: 450, cost: 280, ceiling: 15 },
  { id: 'p3', name: 'Extended Care Plan', cat: 'Services', price: 150, cost: 80, ceiling: 10 },
  { id: 'p4', name: 'Docking Station ×2', cat: 'Hardware', price: 220, cost: 120, ceiling: 15 },
  { id: 'p5', name: 'Wireless Ergonomic Keyboard', cat: 'Accessories', price: 85, cost: 45, ceiling: 15 },
  { id: 'p6', name: 'Security Suite (Sub)', cat: 'Subscription', price: 35, cost: 10, ceiling: 20 },
];

export default function Builder() {
  const ref = useEnter([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const customerName = location.state?.customer || searchParams.get('customer') || 'Acme Corp';
  const dealStage = location.state?.stage || searchParams.get('stage') || 'Draft';
  const dealAmount = location.state?.amt || searchParams.get('amt') || '₹34,900';

  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
  const [negotiationStatus, setNegotiationStatus] = useState('Sent');
  const [counterDiscount, setCounterDiscount] = useState(12);
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
    return fallbackCatalog;
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

  const [lines, setLines] = useState(() => {
    const p1 = catalogItems[0]?.id || 'p1';
    const p2 = catalogItems[1]?.id || 'p2';
    return [
      { id: p1, qty: 1, discount: 12 },
      { id: p2, qty: 1, discount: 18 },
    ];
  });

  const addProduct = (id) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === id);
      if (existing) return prev.map((l) => l.id === id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { id, qty: 1, discount: 0 }];
    });
  };

  const removeLine = (id) => setLines((prev) => prev.filter((l) => l.id !== id));

  const updateQty = (id, d) =>
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, qty: Math.max(1, l.qty + d) } : l));

  const updateDiscount = (id, val) =>
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, discount: Math.max(0, val) } : l));

  const enriched = lines
    .map((l) => ({ ...l, product: catalogItems.find((p) => p.id === l.id) }))
    .filter((l) => Boolean(l.product));

  const subtotal = enriched.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discountTotal = enriched.reduce((s, l) => s + l.product.price * l.qty * (l.discount / 100), 0);
  const cost = enriched.reduce((s, l) => s + l.product.cost * l.qty, 0);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orderDiscount, setOrderDiscount] = useState(0);

  const filteredCatalogItems = catalogItems.filter((p) => {
    if (selectedCategory === 'All') return true;
    return (p.cat || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const orderDiscountAmount = ((subtotal - discountTotal) * Math.max(0, orderDiscount)) / 100;
  const finalTotal = Math.max(0, subtotal - discountTotal - orderDiscountAmount);
  const marginPct = finalTotal > 0 ? Math.max(0, ((finalTotal - cost) / finalTotal) * 100) : 0;
  const maxDiscount = Math.max(0, ...enriched.map((l) => l.discount), orderDiscount);
  const needsApproval = maxDiscount > 10;

  // Stage tag class
  const stageClass =
    dealStage === 'Draft' ? s.stageDraft :
    dealStage === 'Pending Approval' ? s.stagePending :
    dealStage === 'Approved' ? s.stageApproved : s.stageRose;

  // Margin color class
  const marginColorClass =
    marginPct < 10 ? s.marginNumBad :
    marginPct < 20 ? s.marginNumWarn : '';

  const marginBarClass =
    marginPct < 10 ? s.marginBarFillBad :
    marginPct < 20 ? s.marginBarFillWarn : s.marginBarFill;

  const marginStatusClass =
    marginPct < 10 ? s.marginStatusBad :
    marginPct < 20 ? s.marginStatusWarn : s.marginStatusGood;

  const marginStatusText =
    marginPct < 10 ? 'Low Margin' :
    marginPct < 20 ? 'Tight' : 'Healthy';

  // Modal handlers
  const handleSubmitCounterRequest = () => {
    setNegotiationStatus('Under Negotiation');
    setNegotiationNotice('Counter discount proposal and line change comments submitted for review.');
  };

  const handleConfirmQuotation = () => {
    const requested = Number(counterDiscount);
    if (requested > 10) {
      setNegotiationStatus('Needs Approval');
      setNegotiationNotice('Terms confirmed. Requested discount exceeds 10% — quotation automatically re-entered the Manager & Finance Approval Flow.');
    } else {
      setNegotiationStatus('Confirmed');
      setNegotiationNotice('Quotation confirmed! Order successfully routed directly to Warehouse Fulfillment.');
    }
  };

  const modalStatusClass =
    negotiationStatus === 'Confirmed' ? s.statusConfirmed :
    negotiationStatus === 'Under Negotiation' ? s.statusNegotiating :
    negotiationStatus === 'Needs Approval' ? s.statusApproval : s.statusSent;

  const noticeClass = negotiationNotice.includes('Approval') ? s.noticeBannerApproval : s.noticeBannerSuccess;

  return (
    <div ref={ref} className={s.builderRoot}>

      {/* ── Header Banner ── */}
      <div className={`${s.headerBanner} fade-target`}>
        <div className={s.headerLeft}>
          <h3>Quotation Builder — {customerName}</h3>
          <div className={s.headerMeta}>
            <span>Target Value: <strong>{dealAmount}</strong></span>
            <span style={{ opacity: 0.35 }}>·</span>
            <span>Stage:</span>
            <span className={`${s.stageTag} ${stageClass}`}>{dealStage}</span>
            {needsApproval && (
              <>
                <span style={{ opacity: 0.35 }}>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--amber)', fontWeight: 700, fontSize: '12px' }}>
                  <AlertTriangle size={12} /> Approval required for {maxDiscount}% discount
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsNegotiationModalOpen(true)}
          className={s.negotiationBtn}
        >
          <MessageSquare size={14} />
          Customer Portal Negotiation (B8)
        </button>
      </div>

      {/* ── Product Catalog ── */}
      <div className={`${s.panel} ${s.catalogPanel} fade-target`}>
        <div className={s.panelHeader} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
          <h3>Product Catalog</h3>
          <div className={s.categoryFilters}>
            {['All', 'Hardware', 'Services', 'Subscriptions'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`${s.catPill} ${selectedCategory === cat ? s.catPillActive : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className={s.catalogList}>
          {filteredCatalogItems.map((p) => (
            <div className={s.catalogItem} key={p.id}>
              <div>
                <div className={s.catalogItemName}>{p.name}</div>
                <div className={s.catalogItemMeta}>
                  <Package size={10} />
                  {p.cat}
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span className={s.catalogItemPrice}>₹{p.price.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button className={s.addBtn} onClick={() => addProduct(p.id)} title="Add to quote">+</button>
            </div>
          ))}
          {filteredCatalogItems.length === 0 && (
            <div className={s.emptyState}>No products in &ldquo;{selectedCategory}&rdquo;</div>
          )}
        </div>
      </div>

      {/* ── Quotation Cart ── */}
      <div className={`${s.panel} ${s.cartPanel} fade-target`}>
        <div className={s.panelHeader}>
          <div className={s.panelHeaderLeft}>
            <h3>Quotation Cart — {customerName}</h3>
            <div className={s.governanceNote}>
              <ShieldCheck size={12} style={{ color: 'var(--viridian)', flexShrink: 0 }} />
              Discounts ≤ 10% auto-approve · &gt; 10% route to Manager &amp; Finance
            </div>
          </div>
          <span className={`${s.stageTag} ${stageClass}`}>{dealStage}</span>
        </div>

        <table className={s.cart}>
          <thead>
            <tr>
              <th>Line Item</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th>Discount</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((l) => {
              const over = l.discount > l.product.ceiling;
              const lineTotal = Math.round(l.product.price * l.qty * (1 - l.discount / 100));
              return (
                <tr key={l.id} className={s.cartRow}>
                  <td>
                    <div className={s.lineItemName}>{l.product.name}</div>
                    <div className={s.lineItemMeta}>
                      {l.product.cat}
                      <span className={s.ceilingBadge}>
                        <Tag size={8} /> ceiling {l.product.ceiling}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className={s.qtyCtrl} style={{ justifyContent: 'center' }}>
                      <button className={s.qtyBtn} onClick={() => updateQty(l.id, -1)}>−</button>
                      <span className={s.qtyValue}>{l.qty}</span>
                      <button className={s.qtyBtn} onClick={() => updateQty(l.id, 1)}>+</button>
                    </div>
                  </td>
                  <td>
                    <div className={s.discountCell}>
                      <div className={s.discountInputWrap}>
                        <input
                          className={`${s.discInput} ${over ? s.discInputOver : ''}`}
                          type="number"
                          value={l.discount}
                          onChange={(e) => updateDiscount(l.id, Number(e.target.value))}
                        />
                        <span className={s.discSymbol}>%</span>
                      </div>
                      {over && (
                        <span className={s.overCeilingBadge}>
                          <AlertTriangle size={9} />
                          +{l.discount - l.product.ceiling} pts over
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={s.lineTotal}>
                      ₹{lineTotal.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td>
                    <button className={s.removeBtn} onClick={() => removeLine(l.id)} title="Remove line">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {enriched.length === 0 && (
              <tr>
                <td colSpan={5} className={s.emptyState}>
                  Add products from the catalog to begin building your quote.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Order-level discount */}
        <div className={s.orderDiscountBar}>
          <span className={s.orderDiscLabel}>
            <Tag size={13} style={{ color: 'var(--viridian-600)' }} />
            Order-Level Commercial Discount
          </span>
          <div className={s.orderDiscInputWrap}>
            <input
              type="number"
              min="0"
              max="50"
              value={orderDiscount}
              onChange={(e) => setOrderDiscount(Math.max(0, Number(e.target.value)))}
              className={s.orderDiscInput}
            />
            <span className={s.discSymbol}>%</span>
          </div>
        </div>

        {/* Totals */}
        <div className={s.totalsRow}>
          <div className={s.totalsBreakdown}>
            <div className={s.totalsBreakdownItem}>
              <span style={{ color: 'var(--ink-40)', minWidth: 72 }}>Subtotal</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
            {discountTotal > 0 && (
              <div className={s.totalsBreakdownItem}>
                <span style={{ color: 'var(--ink-40)', minWidth: 72 }}>Line Disc.</span>
                <span style={{ fontWeight: 600, color: 'var(--rose)', fontVariantNumeric: 'tabular-nums' }}>
                  −₹{Math.round(discountTotal).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            {orderDiscountAmount > 0 && (
              <div className={s.totalsBreakdownItem}>
                <span style={{ color: 'var(--ink-40)', minWidth: 72 }}>Order Disc.</span>
                <span style={{ fontWeight: 600, color: 'var(--rose)', fontVariantNumeric: 'tabular-nums' }}>
                  −₹{Math.round(orderDiscountAmount).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
          <div className={s.grandTotal}>
            <span className={s.grandTotalLabel}>Grand Total</span>
            <span className={s.grandTotalAmount}>
              ₹{Math.round(finalTotal).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Right Column ── */}
      <div className={`${s.rightCol} fade-target`}>

        {/* Live Margin Panel */}
        <div className={s.panel}>
          <div className={s.panelHeader}>
            <h3>Live Margin</h3>
            <span className={`${s.marginStatus} ${marginStatusClass}`}>{marginStatusText}</span>
          </div>
          <div className={s.marginContent}>
            <div className={s.marginNumRow}>
              <span className={`${s.marginNum} ${marginColorClass}`}>
                <CountUp value={marginPct} decimals={1} />
              </span>
              <span className={`${s.marginUnit} ${marginColorClass}`}>%</span>
            </div>
            <div className={s.marginBarTrack}>
              <div
                className={marginBarClass}
                style={{ width: `${Math.min(100, marginPct)}%` }}
              />
            </div>
            <div className={s.marginHint}>Updates live as lines or discounts change</div>

            <div className={s.marginStats}>
              <div className={s.marginStat}>
                <div className={s.marginStatValue}>₹{Math.round(finalTotal).toLocaleString('en-IN')}</div>
                <div className={s.marginStatLabel}>Revenue</div>
              </div>
              <div className={s.marginStat}>
                <div className={s.marginStatValue}>₹{Math.round(cost).toLocaleString('en-IN')}</div>
                <div className={s.marginStatLabel}>Cost</div>
              </div>
              <div className={s.marginStat}>
                <div className={s.marginStatValue}>₹{Math.round(finalTotal - cost).toLocaleString('en-IN')}</div>
                <div className={s.marginStatLabel}>Profit</div>
              </div>
            </div>
          </div>
        </div>

        {/* Governance Info Card */}
        <div className={s.governanceCard}>
          <ShieldCheck size={16} className={s.governanceCardIcon} />
          <div>
            <div className={s.governanceCardTitle}>Approval Policy</div>
            <div className={s.governanceCardText}>
              Discounts ≤ 10% auto-approve and route to Fulfillment.
              Discounts &gt; 10% require Manager &amp; Finance sign-off.
            </div>
          </div>
        </div>

        {/* Confirm & Submit */}
        <button
          className={s.submitBtn}
          onClick={() => {
            if (needsApproval) {
              alert(`Approval required — ${maxDiscount}% discount exceeds the 10% ceiling. Routing to Approval Flow.`);
              navigate('/approval');
            } else {
              alert(`Quote auto-approved (${maxDiscount}% ≤ 10%). Moving to Fulfillment.`);
              navigate('/fulfillment');
            }
          }}
        >
          Confirm &amp; Submit Quotation
          <ArrowRight size={16} />
        </button>

        {needsApproval && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--amber-100)', border: '1px solid var(--amber)', borderRadius: 8, padding: '10px 13px', fontSize: '12px', fontWeight: 600, color: '#7a4e22' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--amber)' }} />
            Max discount {maxDiscount}% exceeds 10% ceiling — submission will trigger Manager &amp; Finance approval.
          </div>
        )}
      </div>

      {/* ── B8 Negotiation Modal ── */}
      <AnimatePresence>
        {isNegotiationModalOpen && (
          <div className={s.modalOverlay}>
            <motion.div
              className={s.modalSheet}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Modal Header */}
              <div className={s.modalHeader}>
                <button className={s.modalCloseBtn} onClick={() => setIsNegotiationModalOpen(false)}>
                  <X size={16} />
                </button>
                <div>
                  <div className={s.modalEyebrow}>B8 · Customer Portal Negotiation Screen</div>
                  <div className={s.modalTitle}>Quotation Proposal — {customerName}</div>
                  <div className={s.modalSub}>Customer-facing screen · Separate from internal workspace</div>
                </div>
                <div className={s.modalHeaderRight}>
                  <div className={s.modalAmount}>{dealAmount}</div>
                  <div>
                    <span className={`${s.modalStatusBadge} ${modalStatusClass}`}>
                      {negotiationStatus === 'Confirmed' && <CheckCircle2 size={11} />}
                      {negotiationStatus === 'Needs Approval' && <AlertTriangle size={11} />}
                      {negotiationStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className={s.modalBody}>

                {/* Notice Banner */}
                {negotiationNotice && (
                  <div className={`${s.noticeBanner} ${noticeClass}`}>
                    {negotiationNotice.includes('Approval') ? <AlertTriangle size={15} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={15} style={{ flexShrink: 0 }} />}
                    {negotiationNotice}
                  </div>
                )}

                {/* Line Items Section */}
                <div className={s.modalSection}>
                  <div className={s.modalSectionTitle}>Itemized Lines &amp; Comment Tool</div>
                  <table className={s.modalTable}>
                    <thead>
                      <tr>
                        <th>Line Item</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                        <th style={{ textAlign: 'right' }}>Line Total</th>
                        <th>Change Request / Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enriched.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.product.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-60)', marginTop: 2 }}>{item.product.cat}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            ₹{item.product.price.toLocaleString('en-IN')}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--serif)', fontVariantNumeric: 'tabular-nums', color: 'var(--burnham)' }}>
                            ₹{Math.round(item.product.price * item.qty * (1 - item.discount / 100)).toLocaleString('en-IN')}
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Add change request or comment..."
                              value={lineComments[idx] || ''}
                              onChange={(e) => setLineComments({ ...lineComments, [idx]: e.target.value })}
                              className={s.modalCommentInput}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Counter Discount Section */}
                <div className={s.modalSection}>
                  <div className={s.modalSectionTitle}>Counter Discount Proposal</div>
                  <div className={s.counterSection}>
                    <div>
                      <div className={s.counterLabel}>Counter Discount Field</div>
                      <div className={s.counterHint}>
                        Enter your target counter discount %. Discounts ≤ 10% auto-approve;
                        discounts &gt; 10% automatically re-enter the Manager &amp; Finance Approval Flow.
                      </div>
                    </div>
                    <div className={s.counterInputWrap}>
                      <span className={s.counterInputLabel}>Proposal:</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={counterDiscount}
                        onChange={(e) => setCounterDiscount(e.target.value)}
                        className={s.counterInput}
                      />
                      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-60)' }}>%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className={s.modalFooter}>
                <button type="button" onClick={() => setIsNegotiationModalOpen(false)} className={s.btnGhost}>
                  Close Screen
                </button>
                <div className={s.modalFooterRight}>
                  <button type="button" onClick={handleSubmitCounterRequest} className={s.btnOutline}>
                    Submit Request
                  </button>
                  <button type="button" onClick={handleConfirmQuotation} className={s.btnSolid}>
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
