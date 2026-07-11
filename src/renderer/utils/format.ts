const localeMap: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

/**
 * Format a number dynamically based on selected currency code
 */
export function formatCurrency(value: number, currencyCode = 'INR', includeDecimals = false): string {
  const locale = localeMap[currencyCode] || 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(value);
}

/**
 * Format a number as Indian Rupees (INR - ₹) (retained for backward compatibility)
 */
export function formatINR(value: number, includeDecimals = false): string {
  return formatCurrency(value, 'INR', includeDecimals);
}

/**
 * Format a date string (YYYY-MM-DD) into a user-friendly format
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // Parse date-only YYYY-MM-DD manually to construct a local timezone Date object
  // and prevent day-shifting in negative timezone offsets (e.g. UTC-5).
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }

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
