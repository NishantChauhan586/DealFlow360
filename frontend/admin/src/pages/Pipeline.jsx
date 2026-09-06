import { useState, useEffect, useMemo } from 'react';
import { useEnter } from '../components/Animations';
import { fetchQuotations } from '../utils/apiClient';
import { useNavigate } from 'react-router-dom';

export default function Pipeline() {
  const ref = useEnter([]);
  const [deals, setDeals] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const qs = await fetchQuotations();
      if (Array.isArray(qs)) {
        setDeals(qs);
      }
    }
    loadData();
  }, []);

  const pipelineData = useMemo(() => {
    const stages = {
      Draft: [],
      'Pending Approval': [],
      Approved: [],
      Fulfillment: [],
      Billed: [],
    };

    deals.forEach((d) => {
      let stage = d.status || d.stage || 'Draft';
      if (stage === 'Pending Review') stage = 'Pending Approval';
      if (stage === 'Accepted') stage = 'Approved';
      if (stages[stage]) {
        stages[stage].push(d);
      } else {
        stages[stage] = [d];
      }
    });

    return stages;
  }, [deals]);

  const handleCardClick = (d) => {
    const val = typeof d.grand_total === 'number' ? d.grand_total : typeof d.grandTotal === 'number' ? d.grandTotal : typeof d.total_amount === 'number' ? d.total_amount : null;
    navigate('/builder', {
      state: {
        customer: d.customer_name || d.customerName || d.company_name || d.companyName || d.cust,
        amt: val !== null ? `₹${Math.round(val).toLocaleString('en-IN')}` : d.amt || '₹0',
        stage: d.status || d.stage || 'Draft',
      }
    });
  };

  return (
    <div ref={ref} className="kanban">
      {Object.entries(pipelineData).map(([stage, dealsList]) => (
        <div key={stage} className="fade-target" style={{ minWidth: 280 }}>
          <div className="kcol-head">
            <span>{stage}</span>
            <span>{dealsList.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dealsList.map((d, i) => {
              const val = typeof d.grand_total === 'number' ? d.grand_total : typeof d.grandTotal === 'number' ? d.grandTotal : typeof d.total_amount === 'number' ? d.total_amount : null;
              return (
                <div 
                  className="kcard" 
                  key={d.id || i} 
                  onClick={() => handleCardClick(d)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="cust">{d.customer_name || d.customerName || d.company_name || d.companyName || d.cust || 'Unknown'}</div>
                  <div className="amt">
                    {val !== null ? `₹${Math.round(val).toLocaleString('en-IN')}` : (d.amt || '₹0')}
                  </div>
                  <div className="meta">
                    <span>{d.sales_rep || d.salesRep || d.rep || 'System'}</span>
                    <span>{d.id || `Q-${1000 + i}`}</span>
                  </div>
                </div>
              );
            })}
            {dealsList.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-40)', fontSize: 12 }}>
                No deals in this stage
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
