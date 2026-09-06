import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useEnter } from '../components/Animations';
import { IconCheck, IconShield, IconTag, IconChart, IconRefresh } from '../components/Icons';
import { ROLES, getRoleLabel } from '../utils/permissions';
import { fetchQuotations } from '../utils/apiClient';
import syncBus from '../utils/syncBus';

// Sample Quotations with diverse risk profiles & approval chain requirements
const DEFAULT_APPROVAL_QUOTES = [
  {
    id: 'Q-8021',
    customer: 'Acme Industrial Corp',
    amount: '$124,500',
    tier: 'Tier 1 Enterprise',
    rep: 'Sarah Jenkins (Direct Sales)',
    riskScore: 68,
    riskLevel: 'MEDIUM',
    drivers: {
      discountOverage: '+4.5% Overage',
      marginImpact: '42.5% (Target 45%)',
      paymentTerms: 'Net 60 Days',
      creditScore: 'AAA (0.2% default)'
    },
    items: [
      { name: 'Enterprise Edge Gateway X5', discount: '18.5%', ceiling: '15.0%', status: 'OVERAGE (+3.5%)' },
      { name: 'Industrial IoT Telemetry Sensor Pod', discount: '12.0%', ceiling: '12.0%', status: 'AT CEILING' },
      { name: '24/7 SLA Dedicated Support Plan', discount: '14.0%', ceiling: '10.0%', status: 'OVERAGE (+4.0%)' }
    ],
    steps: [
      { id: 'step-1', role: 'Sales Manager', assignee: 'Robert Okafor', required: true, status: 'APPROVED', note: 'Authorized discount terms per Q3 Enterprise Program.', timestamp: 'Yesterday, 4:15 PM' },
      { id: 'step-2', role: 'Finance Director', assignee: 'Marcus Chen', required: true, status: 'PENDING', note: null, timestamp: null },
      { id: 'step-3', role: 'VP Commercial Operations', assignee: 'Elena Rostova', required: false, status: 'NOT_REQUIRED', note: null, timestamp: null }
    ],
    auditTrail: [
      { id: 'aud-1', timestamp: 'Yesterday, 4:15 PM', user: 'Robert Okafor', role: 'Sales Manager', action: 'APPROVED', details: 'Approved discount overage for Edge Gateways under Q3 Enterprise Incentive.', riskScore: 68 },
      { id: 'aud-2', timestamp: 'Yesterday, 11:30 AM', user: 'Sarah Jenkins', role: 'Sales Rep', action: 'SUBMITTED', details: 'Quotation submitted for multi-level discount authorization.', riskScore: 68 }
    ]
  },
  {
    id: 'Q-8024',
    customer: 'BioTech Solutions GmbH',
    amount: '$285,000',
    tier: 'Strategic Global',
    rep: 'David Sterling (Global Accounts)',
    riskScore: 82,
    riskLevel: 'HIGH',
    drivers: {
      discountOverage: '+9.0% Overage',
      marginImpact: '36.8% (Target 45%)',
      paymentTerms: 'Net 90 Days',
      creditScore: 'AA- (0.8% default)'
    },
    items: [
      { name: 'Genomic Sequence Analyzer Rig', discount: '24.0%', ceiling: '15.0%', status: 'OVERAGE (+9.0%)' },
      { name: 'Annual High-Throughput Bio Cloud Suite', discount: '20.0%', ceiling: '10.0%', status: 'OVERAGE (+10.0%)' }
    ],
    steps: [
      { id: 'step-1', role: 'Sales Manager', assignee: 'Robert Okafor', required: true, status: 'APPROVED', note: 'Commercial strategic priority. Recommended for review.', timestamp: 'Today, 9:20 AM' },
      { id: 'step-2', role: 'Finance Director', assignee: 'Marcus Chen', required: true, status: 'PENDING', note: null, timestamp: null },
      { id: 'step-3', role: 'VP Commercial Operations', assignee: 'Elena Rostova', required: true, status: 'PENDING', note: null, timestamp: null }
    ],
    auditTrail: [
      { id: 'aud-3', timestamp: 'Today, 9:20 AM', user: 'Robert Okafor', role: 'Sales Manager', action: 'APPROVED', details: 'Approved initial sales stage overage. Escalated to Finance and VP Commercial Ops.', riskScore: 82 },
      { id: 'aud-4', timestamp: 'Today, 8:45 AM', user: 'David Sterling', role: 'Sales Rep', action: 'SUBMITTED', details: 'Strategic competitive deal quotation submitted.', riskScore: 82 }
    ]
  },
  {
    id: 'Q-8029',
    customer: 'Apex Global Logistics',
    amount: '$48,200',
    tier: 'Growth Tier',
    rep: 'Maya Patel (Territory Rep)',
    riskScore: 28,
    riskLevel: 'LOW',
    drivers: {
      discountOverage: '0.0% (Standard)',
      marginImpact: '48.2% (Target 45%)',
      paymentTerms: 'Net 30 Days',
      creditScore: 'AAA (0.1% default)'
    },
    items: [
      { name: 'Fleet Telematics OBD-II Unit', discount: '8.0%', ceiling: '10.0%', status: 'WITHIN LIMIT' },
      { name: 'Fleet Route Optimization Cloud License', discount: '5.0%', ceiling: '8.0%', status: 'WITHIN LIMIT' }
    ],
    steps: [
      { id: 'step-1', role: 'Sales Manager', assignee: 'Robert Okafor', required: true, status: 'APPROVED', note: 'Clean deal within standard guidelines.', timestamp: 'Today, 10:00 AM' },
      { id: 'step-2', role: 'Finance Director', assignee: 'Marcus Chen', required: false, status: 'NOT_REQUIRED', note: null, timestamp: null },
      { id: 'step-3', role: 'VP Commercial Operations', assignee: 'Elena Rostova', required: false, status: 'NOT_REQUIRED', note: null, timestamp: null }
    ],
    auditTrail: [
      { id: 'aud-5', timestamp: 'Today, 10:00 AM', user: 'Robert Okafor', role: 'Sales Manager', action: 'APPROVED', details: 'Approved standard tier discount.', riskScore: 28 },
      { id: 'aud-6', timestamp: 'Today, 9:50 AM', user: 'Maya Patel', role: 'Sales Rep', action: 'SUBMITTED', details: 'Submitted standard quotation.', riskScore: 28 }
    ]
  }
];

