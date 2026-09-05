/**
 * formatters.js — Data formatting utilities for DealFlow360
 */

/**
 * Format a number as USD currency (compact for large values)
 * @param {number} value
 * @param {boolean} compact - Use compact notation (e.g. $4.8M)
 */
export function formatCurrency(value, compact = false) {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with thousands separators
 * @param {number} value
 */
export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a percentage value
 * @param {number} value - e.g. 28.6 → "28.6%"
 * @param {number} decimals
 */
export function formatPercent(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format trend value with sign
 * @param {number} value
 * @param {string} format - 'currency' | 'percent' | 'number'
 */
export function formatTrend(value, format = 'percent') {
  const sign = value > 0 ? '+' : '';
  if (format === 'currency') return `${sign}${formatCurrency(value, true)}`;
  if (format === 'number') return `${sign}${value}`;
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Format a KPI value by its format type
 * @param {number} value
 * @param {'currency'|'number'|'percent'} format
 * @param {boolean} compact
 */
export function formatKpiValue(value, format, compact = true) {
  switch (format) {
    case 'currency':
      return formatCurrency(value, compact);
    case 'percent':
      return formatPercent(value);
    case 'number':
    default:
      return formatNumber(value);
  }
}

/**
 * Format chart Y-axis values compactly
 * @param {number} value
 */
export function formatChartValue(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

/**
 * Get current date formatted nicely
 */
export function getFormattedDate() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}
