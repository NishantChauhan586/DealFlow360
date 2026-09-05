import { HeroCanvas } from '../components/HeroCanvas';
import { CountUp, useEnter } from '../components/Animations';
import { stalledDeals, anomalies } from '../data/mockData';

export default function Dashboard() {
  const ref = useEnter([]);
  return (
    <div ref={ref}>
      <div className="hero">
        <HeroCanvas />
        <div className="hero-copy fade-target">
          <div className="eyebrow">Deal Health · Live</div>
          <h2>Every deal, watched<br />before it stalls.</h2>
          <p>Anomalies, stalled quotes, and delivery slippage surface the moment they happen — not after the deal has gone cold.</p>
        </div>
        <div className="hero-stat fade-target">
          <div className="num"><CountUp value={214300} prefix="$" /></div>
          <div className="lbl">Open pipeline value</div>
        </div>
      </div>

      <div className="grid-4">
        <div className="stat-card fade-target">
          <div className="lbl">Open pipeline</div>
          <div className="val"><CountUp value={214300} prefix="$" /></div>
          <div className="delta delta-up">↑ 6.2% vs last week</div>
        </div>
        <div className="stat-card fade-target">
          <div className="lbl">Stalled deals</div>
          <div className="val"><CountUp value={3} /></div>
          <div className="delta delta-down">2 over 10 days idle</div>
        </div>
        <div className="stat-card fade-target">
          <div className="lbl">Discount anomalies</div>
          <div className="val"><CountUp value={3} /></div>
          <div className="delta delta-down">2 flagged high risk</div>
        </div>
        <div className="stat-card fade-target">
          <div className="lbl">Avg. approval time</div>
          <div className="val"><CountUp value={5.4} decimals={1} /><span style={{ fontSize: 15 }}> hrs</span></div>
          <div className="delta delta-up">↓ 1.1 hrs vs last month</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel fade-target">
          <div className="panel-header">
            <h3>Stalled deals</h3>
            <span className="tag tag-amber">3 active</span>
          </div>
          <div className="panel-body">
            {stalledDeals.map((d, i) => (
              <div className="row" key={i}>
                <div>
                  <div className="row-title">{d.cust}</div>
                  <div className="row-sub">{d.rep} · idle {d.days} days</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="row-title">{d.amt}</div>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11.5 }}>Nudge rep →</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel fade-target">
          <div className="panel-header">
            <h3>Discount anomalies</h3>
            <span className="tag tag-rose">2 high</span>
          </div>
          <div className="panel-body">
            {anomalies.map((a, i) => (
              <div className="row" key={i}>
                <div>
                  <div className="row-title">{a.cust}</div>
                  <div className="row-sub">{a.note}</div>
                </div>
                <span className={'tag ' + (a.level === 'High' ? 'tag-rose' : 'tag-amber')}>{a.level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}