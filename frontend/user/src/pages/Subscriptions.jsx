import { useEnter } from '../components/Animations';

export default function Subscriptions() {
  const ref = useEnter([]);
  return (
    <div ref={ref} className="two-col">
      <div className="panel fade-target">
        <div className="panel-header"><h3>Order lines — Acme Corp</h3></div>
        <div className="panel-body">
          <div style={{ padding: '10px 18px 4px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-60)', fontWeight: 700 }}>
            One-time
          </div>
          <div className="bill-line"><span>Orion Laptop 14" ×1</span><span className="tnum">$1,450.00</span></div>
          <div style={{ padding: '14px 18px 4px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-60)', fontWeight: 700 }}>
            Recurring
          </div>
          <div className="bill-line"><span>Fleet Manager (Sub) — monthly</span><span className="tnum">$39.00 / mo</span></div>
          <div className="bill-line"><span>Security Suite (Sub) — monthly</span><span className="tnum">$24.00 / mo</span></div>
        </div>
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-60)' }}>
          Mid-cycle quantity change on Fleet Manager will be prorated to the next billing date automatically.
        </div>
      </div>

      <div className="panel fade-target">
        <div className="panel-header"><h3>Upcoming billing schedule</h3></div>
        <div className="timeline">
          <div className="tl-item"><div className="date">Sep 20</div><div className="amt tnum">$63.00</div></div>
          <div className="tl-item"><div className="date">Oct 20</div><div className="amt tnum">$63.00</div></div>
          <div className="tl-item"><div className="date">Nov 20</div><div className="amt tnum">$63.00</div></div>
          <div className="tl-item"><div className="date">Dec 20</div><div className="amt tnum">$63.00</div></div>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 18px 18px' }}>
          <button className="btn btn-ghost">Modify subscription</button>
          <button className="btn btn-danger">Cancel line</button>
        </div>
      </div>
    </div>
  );
}
