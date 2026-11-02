export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0đ';
  // Use vi-VN to format with dot as thousands separator
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + 'đ';
};

export const formatShortVND = (value) => {
  if (!value || Math.abs(value) < 1) return '0đ';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace('.0', '') + ' tỷ';
  }
  if (abs >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  }
  if (abs >= 1_000) {
    return (value / 1_000).toFixed(0) + 'k';
  }
  return String(Math.round(value)) + 'đ';
};
