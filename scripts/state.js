import { load, save, RECORDS_KEY, SETTINGS_KEY } from './storage.js';

const DEFAULT_SETTINGS = {
  baseCurrency: 'USD',
  currencies: [
    { code: 'EUR', rate: 0.92 },
    { code: 'GBP', rate: 0.79 },
    { code: 'RWF', rate: 1465.54 }
  ],
  monthlyBudget: 640,
  categoryBudgets: {
    Food: 150, Books: 100, Transport: 80,
    Entertainment: 60, Fees: 200, Other: 50
  },
  categories: ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'],
  dashboardTimeline: '30'
};

export let records = [];
export let settings = {};

const listeners = [];
export function subscribe(fn) { listeners.push(fn); }
function notify(event) { listeners.forEach(fn => fn(event)); }

export function init() {
  records = load(RECORDS_KEY) ?? [];
  settings = deepMerge(DEFAULT_SETTINGS, load(SETTINGS_KEY) ?? {});
}

function deepMerge(defaults, overrides) {
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    result[key] = (typeof overrides[key] === 'object' && !Array.isArray(overrides[key]))
      ? deepMerge(defaults[key] ?? {}, overrides[key])
      : overrides[key];
  }
  return result;
}

export function addRecord(record) {
  records = [record, ...records];
  save(RECORDS_KEY, records);
  notify({ type: 'records-changed' });
}

export function updateRecord(id, changes) {
  records = records.map(r => r.id === id
    ? { ...r, ...changes, updatedAt: new Date().toISOString() } : r);
  save(RECORDS_KEY, records);
  notify({ type: 'records-changed' });
}

export function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  save(RECORDS_KEY, records);
  notify({ type: 'records-changed' });
}

export function replaceAll(newRecords) {
  records = newRecords;
  save(RECORDS_KEY, records);
  notify({ type: 'records-changed' });
}

export function updateSettings(changes) {
  settings = { ...settings, ...changes };
  if (changes.categoryBudgets) {
    settings.monthlyBudget = Object.values(settings.categoryBudgets)
      .reduce((s, v) => s + (parseFloat(v) || 0), 0);
  }
  if (changes.categoryBudgets && !changes.categories) {
    settings.categories = Object.keys(settings.categoryBudgets);
  }
  save(SETTINGS_KEY, settings);
  notify({ type: 'settings-changed' });
}

export function generateId() {
  return 'txn_' + String(Date.now()).slice(-6) + Math.random().toString(36).slice(2, 5);
}
