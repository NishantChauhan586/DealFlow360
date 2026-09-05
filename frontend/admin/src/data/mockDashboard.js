/**
 * mockDashboard.js
 * Isolated mock data for the Dashboard page.
 * Replace these with real API responses when the backend is ready.
 * DO NOT import this directly into layout/shell components.
 */

/* ── KPI Metrics ─────────────────────────────────────────────── */
export const kpiMetrics = [
  {
    id: 'pipeline',
    label: 'Total Pipeline',
    value: 4820000,
    format: 'currency',
    trend: +12.4,
    trendPeriod: 'vs last month',
    icon: 'TrendingUp',
    color: 'accent',
  },
  {
    id: 'active-deals',
    label: 'Active Deals',
    value: 84,
    format: 'number',
    trend: +7,
    trendPeriod: 'vs last month',
    icon: 'Briefcase',
    color: 'info',
  },
  {
    id: 'won-revenue',
    label: 'Won Revenue',
    value: 1340000,
    format: 'currency',
    trend: +18.2,
    trendPeriod: 'vs last month',
    icon: 'DollarSign',
    color: 'success',
  },
  {
    id: 'conversion',
    label: 'Conversion Rate',
    value: 28.6,
    format: 'percent',
    trend: +2.1,
    trendPeriod: 'vs last month',
    icon: 'Target',
    color: 'warning',
  },
  {
    id: 'closing-soon',
    label: 'Closing This Month',
    value: 13,
    format: 'number',
    trend: -2,
    trendPeriod: 'vs last month',
    icon: 'Clock',
    color: 'danger',
  },
];

/* ── Pipeline Stages ─────────────────────────────────────────── */
export const pipelineStages = [
  {
    id: 'lead',
    label: 'Lead',
    dealCount: 42,
    value: 920000,
    color: '#6366f1',
  },
  {
    id: 'qualified',
    label: 'Qualified',
    dealCount: 28,
    value: 840000,
    color: '#3b82f6',
  },
  {
    id: 'discovery',
    label: 'Discovery',
    dealCount: 19,
    value: 760000,
    color: '#06b6d4',
  },
  {
    id: 'proposal',
    label: 'Proposal',
    dealCount: 14,
    value: 1100000,
    color: '#f59e0b',
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    dealCount: 8,
    value: 640000,
    color: '#f97316',
  },
  {
    id: 'won',
    label: 'Won',
    dealCount: 22,
    value: 1340000,
    color: '#10b981',
  },
];

/* ── Revenue Trend (12 months) ───────────────────────────────── */
export const revenueTrendData = [
  { month: 'Oct', pipeline: 2800000, won: 680000 },
  { month: 'Nov', pipeline: 3100000, won: 780000 },
  { month: 'Dec', pipeline: 2600000, won: 520000 },
  { month: 'Jan', pipeline: 3400000, won: 860000 },
  { month: 'Feb', pipeline: 3800000, won: 920000 },
  { month: 'Mar', pipeline: 4100000, won: 1040000 },
  { month: 'Apr', pipeline: 3900000, won: 980000 },
  { month: 'May', pipeline: 4400000, won: 1120000 },
  { month: 'Jun', pipeline: 4200000, won: 1060000 },
  { month: 'Jul', pipeline: 4600000, won: 1200000 },
  { month: 'Aug', pipeline: 4750000, won: 1280000 },
  { month: 'Sep', pipeline: 4820000, won: 1340000 },
];

/* ── Monthly Deals Closed ────────────────────────────────────── */
export const monthlyDealsData = [
  { month: 'Oct', closed: 8, lost: 4 },
  { month: 'Nov', closed: 11, lost: 5 },
  { month: 'Dec', closed: 7, lost: 6 },
  { month: 'Jan', closed: 14, lost: 3 },
  { month: 'Feb', closed: 13, lost: 4 },
  { month: 'Mar', closed: 16, lost: 5 },
  { month: 'Apr', closed: 15, lost: 4 },
  { month: 'May', closed: 18, lost: 3 },
  { month: 'Jun', closed: 17, lost: 5 },
  { month: 'Jul', closed: 21, lost: 4 },
  { month: 'Aug', closed: 20, lost: 3 },
  { month: 'Sep', closed: 22, lost: 4 },
];

