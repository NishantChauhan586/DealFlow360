import { useState, useMemo } from 'react';
import reportService from '../services/reportService';
import {
  IconDownload,
  IconPrinter,
  IconFilter,
  IconCalendar,
  IconUsers,
  IconCheck,
  IconBox,
} from '../components/Icons';
import styles from './Reports.module.css';

export default function Reports() {
  // Multidimensional Reporting Filters
  const [period, setPeriod] = useState('this_month'); // 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [salesRep, setSalesRep] = useState('All Reps');
  const [salesTeam, setSalesTeam] = useState('All Teams');
  const [approvalStatus, setApprovalStatus] = useState('All Statuses');
  const [category, setCategory] = useState('All Categories');
  const [productSort, setProductSort] = useState('all'); // 'all' | 'best_selling' | 'most_discounted'

  const reps = useMemo(() => reportService.getSalesReps(), []);
  const teams = useMemo(() => reportService.getSalesTeams(), []);
  const categories = useMemo(() => reportService.getCategories(), []);
  const statuses = useMemo(() => reportService.getApprovalStatuses(), []);

  // Filtered records
  const records = useMemo(() => {
    return reportService.filterRecords({
      period,
      customStartDate,
      customEndDate,
      salesRep,
      salesTeam,
      approvalStatus,
      category,
      productSort,
    });
  }, [period, customStartDate, customEndDate, salesRep, salesTeam, approvalStatus, category, productSort]);

  // Aggregated KPIs and Visual Breakdown
  const kpis = useMemo(() => reportService.getPerformanceKPIs(records), [records]);
  const repBreakdown = useMemo(() => reportService.getRepPerformanceBreakdown(records), [records]);
  const productBreakdown = useMemo(() => reportService.getProductPerformanceBreakdown(records), [records]);

  // Sort products for best selling vs most discounted
  const topSellingProducts = useMemo(() => {
    return [...productBreakdown].sort((a, b) => b.netRevenue - a.netRevenue).slice(0, 5);
  }, [productBreakdown]);

  const mostDiscountedProducts = useMemo(() => {
    return [...productBreakdown].sort((a, b) => b.avgDiscount - a.avgDiscount).slice(0, 5);
  }, [productBreakdown]);

  const handleResetFilters = () => {
    setPeriod('this_month');
    setCustomStartDate('');
    setCustomEndDate('');
    setSalesRep('All Reps');
    setSalesTeam('All Teams');
    setApprovalStatus('All Statuses');
    setCategory('All Categories');
    setProductSort('all');
  };

  const handleExportCSV = () => {
    reportService.exportToCSV(records, period);
  };

  const handleExportPDF = () => {
    reportService.exportToPDF();
  };

  return (
    <div className={styles.container}>
      {/* Top Header & Export Actions */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <h2>Sales Performance & Quotations Reporting</h2>
          <p>
            Real-time sales velocity, discount governance metrics, rep attribution, and order fulfillment analytics
          </p>
        </div>

        <div className={styles.exportActions}>
          <button
            type="button"
            className={styles.btnExport}
            onClick={handleExportCSV}
            title="Download CSV spreadsheet for Excel / Google Sheets"
          >
            <IconDownload style={{ width: 15, height: 15 }} />
            Export XLS / CSV
          </button>
          <button
            type="button"
            className={styles.btnExportPrimary}
            onClick={handleExportPDF}
            title="Print or export formatted executive PDF"
          >
            <IconPrinter style={{ width: 15, height: 15 }} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Multidimensional Reporting Filter Panel */}
      <div className={styles.filterCard}>
        {/* Row 1: Period Selection Pills */}
        <div className={styles.filterRowTop}>
          <div className={styles.periodPills}>
            <span className={styles.periodLabel}>
              <IconCalendar style={{ width: 13, height: 13, display: 'inline', marginRight: 4, verticalAlign: -1 }} />
              Period:
            </span>
            <button
              type="button"
              className={`${styles.periodPill} ${period === 'today' ? styles.activePill : ''}`}
              onClick={() => setPeriod('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`${styles.periodPill} ${period === 'this_week' ? styles.activePill : ''}`}
              onClick={() => setPeriod('this_week')}
            >
              This Week
            </button>
            <button
              type="button"
              className={`${styles.periodPill} ${period === 'this_month' ? styles.activePill : ''}`}
              onClick={() => setPeriod('this_month')}
            >
              This Month
            </button>
            <button
              type="button"
              className={`${styles.periodPill} ${period === 'this_quarter' ? styles.activePill : ''}`}
              onClick={() => setPeriod('this_quarter')}
            >
              This Quarter
            </button>
            <button
              type="button"
              className={`${styles.periodPill} ${period === 'custom' ? styles.activePill : ''}`}
              onClick={() => setPeriod('custom')}
            >
              Custom Range
            </button>
          </div>

          {period === 'custom' && (
            <div className={styles.customDateInputs}>
              <span>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={styles.dateInput}
              />
              <span>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
          )}

          <button type="button" className={styles.resetBtn} onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>

        {/* Row 2: Secondary Dropdown Filters Grid */}
        <div className={styles.filterControlsGrid}>
          {/* Filter: Sales Rep */}
          <div className={styles.filterItem}>
            <label>Sales Representative</label>
            <select
              value={salesRep}
              onChange={(e) => setSalesRep(e.target.value)}
              className={styles.filterSelect}
            >
              {reps.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Filter: Sales Team */}
          <div className={styles.filterItem}>
            <label>Sales Team / Division</label>
            <select
              value={salesTeam}
              onChange={(e) => setSalesTeam(e.target.value)}
              className={styles.filterSelect}
            >
              {teams.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filter: Approval Status */}
          <div className={styles.filterItem}>
            <label>Approval Status</label>
            <select
              value={approvalStatus}
              onChange={(e) => setApprovalStatus(e.target.value)}
              className={styles.filterSelect}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Filter: Product Category */}
          <div className={styles.filterItem}>
            <label>Product Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={styles.filterSelect}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Product Focus / Sort Toggle */}
        <div className={styles.sortToggleBar}>
          <div className={styles.sortToggleGroup}>
            <span>Analysis Mode:</span>
            <button
              type="button"
              className={`${styles.sortBtn} ${productSort === 'all' ? styles.activeSort : ''}`}
              onClick={() => setProductSort('all')}
            >
              All Chronological
            </button>
            <button
              type="button"
              className={`${styles.sortBtn} ${productSort === 'best_selling' ? styles.activeSort : ''}`}
              onClick={() => setProductSort('best_selling')}
            >
              ★ Best Selling Items
            </button>
            <button
              type="button"
              className={`${styles.sortBtn} ${productSort === 'most_discounted' ? styles.activeSort : ''}`}
              onClick={() => setProductSort('most_discounted')}
            >
              % Most Discounted Items
            </button>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--ink-60)' }}>
            Showing <strong>{records.length}</strong> matching transactions
          </span>
        </div>
      </div>

      {/* KPI Performance Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Quoted Pipeline</div>
          <div className={styles.kpiValue}>
            ₹{kpis.totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={styles.kpiSub}>
            Across <strong>{kpis.totalCount}</strong> quotes & orders
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Booked / Won Revenue</div>
          <div className={styles.kpiValue} style={{ color: 'var(--viridian)' }}>
            ₹{kpis.totalWonNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={styles.kpiSub}>
            <span className={styles.kpiBadgeUp}>✓ {kpis.approvedCount} approved deals</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Blended Win Rate</div>
          <div className={styles.kpiValue}>
            {kpis.winRate}%
          </div>
          <div className={styles.kpiSub}>
            {kpis.rejectedCount > 0 ? `${kpis.rejectedCount} rejected · ` : ''}
            {kpis.pendingCount} pending review
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Average Discount Rate</div>
          <div className={styles.kpiValue} style={{ color: kpis.avgDiscount > 15 ? 'var(--rose)' : 'var(--burnham)' }}>
            {kpis.avgDiscount}%
          </div>
          <div className={styles.kpiSub}>
            ₹{kpis.totalDiscountGiven.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total price concessions
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Top Performing Rep</div>
          <div className={styles.kpiValue} style={{ fontSize: '19px' }}>
            {kpis.topRep}
          </div>
          <div className={styles.kpiSub}>
            ₹{kpis.topRepWonVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })} closed volume
          </div>
        </div>
      </div>

      {/* Visual Analytics Breakdowns */}
      <div className={styles.analyticsRow}>
        {/* Panel A: Sales Rep & Team Attainment */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Rep & Team Performance</h3>
            <span style={{ fontSize: '12px', color: 'var(--ink-60)', fontWeight: 600 }}>Won Revenue</span>
          </div>

          <div className={styles.repList}>
            {repBreakdown.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-40)', fontSize: '13px' }}>
                No representative data for the selected filter criteria.
              </div>
            ) : (
              repBreakdown.map((r) => {
                const maxVol = Math.max(...repBreakdown.map((x) => x.wonVolume), 1);
                const pct = Math.round((r.wonVolume / maxVol) * 100);
                return (
                  <div key={r.rep} className={styles.repItem}>
                    <div className={styles.repItemHeader}>
                      <div>
                        <span className={styles.repName}>{r.rep}</span>
                        <span className={styles.repTeam}> · {r.team}</span>
                      </div>
                      <div className={styles.repStats}>
                        <span><strong>{r.wonDeals}</strong> won ({r.winRate}%)</span>
                        <span>Avg disc: <strong>{r.avgDiscount}%</strong></span>
                        <strong style={{ color: 'var(--burnham)' }}>
                          ₹{r.wonVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </strong>
                      </div>
                    </div>

                    <div className={styles.repBarTrack}>
                      <div className={styles.repBarFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel B: Product Analytics: Best Selling vs Most Discounted */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              {productSort === 'most_discounted' ? 'Most Discounted Products' : 'Best Selling Products by Revenue'}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--viridian)', fontWeight: 600 }}>Product Matrix</span>
          </div>

          <div className={styles.productMatrixList}>
            {(productSort === 'most_discounted' ? mostDiscountedProducts : topSellingProducts).map((prod) => (
              <div key={prod.productName} className={styles.productMatrixItem}>
                <div className={styles.prodMatrixInfo}>
                  <span className={styles.prodName}>{prod.productName}</span>
                  <span className={styles.prodCat}>
                    {prod.category} · {prod.totalUnits} units in {prod.dealsCount} deals
                  </span>
                </div>

                <div className={styles.prodMatrixNumbers}>
                  <span className={styles.prodRevenue}>
                    ₹{prod.netRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className={prod.avgDiscount >= 15 ? styles.discountBadgeHigh : styles.discountBadge}>
                    Avg -{prod.avgDiscount}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Quotations & Orders Ledger Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderBar}>
          <h3 className={styles.tableTitle}>Quotations & Orders Ledger</h3>
          <span style={{ fontSize: '12.5px', color: 'var(--ink-60)' }}>
            Showing records matching period: <strong>{period.replace('_', ' ')}</strong>
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.ledgerTable}>
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Date</th>
                <th>Client / Enterprise</th>
                <th>Sales Rep & Team</th>
                <th>Primary Product</th>
                <th>Category</th>
                <th>Gross (₹)</th>
                <th>Discount</th>
                <th>Net (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: 'var(--ink-40)' }}>
                    No quotations or orders match the current filter selection. Try adjusting the period or resetting filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  let statusBadgeClass = styles.statusBadgeApproved;
                  if (r.approvalStatus === 'Pending Approval') statusBadgeClass = styles.statusBadgePending;
                  if (r.approvalStatus === 'Rejected') statusBadgeClass = styles.statusBadgeRejected;
                  if (r.approvalStatus === 'Draft') statusBadgeClass = styles.statusBadgeDraft;

                  return (
                    <tr key={r.id}>
                      <td>
                        <span className={styles.quoteIdBadge}>{r.id}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-60)' }}>{r.date}</td>
                      <td>
                        <strong style={{ color: 'var(--burnham)' }}>{r.customer}</strong>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{r.salesRep}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-40)' }}>{r.salesTeam}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.productName}>
                          {r.productName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-40)' }}>Qty: {r.quantity}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', background: 'var(--paper)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                          {r.category}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--ink-60)' }}>
                        ₹{r.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span style={{ color: r.discountPercent > 15 ? 'var(--rose)' : 'var(--burnham)', fontWeight: 600 }}>
                          {r.discountPercent}%
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--burnham)', fontFamily: 'monospace' }}>
                          ₹{r.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>
                        <span className={statusBadgeClass}>{r.approvalStatus}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
