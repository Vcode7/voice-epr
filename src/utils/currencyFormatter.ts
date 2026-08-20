export const formatCurrency = (amount: number, symbol: string = '₹'): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol}0`;
  }
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`;
};
