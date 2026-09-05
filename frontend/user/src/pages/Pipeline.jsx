import { useEnter } from '../components/Animations';
import { pipelineData } from '../data/mockData';

export default function Pipeline() {
  const ref = useEnter([]);
  return (
    <div ref={ref} className="kanban">
      {Object.entries(pipelineData).map(([stage, deals]) => (
        <div key={stage} className="fade-target">
          <div className="kcol-head">
            <span>{stage}</span>
            <span>{deals.length}</span>
          </div>
          {deals.map((d, i) => (
            <div className="kcard" key={i}>
              <div className="cust">{d.cust}</div>
              <div className="amt">{d.amt}</div>
              <div className="meta">
                <span>{d.rep}</span>
                <span>Q-{1000 + i}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
