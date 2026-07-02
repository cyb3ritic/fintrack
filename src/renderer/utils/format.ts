/**
 * Format a number as Indian Rupees (INR - ₹)
 */
export function formatINR(value: number, includeDecimals = false): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(value);
}

/**
 * Format a date string (YYYY-MM-DD) into a user-friendly format
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Formats a raw percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
}
