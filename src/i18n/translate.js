import translations from './translations.json';

const normalize = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

export function translate(language, value, ...values) {
  if (Array.isArray(value) && Object.hasOwn(value, 'raw')) {
    return value.map((part, index) => translate(language, part) + (index < values.length ? translate(language, values[index]) : '')).join('');
  }
  if (typeof value !== 'string' || language === 'ko') return value;

  const key = normalize(value);
  const entry = translations[key];

  if (entry && entry[language]) {
    const matchStart = value.match(/^\s*/)?.[0] || '';
    const matchEnd = value.match(/\s*$/)?.[0] || '';
    return matchStart + entry[language] + matchEnd;
  }

  // Fallback to English if Japanese or Chinese is missing
  if (entry && entry.en && language !== 'en') {
    const matchStart = value.match(/^\s*/)?.[0] || '';
    const matchEnd = value.match(/\s*$/)?.[0] || '';
    return matchStart + entry.en + matchEnd;
  }

  return value;
}
