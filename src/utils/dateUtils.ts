export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getYesterdayString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[monthIndex]} ${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

export const isThisWeek = (dateStr: string): boolean => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
};

export const isThisMonth = (dateStr: string): boolean => {
  const now = new Date();
  const date = new Date(dateStr);
  return now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth();
};
