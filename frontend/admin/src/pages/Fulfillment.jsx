import { useEnter } from '../components/Animations';

const warehouses = [
  { name: 'Main Warehouse', qty: 14, of: 18, pct: 78 },
  { name: 'East Depot',     qty: 4,  of: 18, pct: 22 },
];

export default function Fulfillment() {
  const ref = useEnter([]);
  return (
    <div ref={ref}>
      <div className="panel fade-target" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h3>Suggested warehouse split — Order #4821</h3>
          <span className="tag tag-green">2 shipments</span>
        </div>
        <div className="panel-body">
          {warehouses.map((w, i) => (
            <div className="wh-row" key={i}>
              <div className="wh-name">{w.name}</div>
              <div className="wh-bar-track">
                <div className="wh-bar-fill" style={{ width: w.pct + '%' }} />
              </div>
              <div className="wh-qty tnum">{w.qty} / {w.of} units</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '14px 18px' }}>
          <button className="btn btn-primary">Accept suggested split</button>
          <button className="btn btn-ghost">Manual override</button>
        </div>
        <div style={{ padding: '0 18px 18px' }}>
          <div className="backorder-banner fade-target">
            <span>Stock for the remaining 4 units lands at East Depot on Sept 12 — consolidate into one shipment?</span>
            <button className="btn btn-dark" style={{ padding: '6px 12px', fontSize: 12 }}>
              Consolidate backorder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
