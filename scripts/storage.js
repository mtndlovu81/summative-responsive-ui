export const RECORDS_KEY = 'set:records';
export const SETTINGS_KEY = 'set:settings';

export function load(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); }
  catch { return null; }
}

export function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function exportJSON(records) {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `set-export-${new Date().toISOString().slice(0, 10)}.json`
  });
  a.click();
  URL.revokeObjectURL(url);
}

export function validateImport(data) {
  if (!Array.isArray(data)) return false;
  const ids = new Set();
  return data.every(r => {
    if (ids.has(r.id)) return false;
    ids.add(r.id);
    return (
      typeof r.id === 'string' &&
      typeof r.description === 'string' &&
      typeof r.amount === 'number' && isFinite(r.amount) && r.amount >= 0 &&
      typeof r.category === 'string' &&
      typeof r.date === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(r.date) &&
      typeof r.createdAt === 'string'
    );
  });
}
