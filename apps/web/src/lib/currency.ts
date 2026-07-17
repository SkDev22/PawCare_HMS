const CURRENCY = 'LKR';
const LOCALE = 'en-LK';

export function formatCurrency(amount: number | string, options?: Intl.NumberFormatOptions): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    ...options,
  }).format(Number.isFinite(value) ? value : 0);
}
