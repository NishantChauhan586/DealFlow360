import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatChartValue } from '../../utils/formatters';
import styles from './PerformanceChart.module.css';

/** Custom tooltip for charts */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className={styles.tooltipItem} style={{ color: entry.color }}>
          <span>{entry.name}</span>
          <strong>{formatChartValue(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function DealsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className={styles.tooltipItem} style={{ color: entry.color }}>
          <span>{entry.name}</span>
          <strong>{entry.value} deals</strong>
        </p>
      ))}
    </div>
  );
}

/**
 * PerformanceChart — Revenue trend (AreaChart) and monthly deals (BarChart)
 */
export function PerformanceChart({ revenueData, dealsData, activeTab, onTabChange }) {
  return (
    <div className={styles.container}>
      {/* Tab switcher */}
      <div className={styles.tabs} role="tablist" aria-label="Chart view">
        <button
          type="button"
          role="tab"
          className={`${styles.tab} ${activeTab === 'revenue' ? styles.activeTab : ''}`}
          aria-selected={activeTab === 'revenue'}
          onClick={() => onTabChange('revenue')}
        >
          Revenue Trend
        </button>
        <button
          type="button"
          role="tab"
          className={`${styles.tab} ${activeTab === 'deals' ? styles.activeTab : ''}`}
          aria-selected={activeTab === 'deals'}
          onClick={() => onTabChange('deals')}
        >
          Deals Closed
        </button>
      </div>

      {/* Charts */}
      <div className={styles.chartWrap}>
        {activeTab === 'revenue' ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatChartValue}
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}
              />
              <Area
                type="monotone"
                dataKey="pipeline"
                name="Pipeline"
                stroke="#6366f1"
                strokeWidth={1.5}
                fill="url(#gradPipeline)"
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1' }}
              />
              <Area
                type="monotone"
                dataKey="won"
                name="Won Revenue"
                stroke="#10b981"
                strokeWidth={1.5}
                fill="url(#gradWon)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dealsData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<DealsTooltip />} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}
              />
              <Bar dataKey="closed" name="Won" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="lost" name="Lost" fill="#ef4444" radius={[3, 3, 0, 0]} fillOpacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