/* ── Recent Activity ─────────────────────────────────────────── */
export const recentActivity = [
  {
    id: 'act-1',
    type: 'deal_won',
    title: 'Deal closed — Acme Corp Enterprise',
    description: '$240,000 contract signed',
    user: 'Sarah Chen',
    avatar: 'SC',
    timestamp: '2 minutes ago',
  },
  {
    id: 'act-2',
    type: 'meeting',
    title: 'Discovery call — Vertex Systems',
    description: '45-min call completed, follow-up scheduled',
    user: 'James Park',
    avatar: 'JP',
    timestamp: '34 minutes ago',
  },
  {
    id: 'act-3',
    type: 'proposal',
    title: 'Proposal sent — NovaBuild Inc',
    description: 'Q4 Platform package — $86,000',
    user: 'Mia Torres',
    avatar: 'MT',
    timestamp: '1 hour ago',
  },
  {
    id: 'act-4',
    type: 'stage_change',
    title: 'Deal moved to Negotiation',
    description: 'Greenleaf Holdings — $180,000',
    user: 'Alex Kim',
    avatar: 'AK',
    timestamp: '2 hours ago',
  },
  {
    id: 'act-5',
    type: 'note',
    title: 'Note added — Orion Technologies',
    description: 'Decision maker confirmed, budget approved internally',
    user: 'Sarah Chen',
    avatar: 'SC',
    timestamp: '3 hours ago',
  },
  {
    id: 'act-6',
    type: 'call',
    title: 'Outbound call — Meridian Group',
    description: 'Left voicemail, sent follow-up email',
    user: 'James Park',
    avatar: 'JP',
    timestamp: '5 hours ago',
  },
];

/* ── Upcoming Tasks ──────────────────────────────────────────── */
export const upcomingTasks = [
  {
    id: 'task-1',
    title: 'Send revised proposal to Greenleaf Holdings',
    priority: 'high',
    dueDate: 'Today, 5:00 PM',
    status: 'pending',
    deal: 'Greenleaf Holdings',
  },
  {
    id: 'task-2',
    title: 'Follow up with Acme Corp legal team',
    priority: 'high',
    dueDate: 'Tomorrow, 10:00 AM',
    status: 'pending',
    deal: 'Acme Corp',
  },
  {
    id: 'task-3',
    title: 'Prepare demo for Vertex Systems',
    priority: 'medium',
    dueDate: 'Sep 7, 2:00 PM',
    status: 'in_progress',
    deal: 'Vertex Systems',
  },
  {
    id: 'task-4',
    title: 'Review contract terms — NovaBuild Inc',
    priority: 'medium',
    dueDate: 'Sep 8, EOD',
    status: 'pending',
    deal: 'NovaBuild Inc',
  },
  {
    id: 'task-5',
    title: 'Schedule QBR with Orion Technologies',
    priority: 'low',
    dueDate: 'Sep 10',
    status: 'pending',
    deal: 'Orion Technologies',
  },
];

/* ── AI Insights ─────────────────────────────────────────────── */
export const aiInsights = [
  {
    id: 'ai-1',
    type: 'attention',
    title: 'Deal at risk — Meridian Group',
    description:
      'No activity in 12 days. Decision deadline is Sep 9. Recommend immediate outreach to prevent deal from going cold.',
    action: 'View Deal',
    dealId: 'meridian-group',
  },
  {
    id: 'ai-2',
    type: 'risk',
    title: 'Pipeline concentration risk',
    description:
      '38% of your pipeline value is concentrated in 3 deals. Consider diversifying deal sources to reduce quarter-end exposure.',
    action: 'View Pipeline',
    dealId: null,
  },
  {
    id: 'ai-3',
    type: 'recommendation',
    title: 'Upsell opportunity — Acme Corp',
    description:
      'Acme Corp recently expanded their engineering team by 40%. This signals potential for a seat expansion upgrade worth ~$60,000.',
    action: 'View Account',
    dealId: 'acme-corp',
  },
  {
    id: 'ai-4',
    type: 'observation',
    title: 'Conversion rate improving',
    description:
      'Your Proposal → Won rate increased from 31% to 41% over the last 60 days. Discovery call quality appears to be the primary driver.',
    action: null,
    dealId: null,
  },
];
