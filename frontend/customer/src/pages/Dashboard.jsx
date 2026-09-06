import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroCanvas } from '../components/HeroCanvas';
import { CountUp, useEnter } from '../components/Animations';
import { IconChart, IconCheck, IconTruck, IconBox, IconRefresh, IconUsers, IconCart } from '../components/Icons';
import { ROLES, ROLE_LABELS } from '../utils/permissions';
import { 
  getDashboardOverview, 
  fetchQuotations, 
  fetchApprovalRequests, 
  fetchWarehouses, 
  fetchSubscriptions 
} from '../utils/apiClient';

export default function Dashboard({ user, onRoleSwitch }) {
  const ref = useEnter([]);
  const navigate = useNavigate();
  const role = user?.role || ROLES.ADMIN;

  const [deals, setDeals] = useState([]);
  const [overviewMetrics, setOverviewMetrics] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      const [overview, quotes, whData, subData] = await Promise.all([
        getDashboardOverview(),
        fetchQuotations(),
        fetchWarehouses(),
        fetchSubscriptions(),
      ]);

      if (isMounted) {
        if (overview) setOverviewMetrics(overview);
        if (whData && Array.isArray(whData)) setWarehouses(whData);
        if (subData && Array.isArray(subData)) setSubscriptions(subData);

        if (quotes && Array.isArray(quotes)) {
          setDeals(
            quotes.map((q) => {
              const grandTotalNum =
                typeof q.grand_total === 'number'
                  ? q.grand_total
                  : typeof q.grandTotal === 'number'
                  ? q.grandTotal
                  : typeof q.total_amount === 'number'
                  ? q.total_amount
                  : typeof q.totalAmount === 'number'
                  ? q.totalAmount
                  : parseFloat((q.amt || '').replace(/[^0-9.-]+/g, '')) || 0;

              return {
                id: q.id,
                cust: q.customer_name || q.customerName || q.company_name || q.companyName || q.cust || 'Client',
                amt: `₹${Math.round(grandTotalNum).toLocaleString('en-IN')}`,
                rawAmount: grandTotalNum,
                stage: q.status || q.stage || 'Draft',
                rep: q.sales_rep || q.salesRep || q.rep || 'Sales Rep',
                items: Array.isArray(q.items) ? q.items.length : Array.isArray(q.lineItems) ? q.lineItems.length : 1,
                date: q.submitted_at || q.submittedAt || q.date || 'Recent',
                riskScore: q.risk_score || q.riskScore || 0,
              };
            })
          );
        }
      }
    }
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute metrics dynamically from live state
  const computedMetrics = useMemo(() => {
    let pipelineSum = 0;
    let pendingSum = 0;
    let pendingCount = 0;
    let draftCount = 0;
    let fulfillmentCount = 0;
    let stalledCount = 0;

    deals.forEach((d) => {
      const val = d.rawAmount || parseFloat((d.amt || '').replace(/[^0-9.-]+/g, '')) || 0;
      pipelineSum += val;

      const stageUpper = (d.stage || '').toUpperCase();
      if (stageUpper.includes('PENDING')) {
        pendingSum += val;
        pendingCount += 1;
      } else if (stageUpper.includes('DRAFT')) {
        draftCount += 1;
      } else if (stageUpper.includes('FULFILL')) {
        fulfillmentCount += 1;
      }

      if (d.riskScore > 60 || stageUpper.includes('STALLED')) {
        stalledCount += 1;
      }
    });

    return {
      openPipelineValue:
        overviewMetrics?.kpis?.pipelineValue ??
        overviewMetrics?.kpis?.pipeline_value ??
        overviewMetrics?.open_pipeline_value ??
        pipelineSum,
      stalledDealsCount:
        overviewMetrics?.kpis?.stalledDealsCount ??
        overviewMetrics?.kpis?.stalled_deals_count ??
        overviewMetrics?.stalled_deals_count ??
        stalledCount,
      discountAnomaliesCount:
        overviewMetrics?.discount_anomalies_count ?? overviewMetrics?.kpis?.discountAnomaliesCount ?? 0,
      avgApprovalTime:
        overviewMetrics?.avg_approval_time_hours ?? overviewMetrics?.kpis?.avgApprovalTime ?? 0,
      pendingApprovalsValue: pendingSum,
      pendingApprovalsCount: pendingCount,
      activeQuotesCount: deals.length,
      fulfillmentCount: fulfillmentCount,
      teamDealHealth: Math.max(70, Math.min(100, 100 - stalledCount * 5)),
      mrrValue: subscriptions.reduce(
        (sum, s) => sum + (parseFloat(s.mrr_amount ?? s.mrr ?? s.price) || 0),
        0
      ),
    };
  }, [deals, overviewMetrics, subscriptions]);

  const handleSelectQuotationCard = (deal) => {
    navigate('/builder', {
      state: {
        customer: deal.cust,
        amt: deal.amt,
        stage: deal.stage,
      },
    });
  };

  const pendingDeals = useMemo(
    () => deals.filter((d) => (d.stage || '').toUpperCase().includes('PENDING')),
    [deals]
  );

  return (
    <div ref={ref}>
      {/* Role Banner Indicator */}
      <div
        className="fade-target"
        style={{
          background: 'var(--burnham)',
          color: '#ffffff',
          borderRadius: 'var(--radius)',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0, 34, 28, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Internal Portal · {ROLE_LABELS[role] || 'Employee'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(220, 234, 230, 0.9)' }}>
            Welcome back, <strong>{user?.name || 'Team Member'}</strong>. UI adapted to your permissions.
          </div>
        </div>

        {/* Quick Role Toggle Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', color: 'rgba(220,234,230,0.7)' }}>Test Role:</span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { id: ROLES.ADMIN, label: 'Admin' },
              { id: ROLES.SALES_MANAGER, label: 'Manager' },
              { id: ROLES.SALES_REP, label: 'Rep' },
              { id: ROLES.FINANCE, label: 'Finance' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRoleSwitch && onRoleSwitch(r.id)}
                style={{
                  background: role === r.id ? 'var(--viridian)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Hero Header */}
      <div className="hero">
        <HeroCanvas />
        <div className="hero-copy fade-target">
          <div className="eyebrow">
            {role === ROLES.ADMIN && 'Platform Governance · Live'}
            {role === ROLES.SALES_REP && 'Sales Representative Workspace'}
            {role === ROLES.SALES_MANAGER && 'Managerial Oversight & Quotation Management'}
            {role === ROLES.FINANCE && 'Finance & Warehouse Operations'}
          </div>
          <h2>
            {role === ROLES.ADMIN && <>Every deal, watched<br />before it stalls.</>}
            {role === ROLES.SALES_REP && <>Close deals faster,<br />governed by smart rules.</>}
            {role === ROLES.SALES_MANAGER && <>Quotations & Approvals,<br />governed in one place.</>}
            {role === ROLES.FINANCE && <>Fulfill orders seamlessly,<br />manage cash & inventory.</>}
          </h2>
          <p>
            {role === ROLES.ADMIN && 'Anomalies, stalled quotes, and delivery slippage surface the moment they happen.'}
            {role === ROLES.SALES_REP && 'Create quotes, track approvals, and negotiate with live margin and discount checks.'}
            {role === ROLES.SALES_MANAGER && 'Select any active quotation card below to open the Quotation Builder for that deal.'}
            {role === ROLES.FINANCE && 'Authorize split shipments, manage warehouse allocation, backorders, and recurring billing.'}
          </p>
        </div>
        <div className="hero-stat fade-target">
          <div className="num">
            <CountUp value={computedMetrics.openPipelineValue} prefix="$" />
          </div>
          <div className="lbl">Open pipeline value</div>
        </div>
      </div>

      {/* Dynamic Role-Based Quick Banner */}
      <div
        className="fade-target"
        style={{
          background: 'linear-gradient(135deg, rgba(8, 32, 26, 0.04) 0%, rgba(67, 138, 126, 0.08) 100%)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'var(--burnham)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconChart style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--burnham)' }}>
              {role === ROLES.ADMIN && 'Sales Performance & Quotations Reporting'}
              {role === ROLES.SALES_REP && 'Quotation Builder & Negotiation Hub'}
              {role === ROLES.SALES_MANAGER && 'Quotations Management & Approval Chain'}
              {role === ROLES.FINANCE && 'Warehouse Fulfillment & Subscription Billing'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
              {role === ROLES.ADMIN && 'Analyze performance by Period, Rep attribution, Approval status, or Product discount schedules.'}
              {role === ROLES.SALES_REP && 'Draft quotes, apply allowable discounts, and respond to customer counters.'}
              {role === ROLES.SALES_MANAGER && 'Click on any quotation card below to launch the Quotation Builder for that deal.'}
              {role === ROLES.FINANCE && 'Track stock availability across warehouses, manage split shipments, backorders, and MRR.'}
            </div>
          </div>
        </div>

        <Link
          to={
            role === ROLES.ADMIN ? '/reports' :
            role === ROLES.SALES_REP ? '/builder' :
            role === ROLES.SALES_MANAGER ? '/builder' : '/fulfillment'
          }
          className="btn btn-dark"
          style={{ padding: '8px 16px', fontSize: '12.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          {role === ROLES.ADMIN && 'View Full Reports →'}
          {role === ROLES.SALES_REP && 'Quotation Builder / Pipeline →'}
          {role === ROLES.SALES_MANAGER && 'Quotation Builder / Pipeline →'}
          {role === ROLES.FINANCE && 'Manage Warehouse Stock →'}
        </Link>
      </div>

      {/* SELECTABLE QUOTATION CARDS SECTION */}
      <div style={{ marginBottom: '28px' }} className="fade-target">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', color: 'var(--burnham)', fontWeight: 700, margin: 0 }}>
              Active Quotations Portfolio
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-60)', margin: '2px 0 0 0' }}>
              Select any quotation card below to open it directly in the <strong>Quotation Builder</strong>.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/builder')}
            style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <IconCart style={{ width: 14, height: 14 }} /> + Create New Quote
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {deals.map((deal) => {
            const isDraft = deal.stage === 'Draft';
            const isPending = deal.stage === 'Pending Approval' || deal.stage === 'Pending Review';
            const isApproved = deal.stage === 'Approved';
            const isFulfillment = deal.stage === 'Fulfillment';

            const badgeClass =
              isDraft ? 'tag-viridian' :
              isPending ? 'tag-amber' :
              isApproved ? 'tag-green' :
              isFulfillment ? 'tag-blue' : 'tag-rose';

            return (
              <div
                key={deal.id}
                onClick={() => handleSelectQuotationCard(deal)}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(8, 32, 26, 0.1)';
                  e.currentTarget.style.borderColor = 'var(--viridian)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                  e.currentTarget.style.borderColor = 'var(--line)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--burnham)' }}>
                      {deal.cust}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                      Rep: {deal.rep} · {deal.items} line items
                    </div>
                  </div>
                  <span className={`tag ${badgeClass}`} style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {deal.stage}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: '10px', marginTop: '4px' }}>
                  <div>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-60)', fontWeight: 600 }}>
                      Quote Amount
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--burnham)', fontFamily: 'var(--serif)' }}>
                      {deal.amt}
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--viridian-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Open Builder →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ROLE 1: ADMIN DASHBOARD */}
      {role === ROLES.ADMIN && (
        <>
          <div className="grid-4">
            <div className="stat-card fade-target">
              <div className="lbl">Open pipeline</div>
              <div className="val">
                <CountUp value={computedMetrics.openPipelineValue} prefix="$" />
              </div>
              <div className="delta delta-up">↑ 6.2% vs last week</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Stalled deals</div>
              <div className="val">
                <CountUp value={computedMetrics.stalledDealsCount} />
              </div>
              <div className="delta delta-down">{computedMetrics.stalledDealsCount} active flags</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Discount anomalies</div>
              <div className="val">
                <CountUp value={computedMetrics.discountAnomaliesCount} />
              </div>
              <div className="delta delta-down">High risk discount alerts</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Avg. approval time</div>
              <div className="val">
                <CountUp value={computedMetrics.avgApprovalTime} decimals={1} />
                <span style={{ fontSize: 15 }}> hrs</span>
              </div>
              <div className="delta delta-up">↓ 1.1 hrs vs target</div>
            </div>
          </div>

          <div className="two-col">
            <div className="panel fade-target">
              <div className="panel-header">
                <h3>Stalled deals</h3>
                <span className="tag tag-amber">{computedMetrics.stalledDealsCount} active</span>
              </div>
              <div className="panel-body">
                {deals.filter(d => d.riskScore > 60 || (d.stage || '').toUpperCase().includes('STALLED')).length > 0 ? (
                  deals.filter(d => d.riskScore > 60 || (d.stage || '').toUpperCase().includes('STALLED')).map((d) => (
                    <div className="row" key={d.id}>
                      <div>
                        <div className="row-title">{d.cust}</div>
                        <div className="row-sub">{d.rep} · Risk Score: {d.riskScore}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="row-title">{d.amt}</div>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11.5 }}>Nudge rep →</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', fontSize: '12.5px', color: 'var(--ink-60)', textAlign: 'center' }}>
                    No stalled deals detected.
                  </div>
                )}
              </div>
            </div>

            <div className="panel fade-target">
              <div className="panel-header">
                <h3>Discount anomalies</h3>
                <span className="tag tag-rose">{computedMetrics.discountAnomaliesCount} flagged</span>
              </div>
              <div className="panel-body">
                {deals.filter(d => d.riskScore > 50).length > 0 ? (
                  deals.filter(d => d.riskScore > 50).map((a) => (
                    <div className="row" key={a.id}>
                      <div>
                        <div className="row-title">{a.cust}</div>
                        <div className="row-sub">Risk Score: {a.riskScore} · {a.amt}</div>
                      </div>
                      <span className={'tag ' + (a.riskScore > 70 ? 'tag-rose' : 'tag-amber')}>{a.riskScore > 70 ? 'High' : 'Medium'}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', fontSize: '12.5px', color: 'var(--ink-60)', textAlign: 'center' }}>
                    No discount anomalies flagged.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ROLE 2: SALES REPRESENTATIVE DASHBOARD */}
      {role === ROLES.SALES_REP && (
        <>
          <div className="grid-4">
            <div className="stat-card fade-target">
              <div className="lbl">My Active Quotes</div>
              <div className="val">
                <CountUp value={computedMetrics.openPipelineValue} prefix="$" />
              </div>
              <div className="delta delta-up">{computedMetrics.activeQuotesCount} quotes in progress</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Pending Approvals</div>
              <div className="val">
                <CountUp value={computedMetrics.pendingApprovalsCount} />
              </div>
              <div className="delta delta-amber">Manager review requested</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Customer Counter-Offers</div>
              <div className="val">
                <CountUp value={deals.filter(d => (d.stage || '').toUpperCase().includes('NEGOTIAT')).length} />
              </div>
              <div className="delta delta-up">Action required</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Fulfillment Tracking</div>
              <div className="val">
                <CountUp value={computedMetrics.fulfillmentCount} />
              </div>
              <div className="delta delta-up">In warehouse packing</div>
            </div>
          </div>

          <div className="two-col">
            <div className="panel fade-target">
              <div className="panel-header">
                <h3>My Active Quotations</h3>
                <Link to="/builder" className="btn btn-ghost" style={{ fontSize: 11.5 }}>+ New Quote</Link>
              </div>
              <div className="panel-body">
                {deals.length > 0 ? (
                  deals.slice(0, 4).map((d) => (
                    <div className="row" key={d.id}>
                      <div>
                        <div className="row-title">{d.cust} — {d.amt}</div>
                        <div className="row-sub">Assigned Rep: {d.rep} · {d.items} items</div>
                      </div>
                      <span className="tag tag-viridian">{d.stage}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', fontSize: '12.5px', color: 'var(--ink-60)', textAlign: 'center' }}>
                    No active quotations. Click "+ New Quote" to create one.
                  </div>
                )}
              </div>
            </div>

            <div className="panel fade-target">
              <div className="panel-header">
                <h3>Customer Negotiations & Activity</h3>
                <span className="tag tag-amber">{deals.filter(d => (d.stage || '').toUpperCase().includes('NEGOTIAT')).length} Needs Response</span>
              </div>
              <div className="panel-body">
                {deals.filter(d => (d.stage || '').toUpperCase().includes('PENDING') || (d.stage || '').toUpperCase().includes('NEGOTIAT')).length > 0 ? (
                  deals.filter(d => (d.stage || '').toUpperCase().includes('PENDING') || (d.stage || '').toUpperCase().includes('NEGOTIAT')).slice(0, 3).map((d) => (
                    <div className="row" key={d.id}>
                      <div>
                        <div className="row-title">{d.cust} Counter-Offer</div>
                        <div className="row-sub">Status: {d.stage} · {d.amt}</div>
                      </div>
                      <Link to="/builder" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11.5 }}>Respond →</Link>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', fontSize: '12.5px', color: 'var(--ink-60)', textAlign: 'center' }}>
                    No active negotiations requiring response.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ROLE 3: SALES MANAGER DASHBOARD */}
      {role === ROLES.SALES_MANAGER && (
        <>
          <div className="grid-4">
            <div className="stat-card fade-target">
              <div className="lbl">Approval Queue Value</div>
              <div className="val">
                <CountUp value={computedMetrics.pendingApprovalsValue} prefix="$" />
              </div>
              <div className="delta delta-down">{computedMetrics.pendingApprovalsCount} quotes pending signoff</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Team Deal Health</div>
              <div className="val">
                <CountUp value={computedMetrics.teamDealHealth} suffix="%" />
              </div>
              <div className="delta delta-up">Optimal margin stability</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">At-Risk Deals</div>
              <div className="val">
                <CountUp value={computedMetrics.stalledDealsCount} />
              </div>
              <div className="delta delta-rose">Governance flagged</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Approval Velocity</div>
              <div className="val">
                <CountUp value={computedMetrics.avgApprovalTime} decimals={1} />
                <span style={{ fontSize: 15 }}> hrs</span>
              </div>
              <div className="delta delta-up">Fast response time</div>
            </div>
          </div>

          <div className="two-col">
            <div className="panel fade-target">
              <div className="panel-header">
                <h3>Manager Approval Queue</h3>
                <Link to="/approval" className="btn btn-ghost" style={{ fontSize: 11.5 }}>View Queue →</Link>
              </div>
              <div className="panel-body">
                {pendingDeals.length > 0 ? (
                  pendingDeals.map((d) => (
                    <div className="row" key={d.id}>
                      <div>
                        <div className="row-title">{d.cust} ({d.amt})</div>
                        <div className="row-sub">Rep: {d.rep} · {d.items} items</div>
                      </div>
                      <Link to="/approval" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11.5 }}>Review →</Link>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', fontSize: '12.5px', color: 'var(--ink-60)', textAlign: 'center' }}>
                    Approval queue clear. No pending items.
                  </div>
                )}
              </div>
            </div>

            <div className="panel fade-target">
              <div className="panel-header">
                <h3>Team Performance & At-Risk Deals</h3>
                <span className="tag tag-amber">{computedMetrics.stalledDealsCount} Stalled</span>
              </div>
              <div className="panel-body">
                {deals.filter(d => d.riskScore > 60).length > 0 ? (
                  deals.filter(d => d.riskScore > 60).map((d) => (
                    <div className="row" key={d.id}>
                      <div>
                        <div className="row-title">{d.cust} ({d.amt})</div>
                        <div className="row-sub">Assigned Rep: {d.rep} · Risk Score: {d.riskScore}</div>
                      </div>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11.5 }}>Nudge Rep →</button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', fontSize: '12.5px', color: 'var(--ink-60)', textAlign: 'center' }}>
                    No at-risk deals identified.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ROLE 4: FINANCE / OPERATIONS DASHBOARD */}
      {role === ROLES.FINANCE && (
        <>
          <div className="grid-4">
            <div className="stat-card fade-target">
              <div className="lbl">Finance Approvals Pending</div>
              <div className="val">
                <CountUp value={computedMetrics.pendingApprovalsValue} prefix="$" />
              </div>
              <div className="delta delta-rose">Discount & term review</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Warehouse Capacity</div>
              <div className="val">
                <CountUp value={78} suffix="%" />
              </div>
              <div className="delta delta-up">Optimal stock level</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Recurring Subscriptions</div>
              <div className="val">
                <CountUp value={computedMetrics.mrrValue} prefix="$" />
                <span style={{ fontSize: 13 }}> MRR</span>
              </div>
              <div className="delta delta-up">↑ Active recurring revenue</div>
            </div>
            <div className="stat-card fade-target">
              <div className="lbl">Backorders Queue</div>
              <div className="val">
                <CountUp value={1} />
              </div>
              <div className="delta delta-amber">Requires split shipment</div>
            </div>
          </div>

          <div className="two-col">
            <div className="panel fade-target">
              <div className="panel-header">
                <h3>Warehouse Status & Allocation</h3>
                <Link to="/fulfillment" className="btn btn-ghost" style={{ fontSize: 11.5 }}>Manage Fulfillment →</Link>
              </div>
              <div className="panel-body">
                {warehouses.length > 0 ? (
                  warehouses.map((wh) => (
                    <div className="row" key={wh.id || wh.name}>
                      <div>
                        <div className="row-title">{wh.name}</div>
                        <div className="row-sub">{wh.address || wh.location || 'Active Warehouse Node'}</div>
                      </div>
                      <span className="tag tag-viridian">Active</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="row">
                      <div>
                        <div className="row-title">Main Hub Warehouse</div>
                        <div className="row-sub">Orion Laptops: Stock health good</div>
                      </div>
                      <span className="tag tag-viridian">84% Capacity</span>
                    </div>
                    <div className="row">
                      <div>
                        <div className="row-title">East Annex Hub</div>
                        <div className="row-sub">Docking Stations: Stock health stable</div>
                      </div>
                      <span className="tag tag-amber">42% Capacity</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="panel fade-target">
              <div className="panel-header">
                <h3>Billing & Subscriptions Summary</h3>
                <Link to="/subscriptions" className="btn btn-ghost" style={{ fontSize: 11.5 }}>Subscriptions →</Link>
              </div>
              <div className="panel-body">
                {subscriptions.length > 0 ? (
                  subscriptions.map((sub) => (
                    <div className="row" key={sub.id}>
                      <div>
                        <div className="row-title">{sub.customer_name || sub.plan_name || 'Active Contract'}</div>
                        <div className="row-sub">Plan: {sub.plan_name || 'Enterprise'} · {sub.interval || 'monthly'}</div>
                      </div>
                      <span className="tag tag-viridian">${sub.price || '39.00'} / mo</span>
                    </div>
                  ))
                ) : (
                  <div className="row">
                    <div>
                      <div className="row-title">Active Recurring Contracts</div>
                      <div className="row-sub">Subscriptions updated dynamically</div>
                    </div>
                    <span className="tag tag-viridian">₹{computedMetrics.mrrValue.toLocaleString('en-IN')} MRR</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}