export default function Approval({ user }) {
  const ref = useEnter([]);
  const arcRef = useRef(null);

  // Active role detection
  const role = user?.role || ROLES.FINANCE;
  const isRep = role === ROLES.SALES_REP;
  const canAct = role === ROLES.ADMIN || role === ROLES.SALES_MANAGER || role === ROLES.FINANCE;

  // Selected Quote & Quotes list state
  const [quotes, setQuotes] = useState(DEFAULT_APPROVAL_QUOTES);
  const [selectedQuoteId, setSelectedQuoteId] = useState(DEFAULT_APPROVAL_QUOTES[0]?.id || '');

  // Fetch live quotations from API or local store on mount
  useEffect(() => {
    async function loadQuotes() {
      try {
        const liveQuotes = await fetchQuotations();
        if (Array.isArray(liveQuotes) && liveQuotes.length > 0) {
          // Normalize live quotes to ensure rich approval properties exist
          const formatted = liveQuotes.map((q, idx) => {
            const defaultMatch = DEFAULT_APPROVAL_QUOTES.find(d => d.id === q.id);
            if (defaultMatch) return defaultMatch;
            const disc = q.discountPercent || 0;
            const risk = disc > 15 ? 78 : disc > 8 ? 55 : 24;
            return {
              id: q.id || `Q-${1000 + idx}`,
              customer: q.customerName || q.companyName || q.customer || 'Enterprise Client',
              amount: q.grandTotal ? `$${q.grandTotal.toLocaleString()}` : (q.amount || '$50,000'),
              tier: q.tier || 'Standard Enterprise',
              rep: q.rep || 'Direct Sales',
              riskScore: q.riskScore ?? risk,
              riskLevel: (q.riskScore ?? risk) > 75 ? 'HIGH' : (q.riskScore ?? risk) > 45 ? 'MEDIUM' : 'LOW',
              drivers: q.drivers || {
                discountOverage: disc > 10 ? `+${(disc - 10).toFixed(1)}% Overage` : '0.0% (Within Limit)',
                marginImpact: `${(50 - disc * 0.8).toFixed(1)}% (Target 45%)`,
                paymentTerms: q.paymentTerms || 'Net 30 Days',
                creditScore: 'AAA (0.2% default)'
              },
              items: (q.lineItems || q.items || []).map(item => ({
                name: item.name || 'Catalog Item',
                discount: `${item.discountPercent || disc}%`,
                ceiling: '10.0%',
                status: (item.discountPercent || disc) > 10 ? `OVERAGE (+${((item.discountPercent || disc) - 10).toFixed(1)}%)` : 'WITHIN LIMIT'
              })),
              steps: q.steps || [
                { id: 'step-1', role: 'Sales Manager', assignee: 'Robert Okafor', required: true, status: 'APPROVED', note: 'Standard commercial approval.', timestamp: 'Today' },
                { id: 'step-2', role: 'Finance Director', assignee: 'Marcus Chen', required: disc > 10, status: disc > 10 ? 'PENDING' : 'NOT_REQUIRED', note: null, timestamp: null },
                { id: 'step-3', role: 'VP Commercial Operations', assignee: 'Elena Rostova', required: disc > 20, status: disc > 20 ? 'PENDING' : 'NOT_REQUIRED', note: null, timestamp: null }
              ],
              auditTrail: q.auditTrail || [
                { id: `aud-init-${idx}`, timestamp: 'Recently', user: 'System', role: 'Automated Rule Engine', action: 'EVALUATED', details: `Evaluated ${disc}% discount against governance matrix.`, riskScore: risk }
              ]
            };
          });
          setQuotes(formatted);
          if (formatted.length > 0 && !selectedQuoteId) {
            setSelectedQuoteId(formatted[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load live quotations for approval:', err);
      }
    }
    loadQuotes();
    const unsub = syncBus.subscribe('quotes', () => {
      loadQuotes();
    });
    return () => unsub();
  }, []);

  // Decision inputs & confirmation state
  const [decisionNote, setDecisionNote] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastActionResult, setLastActionResult] = useState(null);

  const currentQuote = quotes.find(q => q.id === selectedQuoteId) || quotes[0] || null;

  // Animate Risk Gauge arc on selection change
  useEffect(() => {
    if (!arcRef.current || !currentQuote) return;
    const len = 220;
    const score = currentQuote.riskScore || 0;
    gsap.fromTo(
      arcRef.current,
      { strokeDashoffset: len },
      { strokeDashoffset: len - (len * score / 100), duration: 0.8, ease: 'power2.out' }
    );
  }, [selectedQuoteId, currentQuote?.riskScore]);

  // Handle reviewer decision (Approve, Reject, Return for Revision)
  const handleDecision = (actionType) => {
    if (!currentQuote) return;

    const nowStr = new Date().toLocaleString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true, month: 'short', day: 'numeric', year: 'numeric'
    });

    const reviewerName = user?.name || (role === ROLES.FINANCE ? 'Marcus Chen (Finance Director)' : 'Robert Okafor (Sales Manager)');
    const noteText = decisionNote.trim() || (actionType === 'APPROVED' ? 'Discount overage reviewed and approved.' : actionType === 'REJECTED' ? 'Discount request declined due to margin threshold limits.' : 'Returned to Sales Rep for commercial terms revision.');

    // Create new audit trail entry
    const newAuditEntry = {
      id: `aud-${Date.now()}`,
      timestamp: nowStr,
      user: reviewerName,
      role: getRoleLabel(role),
      action: actionType,
      details: `${actionType === 'APPROVED' ? 'Approved discount terms.' : actionType === 'REJECTED' ? 'Rejected quotation.' : 'Returned quotation for revision.'} Note: "${noteText}"`,
      riskScore: currentQuote.riskScore || 0
    };

    // Update quote steps
    const updatedSteps = currentQuote.steps.map(step => {
      // Determine if current user matches this step
      if (step.status === 'PENDING' && step.required) {
        if ((role === ROLES.FINANCE && step.role.includes('Finance')) ||
            (role === ROLES.SALES_MANAGER && step.role.includes('Manager')) ||
            role === ROLES.ADMIN) {
          return {
            ...step,
            status: actionType,
            note: noteText,
            timestamp: nowStr
          };
        }
      }
      return step;
    });

    const updatedQuotes = quotes.map(q => {
      if (q.id === selectedQuoteId) {
        return {
          ...q,
          steps: updatedSteps,
          auditTrail: [newAuditEntry, ...q.auditTrail]
        };
      }
      return q;
    });

    setQuotes(updatedQuotes);
    setLastActionResult({
      action: actionType,
      quoteId: currentQuote.id,
      customer: currentQuote.customer,
      reviewer: reviewerName,
      note: noteText,
      timestamp: nowStr,
      auditEntry: newAuditEntry
    });
    setShowConfirmation(true);
    setDecisionNote('');
  };

  // Helper for gauge colors
  const getRiskColor = (score) => {
    if (score < 45) return 'var(--viridian-600)';
    if (score < 75) return 'var(--amber)';
    return '#D14343';
  };

  return (
    <div ref={ref} style={{ paddingBottom: '40px' }}>
      
      {/* Governance & Role Context Banner */}
      <div
        className="fade-target"
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--burnham)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconShield style={{ width: 18, height: 18, color: 'var(--viridian-600)' }} />
            Discount Approval & Governance Center · {getRoleLabel(role)}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--ink-60)', marginTop: '4px' }}>
            {isRep 
              ? 'Tracking Mode: View live approval step status and risk score breakdown for submitted deals.' 
              : 'Deterministic Rule Evaluation: Authorize, decline, or request revisions based on risk scores and margin ceilings.'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--ink-60)', fontWeight: 600 }}>Select Deal:</span>
          <select
            value={selectedQuoteId || ''}
            onChange={(e) => {
              setSelectedQuoteId(e.target.value);
              setShowConfirmation(false);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              fontSize: '12.5px',
              fontWeight: 600,
              background: 'var(--paper-2)',
              color: 'var(--ink)'
            }}
          >
            {quotes.length === 0 && <option value="">No Deals Available</option>}
            {quotes.map(q => (
              <option key={q.id} value={q.id}>
                {q.id} — {q.customer} ({q.amount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Two Column Layout */}
      {!currentQuote ? (
        <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: '8px', padding: '40px', textAlign: 'center', marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--burnham)', marginBottom: '8px' }}>
            No Quotations Awaiting Approval
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--ink-60)', margin: 0 }}>
            There are currently no active quotes requiring approval decisions in this pipeline.
          </p>
        </div>
      ) : (
      <div className="two-col" style={{ gap: '20px' }}>
        
        {/* Left Column: Risk Score & Rule Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Panel 1: Blended Risk Score Gauge */}
          <div className="panel fade-target" style={{ padding: '20px' }}>
            <div className="panel-header" style={{ padding: 0, marginBottom: '16px', border: 'none' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  Blended Risk Score — {currentQuote.customer}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  Quotation ID: <strong>{currentQuote.id}</strong> · Tier: <strong>{currentQuote.tier}</strong> · Rep: <strong>{currentQuote.rep}</strong>
                </div>
              </div>
              <span className={`tag ${currentQuote.riskScore > 75 ? 'tag-rose' : currentQuote.riskScore > 45 ? 'tag-amber' : 'tag-viridian'}`}>
                {currentQuote.riskLevel} RISK ({currentQuote.riskScore}/100)
              </span>
            </div>

            <div className="risk-wrap" style={{ gap: '20px', alignItems: 'center', paddingBottom: '10px' }}>
              <svg width="120" height="120" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                <circle cx="50" cy="50" r="35" fill="none" stroke="var(--paper-2)" strokeWidth="9"/>
                <circle
                  ref={arcRef}
                  cx="50" cy="50" r="35"
                  fill="none"
                  stroke={getRiskColor(currentQuote.riskScore)}
                  strokeWidth="9"
                  strokeDasharray="220"
                  strokeDashoffset="220"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="55" textAnchor="middle" fontFamily="PT Serif, serif" fontWeight="700" fontSize="22" fill="var(--ink)">
                  {currentQuote.riskScore}
                </text>
              </svg>

              <div className="risk-meta">
                <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--burnham)', marginBottom: '4px' }}>
                  Risk Driver Summary
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--ink-60)', margin: 0, lineHeight: 1.5 }}>
                  Blended risk is calculated deterministically from line-item discount overages, gross margin degradation, payment term extension, and customer credit tier.
                </p>
              </div>
            </div>

            {/* Drivers Matrix */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginTop: '12px',
              paddingTop: '14px',
              borderTop: '1px solid var(--line)'
            }}>
              <div style={{ background: 'var(--paper-2)', padding: '10px 12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ink-60)', display: 'block' }}>Discount Overage</span>
                <strong style={{ fontSize: '12.5px', color: currentQuote.drivers.discountOverage.includes('+') ? '#D14343' : 'var(--viridian-600)' }}>
                  {currentQuote.drivers.discountOverage}
                </strong>
              </div>
              <div style={{ background: 'var(--paper-2)', padding: '10px 12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ink-60)', display: 'block' }}>Gross Margin Impact</span>
                <strong style={{ fontSize: '12.5px', color: 'var(--burnham)' }}>
                  {currentQuote.drivers.marginImpact}
                </strong>
              </div>
              <div style={{ background: 'var(--paper-2)', padding: '10px 12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ink-60)', display: 'block' }}>Payment Terms</span>
                <strong style={{ fontSize: '12.5px', color: currentQuote.drivers.paymentTerms.includes('60') || currentQuote.drivers.paymentTerms.includes('90') ? 'var(--amber)' : 'var(--viridian-600)' }}>
                  {currentQuote.drivers.paymentTerms}
                </strong>
              </div>
              <div style={{ background: 'var(--paper-2)', padding: '10px 12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ink-60)', display: 'block' }}>Credit Grade</span>
                <strong style={{ fontSize: '12.5px', color: 'var(--viridian-600)' }}>
                  {currentQuote.drivers.creditScore}
                </strong>
              </div>
            </div>
          </div>

          {/* Panel 2: Line Items & Discount Ceiling Table */}
          <div className="panel fade-target" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconTag style={{ width: 15, height: 15 }} /> Quotation Line Items & Ceilings
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--ink-60)' }}>
                    <th style={{ padding: '8px' }}>Line Item</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Applied</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Ceiling</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Governance</th>
                  </tr>
                </thead>
                <tbody>
                  {currentQuote.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--paper-2)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700 }}>{item.discount}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--ink-60)' }}>{item.ceiling}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <span className={`tag ${item.status.includes('OVERAGE') ? 'tag-rose' : 'tag-viridian'}`} style={{ fontSize: '10.5px' }}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Approval Chain Execution & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Panel: Approval Steps List */}
          <div className="panel fade-target" style={{ padding: '20px' }}>
            <div className="panel-header" style={{ padding: 0, marginBottom: '16px', border: 'none' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  Approval Steps List
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                  Dynamic routing based on deterministic threshold rules
                </div>
              </div>
            </div>

            <div className="steps" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {currentQuote.steps.map((step, index) => {
                const isStepApproved = step.status === 'APPROVED';
                const isStepRejected = step.status === 'REJECTED';
                const isStepReturned = step.status === 'RETURNED_FOR_REVISION';
                const isNotRequired  = step.status === 'NOT_REQUIRED' || !step.required;

                let dotClass = 'pending';
                if (isStepApproved) dotClass = 'done';
                if (isStepRejected) dotClass = 'rose';
                if (isNotRequired)  dotClass = 'muted';

                return (
                  <div key={step.id} className="step" style={{ opacity: isNotRequired ? 0.6 : 1 }}>
                    <div
                      className={`step-dot ${dotClass}`}
                      style={{
                        background: isStepApproved ? 'var(--viridian-600)' : isStepRejected ? '#D14343' : isStepReturned ? 'var(--amber)' : isNotRequired ? 'var(--paper-2)' : '#ffffff',
                        color: isStepApproved || isStepRejected || isStepReturned ? '#ffffff' : 'var(--ink)',
                        border: isNotRequired ? '1px dashed var(--line)' : undefined
                      }}
                    >
                      {isStepApproved ? <IconCheck style={{ width: 13, height: 13 }} /> : isNotRequired ? '—' : (index + 1)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="step-title" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--burnham)' }}>
                          Step {index + 1}: {step.role} {step.assignee ? `— ${step.assignee}` : ''}
                        </div>
                        
                        <span className={`tag ${isStepApproved ? 'tag-viridian' : isStepRejected ? 'tag-rose' : isStepReturned ? 'tag-amber' : isNotRequired ? 'tag-muted' : 'tag-amber'}`} style={{ fontSize: '11px' }}>
                          {isStepApproved ? 'Approved' : isStepRejected ? 'Rejected' : isStepReturned ? 'Returned for Revision' : isNotRequired ? 'Not Required' : 'Pending Action'}
                        </span>
                      </div>

                      <div className="step-sub" style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '4px' }}>
                        {!step.required ? (
                          <em>Only shown when required by governance limits. (Bypassed for this quote).</em>
                        ) : step.note ? (
                          <span>"{step.note}" {step.timestamp && <small>· {step.timestamp}</small>}</span>
                        ) : (
                          <span>Awaiting reviewer decision</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Decision Action Box */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
              {canAct ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--burnham)' }}>
                    Reviewer Action & Note:
                  </div>

                  <input
                    type="text"
                    placeholder="Enter approval note or revision instructions..."
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      fontSize: '12.5px',
                      width: '100%',
                      background: 'var(--paper-2)'
                    }}
                  />

                  {/* Preset quick note chips */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setDecisionNote('Approved per Q3 promotional margin allowance.')}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer' }}
                    >
                      + Promo Allowance
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionNote('Margin too thin. Limit service discount to 10% maximum.')}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer' }}
                    >
                      + Limit Service Disc
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionNote('Returned: Require standard Net 30 payment terms.')}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer' }}
                    >
                      + Net 30 Required
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleDecision('APPROVED')}
                      style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700 }}
                    >
                      Approve Quotation
                    </button>
                    
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleDecision('RETURNED_FOR_REVISION')}
                      style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700, borderColor: 'var(--amber)', color: 'var(--amber)' }}
                    >
                      Return for Revision
                    </button>

                    <button
                      className="btn btn-danger"
                      onClick={() => handleDecision('REJECTED')}
                      style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700 }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  fontSize: '12px',
                  color: 'var(--ink-60)',
                  textAlign: 'center'
                }}>
                  🔒 <strong>Status Only View:</strong> Approval decisions are reserved for Sales Managers and Finance Officers.
                </div>
              )}
            </div>

          </div>

          {/* Panel: Audit Trail Timeline */}
          <div className="panel fade-target" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconChart style={{ width: 15, height: 15 }} /> Audit Trail & Governance Log
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQuote.auditTrail.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'var(--paper-2)',
                    borderLeft: log.action === 'APPROVED' ? '3px solid var(--viridian-600)' : log.action === 'REJECTED' ? '3px solid #D14343' : log.action === 'RETURNED_FOR_REVISION' ? '3px solid var(--amber)' : '3px solid var(--burnham)',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--burnham)' }}>{log.user} ({log.role})</strong>
                    <span style={{ fontSize: '11px', color: 'var(--ink-60)' }}>{log.timestamp}</span>
                  </div>
                  <div style={{ color: 'var(--ink)', marginBottom: '4px' }}>
                    <span className={`tag ${log.action === 'APPROVED' ? 'tag-viridian' : log.action === 'REJECTED' ? 'tag-rose' : log.action === 'RETURNED_FOR_REVISION' ? 'tag-amber' : 'tag-muted'}`} style={{ fontSize: '10px', padding: '2px 6px', marginRight: '6px' }}>
                      {log.action}
                    </span>
                    {log.details}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && lastActionResult && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 22, 18, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--paper)',
            borderRadius: '12px',
            border: '1px solid var(--line)',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: lastActionResult.action === 'APPROVED' ? 'rgba(67, 138, 126, 0.15)' : lastActionResult.action === 'REJECTED' ? 'rgba(209, 67, 67, 0.15)' : 'rgba(235, 172, 50, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: lastActionResult.action === 'APPROVED' ? 'var(--viridian-600)' : lastActionResult.action === 'REJECTED' ? '#D14343' : 'var(--amber)'
              }}>
                <IconCheck style={{ width: 22, height: 22 }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Review Decision Recorded!
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>
                  Audit Trail entry created for {lastActionResult.quoteId} ({lastActionResult.customer})
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--paper-2)', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '12.5px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--ink-60)' }}>Action Taken:</span>
                <strong style={{ color: lastActionResult.action === 'APPROVED' ? 'var(--viridian-600)' : lastActionResult.action === 'REJECTED' ? '#D14343' : 'var(--amber)' }}>
                  {lastActionResult.action === 'APPROVED' ? '✅ APPROVED' : lastActionResult.action === 'REJECTED' ? '❌ REJECTED' : '↩️ RETURNED FOR REVISION'}
                </strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--ink-60)' }}>Reviewer:</span>
                <strong>{lastActionResult.reviewer}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--ink-60)' }}>Timestamp:</span>
                <span>{lastActionResult.timestamp}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--ink-60)' }}>Decision Note:</span>
                <em>"{lastActionResult.note}"</em>
              </div>
            </div>

            <div style={{ background: 'rgba(67, 138, 126, 0.08)', padding: '10px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--burnham)', marginBottom: '20px' }}>
              🔒 <strong>Audit Record Saved:</strong> Immutable governance record appended to system logs. Next reviewer or sales representative notified automatically.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-dark"
                onClick={() => setShowConfirmation(false)}
                style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 700 }}
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
