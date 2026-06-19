import { validate } from './validators.js';
import { exportJSON, validateImport } from './storage.js';
import * as state from './state.js';

function announce(message, priority = 'polite') {
  const el = document.getElementById('live-region');
  if (!el) return;
  el.setAttribute('aria-live', priority);
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = message; });
}

export function initSettings() {
  // Currency rate validation
  const rateInputs = document.querySelectorAll('.currency-rate');
  rateInputs.forEach(input => {
    input.addEventListener('input', () => {
      const msg = validate('rate', input.value);
      input.style.borderColor = msg ? 'var(--color-danger)' : 'var(--color-border)';
      const errEl = input.closest('.currency-row').querySelector('.field-error');
      if (errEl) errEl.textContent = msg || '';
    });
  });

  // Export JSON
  document.getElementById('btn-export').addEventListener('click', () => {
    if (state.records.length === 0) {
      announce('No transactions to export');
      return;
    }
    exportJSON(state.records);
    announce('Transactions exported');
  });

  // Load Seed Data
  document.getElementById('btn-load-seed').addEventListener('click', async () => {
    if (!confirm('Replace all current records with seed data?')) return;
    try {
      const res = await fetch('seed.json');
      const data = await res.json();
      if (!validateImport(data)) {
        announce('Seed data is invalid', 'assertive');
        return;
      }
      state.replaceAll(data);
      announce(`Loaded ${data.length} seed transactions`);
    } catch {
      announce('Failed to load seed data', 'assertive');
    }
  });

  // Import JSON
  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!validateImport(data)) {
          announce('Invalid file: check that all records have valid fields', 'assertive');
          return;
        }
        if (!confirm(`Replace all records with ${data.length} imported transactions?`)) return;
        state.replaceAll(data);
        announce(`Imported ${data.length} transactions`);
      } catch {
        announce('Invalid JSON file', 'assertive');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
}
