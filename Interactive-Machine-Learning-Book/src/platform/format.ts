export function formatNumber(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) throw new RangeError('Display values must be finite; undefined states need a reason');
  return (Number(value.toFixed(decimals)) + 0).toLocaleString('en-US', { maximumFractionDigits: decimals, useGrouping: false }).replace('-', '−');
}
