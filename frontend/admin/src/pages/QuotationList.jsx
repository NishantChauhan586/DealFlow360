import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEnter } from '../components/Animations';
import { IconCart, IconSearch, IconPipe, IconDash } from '../components/Icons';

import { fetchQuotations } from '../utils/apiClient';
import syncBus from '../utils/syncBus';

const MOCK_QUOTATIONS = [];

const STAGES = ['Draft', 'Pending Approval', 'Approved', 'Fulfillment', 'Billed'];

export default function QuotationList() {
  const ref = useEnter([]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialViewMode = searchParams.get('view') === 'kanban' ? 'kanban' : 'cards';
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [quotesList, setQuotesList] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadQuotes() {
      const apiQuotes = await fetchQuotations();
      if (isMounted && Array.isArray(apiQuotes)) {
        setQuotesList(
          apiQuotes.map((q) => {
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
              stage: q.status || q.stage || 'Draft',
              rep: q.sales_rep || q.salesRep || q.rep || 'Sales Rep',
              items: Array.isArray(q.items) ? q.items.length : Array.isArray(q.lineItems) ? q.lineItems.length : 1,
              date: q.submitted_at || q.submittedAt || q.date || 'Recent',
              risk: q.risk_level || q.riskLevel || q.risk || 'Low',
            };
          })
        );
      }
    }
    loadQuotes();
    const unsub = syncBus.subscribe('quotes', () => {
      loadQuotes();
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    const v = searchParams.get('view');
    if (v === 'kanban' || v === 'cards') {
      setViewMode(v);
    }
  }, [searchParams]);

  const handleToggleView = (mode) => {
    setViewMode(mode);
    setSearchParams({ view: mode });
  };

  const filteredDeals = quotesList.filter((q) => {
    const matchSearch =
      !search.trim() ||
      q.cust.toLowerCase().includes(search.toLowerCase().trim()) ||
      q.rep.toLowerCase().includes(search.toLowerCase().trim());
    const matchStage = filterStage === 'All' || q.stage === filterStage;
    return matchSearch && matchStage;
  });

  const handleSelectDeal = (deal) => {
    navigate('/builder', {
      state: {
        customer: deal.cust,
        amt: deal.amt,
        stage: deal.stage
      }
    });
  };

  return (
    <div ref={ref}>
      
      {/* Top Controls & Header */}
      <div
        className="fade-target"
        style={{
          background: '#ffffff',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: '18px 22px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', color: 'var(--burnham)', fontWeight: 700, margin: 0 }}>
            Quotation List / Pipeline View
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--ink-60)', margin: '4px 0 0 0' }}>
            Select any quotation card below to open the <strong>Quotation Builder</strong> for that deal.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Cards vs Kanban */}
          <div style={{ display: 'flex', background: 'var(--paper-2)', padding: '3px', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <button
              type="button"
              onClick={() => handleToggleView('cards')}
              style={{
                background: viewMode === 'cards' ? 'var(--burnham)' : 'transparent',
                color: viewMode === 'cards' ? '#ffffff' : 'var(--ink)',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <IconDash style={{ width: 13, height: 13 }} /> Card Portfolio
            </button>
            <button
              type="button"
              onClick={() => handleToggleView('kanban')}
              style={{
                background: viewMode === 'kanban' ? 'var(--burnham)' : 'transparent',
                color: viewMode === 'kanban' ? '#ffffff' : 'var(--ink)',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <IconPipe style={{ width: 13, height: 13 }} /> Kanban Pipeline
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search customer or rep..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '8px 12px 8px 32px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                fontSize: '12.5px',
                width: '200px'
              }}
            />
            <IconSearch style={{ position: 'absolute', left: 10, top: 10, width: 14, height: 14, color: 'var(--ink-60)' }} />
          </div>

          <button
            type="button"
            className="btn btn-dark"
            onClick={() => navigate('/builder')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
          >
            <IconCart style={{ width: 15, height: 15 }} /> + New Quotation
          </button>
        </div>
      </div>

      {/* VIEW 1: SELECTABLE CARDS GRID */}
      {viewMode === 'cards' && (
        <>
          {/* Stage Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {['All', ...STAGES].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStage(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterStage === st ? 'var(--burnham)' : 'var(--paper-2)',
                  color: filterStage === st ? '#ffffff' : 'var(--ink)',
                  transition: 'all 0.2s ease'
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {filteredDeals.map((deal) => {
              const badgeClass =
                deal.stage === 'Draft' ? 'tag-viridian' :
                deal.stage === 'Pending Approval' ? 'tag-amber' :
                deal.stage === 'Approved' ? 'tag-green' :
                deal.stage === 'Fulfillment' ? 'tag-blue' : 'tag-rose';

              return (
                <div
                  key={deal.id}
                  onClick={() => handleSelectDeal(deal)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(8, 32, 26, 0.12)';
                    e.currentTarget.style.borderColor = 'var(--viridian)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                    e.currentTarget.style.borderColor = 'var(--line)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--burnham)' }}>
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

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    borderTop: '1px solid var(--line)',
                    paddingTop: '12px',
                    marginTop: '4px'
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-60)', fontWeight: 600 }}>
                        Total Value
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--burnham)', fontFamily: 'var(--serif)' }}>
                        {deal.amt}
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--viridian-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Open Builder →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* VIEW 2: KANBAN PIPELINE VIEW */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {STAGES.map((stageName) => {
            const stageDeals = filteredDeals.filter((d) => d.stage === stageName);
            const totalStageVal = stageDeals.reduce((sum, d) => {
              const num = parseInt(d.amt.replace(/[^0-9]/g, ''), 10) || 0;
              return sum + num;
            }, 0);

            return (
              <div
                key={stageName}
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: '14px',
                  minHeight: '420px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--burnham)' }}>{stageName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-60)' }}>₹{totalStageVal.toLocaleString('en-IN')}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                    {stageDeals.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      onClick={() => handleSelectDeal(deal)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'var(--viridian)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--line)';
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--burnham)' }}>{deal.cust}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-60)', marginTop: '2px' }}>{deal.rep}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '6px', borderTop: '1px stroke var(--line)' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--burnham)' }}>{deal.amt}</span>
                        <span style={{ fontSize: '10.5px', color: 'var(--viridian-600)', fontWeight: 700 }}>Builder →</span>
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                      No deals in {stageName}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
