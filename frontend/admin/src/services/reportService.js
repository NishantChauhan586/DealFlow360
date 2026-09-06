/**
 * reportService.js — DealFlow360 Sales Performance & Reporting Engine
 * Multi-dimensional filtering, KPI aggregation, and CSV/PDF export.
 */

// Initial Seed Data for Sales Performance & Quotations
const INITIAL_SALES_RECORDS = [];

class ReportService {
  constructor() {
    this.salesRecords = [];
    this._loadCustomerQuotations();
  }

  /**
   * Incorporate any quotations created across admin & customer portals dynamically
   */
  _loadCustomerQuotations() {
    this.salesRecords = [];
    try {
      const keys = ['dealflow_customer_quotations', 'dealflow_quotations_v1', 'dealflow_saved_quotations'];
      keys.forEach((key) => {
        const saved = localStorage.getItem(key);
        if (saved) {
          const quotes = JSON.parse(saved);
          if (Array.isArray(quotes)) {
            quotes.forEach((pq) => {
              if (!this.salesRecords.some((r) => r.id === pq.id)) {
                const gross = (pq.subtotal || pq.amount || 0) + (pq.discountAmount || 0);
                const net = pq.grandTotal || pq.netAmount || pq.subtotal || pq.amount || 0;
                const topItem = pq.lineItems?.[0]?.name || pq.productName || 'Quotation Package';
                this.salesRecords.push({
                  id: pq.id || `QT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                  date: pq.createdAt ? pq.createdAt.split('T')[0] : pq.date || new Date().toISOString().split('T')[0],
                  customer: pq.companyName || pq.customer || pq.customerEmail || 'Enterprise Client',
                  salesRep: pq.salesRep || pq.rep || 'Sales Team',
                  salesTeam: pq.salesTeam || 'Enterprise',
                  category: pq.category || 'Hardware & Software',
                  productName: topItem,
                  quantity: pq.lineItems?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 1,
                  grossAmount: gross > 0 ? gross : net,
                  discountPercent: pq.discountPercent || pq.discount || 0,
                  netAmount: typeof net === 'number' ? net : parseFloat(net) || 0,
                  approvalStatus: pq.status === 'Approved' || pq.status === 'ACCEPTED' ? 'Approved' : pq.status === 'Pending Review' || pq.status === 'PENDING' ? 'Pending Approval' : 'Draft',
                  marginPercent: pq.marginPercent || 28.0,
                  cycleDays: pq.cycleDays || 2,
                });
              }
            });
          }
        }
      });
    } catch {
      // ignore
    }
  }

  getSalesReps() {
    const reps = Array.from(new Set(this.salesRecords.map((r) => r.salesRep)));
    return ['All Reps', ...reps];
  }

  getSalesTeams() {
    const teams = Array.from(new Set(this.salesRecords.map((r) => r.salesTeam)));
    return ['All Teams', ...teams];
  }

  getCategories() {
    const cats = Array.from(new Set(this.salesRecords.map((r) => r.category)));
    return ['All Categories', ...cats];
  }

  getApprovalStatuses() {
    return ['All Statuses', 'Approved', 'Pending Approval', 'Rejected', 'Draft'];
  }

  /**
   * Filter records according to multidimensional filter state
   */
  filterRecords(filters = {}) {
    this._loadCustomerQuotations();
    const {
      period = 'this_month',
      customStartDate = '',
      customEndDate = '',
      salesRep = 'All Reps',
      salesTeam = 'All Teams',
      approvalStatus = 'All Statuses',
      category = 'All Categories',
      productSort = 'all', // 'all' | 'best_selling' | 'most_discounted'
    } = filters;

    const referenceDate = new Date();
    const todayStr = referenceDate.toISOString().split('T')[0];

    let results = this.salesRecords.filter((record) => {
      const recordDate = new Date(`${record.date}T12:00:00Z`);

      // 1. Period Filter
      if (period === 'today') {
        if (record.date !== todayStr) return false;
      } else if (period === 'this_week') {
        // Last 7 days
        const sevenDaysAgo = new Date(referenceDate);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (recordDate < sevenDaysAgo || recordDate > referenceDate) return false;
      } else if (period === 'this_month') {
        // Last 30 days
        const thirtyDaysAgo = new Date(referenceDate);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (recordDate < thirtyDaysAgo || recordDate > referenceDate) return false;
      } else if (period === 'this_quarter') {
        // Last 90 days
        const ninetyDaysAgo = new Date(referenceDate);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        if (recordDate < ninetyDaysAgo || recordDate > referenceDate) return false;
      } else if (period === 'custom') {
        if (customStartDate && record.date < customStartDate) return false;
        if (customEndDate && record.date > customEndDate) return false;
      }

      // 2. Sales Rep / Team Filter
      if (salesRep !== 'All Reps' && record.salesRep !== salesRep) {
        return false;
      }
      if (salesTeam !== 'All Teams' && record.salesTeam !== salesTeam) {
        return false;
      }

      // 3. Approval Status Filter
      if (approvalStatus !== 'All Statuses' && record.approvalStatus !== approvalStatus) {
        return false;
      }

      // 4. Category Filter
      if (category !== 'All Categories' && record.category !== category) {
        return false;
      }

      return true;
    });

    // Product Sort Filter (Best Selling vs Most Discounted)
    if (productSort === 'best_selling') {
      results.sort((a, b) => b.netAmount - a.netAmount);
    } else if (productSort === 'most_discounted') {
      results.sort((a, b) => b.discountPercent - a.discountPercent);
    } else {
      // Default sort: latest date first
      results.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return results;
  }

  /**
   * Aggregate high-level executive performance KPIs
   */
  getPerformanceKPIs(records = []) {
    const totalCount = records.length;
    if (totalCount === 0) {
      return {
        totalGross: 0,
        totalNet: 0,
        totalWonGross: 0,
        totalWonNet: 0,
        avgDiscount: 0,
        totalDiscountGiven: 0,
        avgMargin: 0,
        winRate: 0,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        topRep: 'N/A',
        topRepWonVolume: 0,
      };
    }

    const totalGross = records.reduce((sum, r) => sum + r.grossAmount, 0);
    const totalNet = records.reduce((sum, r) => sum + r.netAmount, 0);

    const approvedDeals = records.filter((r) => r.approvalStatus === 'Approved');
    const approvedCount = approvedDeals.length;
    const pendingCount = records.filter((r) => r.approvalStatus === 'Pending Approval').length;
    const rejectedCount = records.filter((r) => r.approvalStatus === 'Rejected').length;

    const totalWonGross = approvedDeals.reduce((sum, r) => sum + r.grossAmount, 0);
    const totalWonNet = approvedDeals.reduce((sum, r) => sum + r.netAmount, 0);

    const avgDiscount = records.reduce((sum, r) => sum + r.discountPercent, 0) / totalCount;
    const totalDiscountGiven = totalGross - totalNet;
    const avgMargin = records.reduce((sum, r) => sum + (r.marginPercent || 25), 0) / totalCount;

    const winRate = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

    // Calculate top rep by won volume
    const repWonMap = {};
    approvedDeals.forEach((d) => {
      repWonMap[d.salesRep] = (repWonMap[d.salesRep] || 0) + d.netAmount;
    });

    let topRep = 'N/A';
    let topRepWonVolume = 0;
    Object.entries(repWonMap).forEach(([rep, vol]) => {
      if (vol > topRepWonVolume) {
        topRepWonVolume = vol;
        topRep = rep;
      }
    });

    return {
      totalGross,
      totalNet,
      totalWonGross,
      totalWonNet,
      avgDiscount: Math.round(avgDiscount * 10) / 10,
      totalDiscountGiven,
      avgMargin: Math.round(avgMargin * 10) / 10,
      winRate: Math.round(winRate * 10) / 10,
      approvedCount,
      pendingCount,
      rejectedCount,
      topRep,
      topRepWonVolume,
      totalCount,
    };
  }

  /**
   * Performance breakdown per Sales Rep & Team
   */
  getRepPerformanceBreakdown(records = []) {
    const map = {};
    records.forEach((r) => {
      if (!map[r.salesRep]) {
        map[r.salesRep] = {
          rep: r.salesRep,
          team: r.salesTeam,
          totalDeals: 0,
          wonDeals: 0,
          quotedVolume: 0,
          wonVolume: 0,
          totalDiscount: 0,
        };
      }
      map[r.salesRep].totalDeals += 1;
      map[r.salesRep].quotedVolume += r.netAmount;
      map[r.salesRep].totalDiscount += r.discountPercent;
      if (r.approvalStatus === 'Approved') {
        map[r.salesRep].wonDeals += 1;
        map[r.salesRep].wonVolume += r.netAmount;
      }
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        avgDiscount: Math.round((item.totalDiscount / item.totalDeals) * 10) / 10,
        winRate: Math.round((item.wonDeals / item.totalDeals) * 100),
      }))
      .sort((a, b) => b.wonVolume - a.wonVolume);
  }

  /**
   * Product Performance: Best Selling & Most Discounted Items
   */
  getProductPerformanceBreakdown(records = []) {
    const map = {};
    records.forEach((r) => {
      if (!map[r.productName]) {
        map[r.productName] = {
          productName: r.productName,
          category: r.category,
          dealsCount: 0,
          totalUnits: 0,
          grossRevenue: 0,
          netRevenue: 0,
          discountSum: 0,
          maxDiscount: 0,
        };
      }
      map[r.productName].dealsCount += 1;
      map[r.productName].totalUnits += r.quantity;
      map[r.productName].grossRevenue += r.grossAmount;
      map[r.productName].netRevenue += r.netAmount;
      map[r.productName].discountSum += r.discountPercent;
      if (r.discountPercent > map[r.productName].maxDiscount) {
        map[r.productName].maxDiscount = r.discountPercent;
      }
    });

    return Object.values(map).map((item) => ({
      ...item,
      avgDiscount: Math.round((item.discountSum / item.dealsCount) * 10) / 10,
    }));
  }

  /**
   * Export records to spreadsheet CSV / XLS format
   */
  exportToCSV(records = [], filterSummary = '') {
    if (!records || records.length === 0) {
      alert('No sales records match the current filters to export.');
      return;
    }

    const headers = [
      'Quotation ID',
      'Date',
      'Customer',
      'Sales Rep',
      'Sales Team',
      'Category',
      'Product Name',
      'Quantity',
      'Gross Amount (₹)',
      'Discount %',
      'Net Amount (₹)',
      'Approval Status',
      'Margin (%)',
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.date}"`,
      `"${(r.customer || '').replace(/"/g, '""')}"`,
      `"${r.salesRep}"`,
      `"${r.salesTeam}"`,
      `"${r.category}"`,
      `"${(r.productName || '').replace(/"/g, '""')}"`,
      r.quantity,
      r.grossAmount.toFixed(2),
      `${r.discountPercent}%`,
      r.netAmount.toFixed(2),
      `"${r.approvalStatus}"`,
      `${r.marginPercent || 25}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `DealFlow360_Sales_Performance_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Launch executive printable PDF view
   */
  exportToPDF() {
    window.print();
  }
}

const reportService = new ReportService();
export default reportService;
