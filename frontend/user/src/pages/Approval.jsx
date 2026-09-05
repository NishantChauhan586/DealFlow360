import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useEnter } from '../components/Animations';
import { IconCheck } from '../components/Icons';

export default function Approval() {
  const ref = useEnter([]);
  const arcRef = useRef(null);
  const score = 68;

  useEffect(() => {
    if (!arcRef.current) return;
    const len = 220;
    gsap.fromTo(
      arcRef.current,
      { strokeDashoffset: len },
      { strokeDashoffset: len - (len * score / 100), duration: 1, ease: 'power2.out', delay: 0.2 }
    );
  }, []);

  return (
    <div ref={ref} className="two-col">
      <div className="panel fade-target">
        <div className="panel-header">
          <h3>Blended risk score — Acme Corp</h3>
          <span className="tag tag-rose">Needs Finance</span>
        </div>
        <div className="risk-wrap">
          <svg width="130" height="130" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="35" fill="none" stroke="var(--paper-2)" strokeWidth="10"/>
            <circle
              ref={arcRef}
              cx="50" cy="50" r="35"
              fill="none" stroke="var(--amber)" strokeWidth="10"
              strokeDasharray="220" strokeDashoffset="220"
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="55" textAnchor="middle"
              fontFamily="Fraunces" fontWeight="700" fontSize="22" fill="var(--ink)">{score}</text>
          </svg>
          <div className="risk-meta">
            <h4>Service line broke its own ceiling</h4>
            <p>
              Laptop discount (12%) is within its 15% ceiling. Onsite Setup Service was discounted 18%,
              8 points over its 10% ceiling. The blended score routes this quote to Sales Manager, then Finance.
            </p>
          </div>
        </div>
      </div>

      <div className="panel fade-target">
        <div className="panel-header"><h3>Approval chain</h3></div>
        <div className="steps">
          <div className="step">
            <div className="step-dot done">
              <IconCheck style={{ width: 13, height: 13 }} />
            </div>
            <div>
              <div className="step-title">Sales Manager — R. Okafor</div>
              <div className="step-sub">Approved · "Margin still healthy overall, proceed." · 2:14pm</div>
            </div>
          </div>
          <div className="step">
            <div className="step-dot pending">2</div>
            <div>
              <div className="step-title">Finance — awaiting review</div>
              <div className="step-sub">Required because Services exceeded its category ceiling</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 18px 18px' }}>
          <button className="btn btn-primary">Approve</button>
          <button className="btn btn-danger">Reject</button>
          <button className="btn btn-ghost">Return for revision</button>
        </div>
      </div>
    </div>
  );
}
