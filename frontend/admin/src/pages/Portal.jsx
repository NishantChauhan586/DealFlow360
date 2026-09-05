import { useState } from 'react';
import { useEnter } from '../components/Animations';

export default function Portal() {
  const ref = useEnter([]);
  const [note, setNote] = useState('');

  return (
    <div ref={ref} className="portal-wrap">
      <div className="fade-target portal-badge">Restricted customer view · Quotation Q-1042</div>

      <div className="portal-card fade-target">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-60)' }}>Prepared for</div>
            <h3 style={{ fontFamily: 'var(--serif)', margin: '2px 0 0', fontSize: 19 }}>Acme Corp</h3>
          </div>
          <span className="tag tag-amber">Under negotiation</span>
        </div>

        <div className="portal-total tnum">$1,940.00</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-60)', marginBottom: 14 }}>
          2 lines · valid through Sept 20
        </div>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div className="bill-line" style={{ padding: '8px 0' }}>
            <span>Orion Laptop 14" ×1</span><span className="tnum">$1,276.00</span>
          </div>
          <div className="bill-line" style={{ padding: '8px 0', borderBottom: 'none' }}>
            <span>Onsite Setup Service ×1</span><span className="tnum">$492.00</span>
          </div>
        </div>

        <div className="field-label">Ask a question or request a change on a line</div>
        <textarea
          className="comment-box"
          placeholder="e.g. Could the setup service be scheduled for next month?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="field-label">Counter a discount</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="disc-input" style={{ width: 80 }} placeholder="e.g. 20" />
          <span style={{ alignSelf: 'center', fontSize: 12.5, color: 'var(--ink-60)' }}>% off the total</span>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="btn btn-primary">Submit request</button>
          <button className="btn btn-dark">Confirm quotation</button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-60)', marginTop: 10 }}>
          Confirming with terms beyond approved thresholds automatically re-opens Sales Manager and Finance review.
        </div>
      </div>
    </div>
  );
}
