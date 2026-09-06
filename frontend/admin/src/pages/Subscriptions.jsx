import { useState, useEffect, useMemo } from 'react';
import { useEnter } from '../components/Animations';
import { fetchSubscriptions, updateSubscriptionQty, cancelSubscriptionLine } from '../utils/apiClient';
import syncBus from '../utils/syncBus';
import { RefreshCw, Plus, Trash2, Calendar, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Subscriptions() {
  const ref = useEnter([]);

  const [contracts, setContracts] = useState([]);

  const [selectedContractId, setSelectedContractId] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [newQty, setNewQty] = useState(1);
  const [prorationNotice, setProrationNotice] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Fetch from backend API on mount and listen to real-time events
  useEffect(() => {
    async function loadApiSubs() {
      const apiSubs = await fetchSubscriptions();
      if (Array.isArray(apiSubs)) {
        setContracts(apiSubs);
        if (apiSubs.length > 0 && !selectedContractId) {
          setSelectedContractId(apiSubs[0].id);
        }
      }
    }
    loadApiSubs();
    const unsub = syncBus.subscribe('subscriptions', () => {
      loadApiSubs();
    });
    return () => unsub();
  }, []);

  const activeContract = useMemo(() => {
    if (!contracts || contracts.length === 0) return null;
    return contracts.find((c) => c.id === selectedContractId) || contracts[0] || null;
  }, [contracts, selectedContractId]);

  const activeRecurring = useMemo(() => {
    return activeContract?.recurringItems?.filter((i) => i.status === 'ACTIVE') || [];
  }, [activeContract]);

  const mrr = useMemo(() => {
    return activeRecurring.reduce((sum, i) => sum + (i.unitPrice * i.qty), 0);
  }, [activeRecurring]);

  const arr = mrr * 12;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleUpdateQty = (item) => {
    setEditingItem(item);
    setNewQty(item.qty);
  };

  const handleSaveQtyChange = async () => {
    if (!editingItem || !activeContract) return;
    const diff = newQty - editingItem.qty;
    const proratedAmount = (diff * editingItem.unitPrice * 0.5).toFixed(2); // ~15 days remaining in cycle

    await updateSubscriptionQty(activeContract.id, editingItem.id, newQty);
    const updatedSubs = await fetchSubscriptions();
    setContracts(updatedSubs);

    setEditingItem(null);
    showToast(`Updated ${editingItem.name} quantity to ${newQty}. Prorated credit/debit: ₹${proratedAmount}`);
  };

  const handleCancelLine = async (itemId, itemName) => {
    if (!activeContract) return;
    await cancelSubscriptionLine(activeContract.id, itemId);
    const updatedSubs = await fetchSubscriptions();
    setContracts(updatedSubs);
    showToast(`Cancelled subscription line "${itemName}". Credit note generated for remaining days.`);
  };

  // Generate upcoming billing schedule timeline dynamically
  const upcomingSchedule = useMemo(() => {
    if (!activeContract) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const schedule = [];
    const cycleDay = activeContract?.billingCycleDay || 20;

    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, cycleDay);
      const monthLabel = months[d.getMonth()];
      schedule.push({
        date: `${monthLabel} ${cycleDay}`,
        amount: `₹${mrr.toFixed(2)}`,
      });
    }
    return schedule;
  }, [activeContract, mrr]);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Toast Banner */}
      {toastMessage && (
        <div style={{
          background: 'var(--burnham)',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <CheckCircle2 size={16} color="#50E3C2" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Contract Selector & Summary Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-60)', fontWeight: 700 }}>
              Subscription Contract
            </div>
            <select
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              disabled={contracts.length === 0}
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--burnham)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '6px 12px',
                background: 'var(--paper-2)',
                cursor: contracts.length === 0 ? 'not-allowed' : 'pointer',
                marginTop: '4px'
              }}
            >
              {contracts.length === 0 ? (
                <option value="">No Active Contracts</option>
              ) : (
                contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerName || c.account || c.customer || 'Client'} ({c.id.substring(0, 8)})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-60)', fontWeight: 600 }}>Monthly Recurring (MRR)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--viridian-600)', fontFamily: 'SF Mono, monospace' }}>
              ₹{mrr.toFixed(2)} / mo
            </div>
          </div>

          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--line)', paddingLeft: '24px' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-60)', fontWeight: 600 }}>Annual Run Rate (ARR)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--burnham)', fontFamily: 'SF Mono, monospace' }}>
              ₹{arr.toFixed(2)} / yr
            </div>
          </div>
        </div>
      </div>

      {!activeContract ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-60)', background: '#ffffff', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
          <Calendar size={42} style={{ color: 'var(--ink-40)', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--burnham)' }}>No Active Subscriptions</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-60)', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
            There are currently no active recurring subscription contracts. Subscriptions created from customer orders or accepted quotes will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="two-col" style={{ gap: '20px' }}>
          
          {/* Left Column: Order Lines & Subscriptions */}
          <div className="panel fade-target">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Contract Order Lines — {activeContract.customer}</h3>
              <span style={{ fontSize: '11.5px', color: 'var(--viridian-600)', background: 'rgba(67, 138, 126, 0.1)', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                {activeContract.status}
              </span>
            </div>

            <div className="panel-body">
              
              {/* One-time Hardware / Services */}
              <div style={{ padding: '10px 18px 4px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-60)', fontWeight: 700 }}>
                One-Time Line Items
              </div>

              {activeContract.oneTimeItems && activeContract.oneTimeItems.length > 0 ? (
                activeContract.oneTimeItems.map((item, idx) => (
                  <div key={idx} className="bill-line">
                    <span>{item.name} ×{item.qty}</span>
                    <span className="tnum">₹{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '8px 18px', fontSize: '12px', color: 'var(--ink-40)' }}>No one-time line items.</div>
              )}

              {/* Recurring Subscriptions */}
              <div style={{ padding: '14px 18px 4px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-60)', fontWeight: 700 }}>
                Recurring Subscriptions
              </div>

              {activeContract.recurringItems && activeContract.recurringItems.length > 0 ? (
                activeContract.recurringItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: item.status === 'CANCELLED' ? 'var(--ink-40)' : 'var(--burnham)', textDecoration: item.status === 'CANCELLED' ? 'line-through' : 'none' }}>
                        {item.name} — {item.interval}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>
                        Quantity: <strong>{item.qty} seat{item.qty > 1 ? 's' : ''}</strong> @ ₹{item.unitPrice.toFixed(2)} / seat
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="tnum" style={{ fontWeight: 700, fontSize: '13.5px', color: item.status === 'CANCELLED' ? 'var(--ink-40)' : 'var(--burnham)' }}>
                        ₹{(item.unitPrice * item.qty).toFixed(2)} / mo
                      </span>

                      {item.status === 'ACTIVE' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item)}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            title="Modify seats with auto-proration"
                          >
                            Seats
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelLine(item.id, item.name)}
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            title="Cancel subscription line"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '8px 18px', fontSize: '12px', color: 'var(--ink-40)' }}>No recurring subscription items.</div>
              )}
            </div>

            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-60)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--viridian-600)" />
              <span>Mid-cycle seat expansions are prorated to the next billing date automatically.</span>
            </div>
          </div>

          {/* Right Column: Upcoming Billing Schedule & Proration Modal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Billing Schedule Card */}
            <div className="panel fade-target">
              <div className="panel-header">
                <h3>Upcoming Billing Schedule — {activeContract.customer}</h3>
              </div>
              
              <div className="timeline">
                {upcomingSchedule.map((sched, idx) => (
                  <div key={idx} className="tl-item">
                    <div className="date">{sched.date}</div>
                    <div className="amt tnum">{sched.amount}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', fontSize: '12px', color: 'var(--ink-60)' }}>
                Next invoice target: <strong>{upcomingSchedule[0]?.date}</strong> for total amount of <strong>{upcomingSchedule[0]?.amount}</strong>.
              </div>
            </div>

            {/* Seat Modification Drawer / Card */}
            {editingItem && (
              <div className="panel fade-target" style={{ background: 'var(--paper-2)', padding: '18px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: 'var(--burnham)' }}>
                  Modify Seats for {editingItem.name}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--ink-60)', marginBottom: '12px' }}>
                  Current: <strong>{editingItem.qty} seats</strong> @ ₹{editingItem.unitPrice}/mo                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>New Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newQty}
                    onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: '70px',
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid var(--line)',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSaveQtyChange}
                    className="btn btn-dark"
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    Save & Apply Proration
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="btn btn-ghost"
                    style={{ fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
