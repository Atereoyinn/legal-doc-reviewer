const CURRENCY_SYMBOLS = ['£', '$', '₦', '€'];
const NUMERIC_FIELDS = [
  'purchase_price',
  'salary',
  'rent',
  'deposit',
  'term_length',
];

export function formatPrice(price) {
  if (price === null || price === undefined || price === '') {
    return '';
  }
  const num = Number(price);
  if (!Number.isFinite(num)) {
    return String(price);
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatFieldName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatFieldValue(key, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (NUMERIC_FIELDS.includes(key)) {
    return formatPrice(value);
  }
  return String(value);
}

export function normalizeCurrency(value) {
  if (!value || typeof value !== 'string') {
    return value;
  }
  const cleaned = value
    .trim()
    .replace(new RegExp(`[${CURRENCY_SYMBOLS.join('')}]`, 'g'), '')
    .replace(/,/g, '');

  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}
