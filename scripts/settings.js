import { validate } from './validators.js';
import { exportJSON, validateImport } from './storage.js';
import { escapeHTML } from './search.js';
import { getCatColor } from './ui.js';
import { populateCategories } from './forms.js';
import * as state from './state.js';

function announce(message, priority = 'polite') {
  const el = document.getElementById('live-region');
  if (!el) return;
  el.setAttribute('aria-live', priority);
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = message; });
}

function formatCurrency(amount, code = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
}

// ── Budget Table ──

function renderBudgetTable() {
  const tbody = document.getElementById('budget-body');
  const totalOutput = document.getElementById('total-budget');
  tbody.innerHTML = '';

  const { categories, categoryBudgets } = state.settings;

  categories.forEach(cat => {
    const budget = categoryBudgets[cat] ?? 0;
    const isOther = cat === 'Other';
    const color = getCatColor(cat);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="cat-dot" style="background:${color}" aria-hidden="true"></span>
        ${isOther
          ? `<span>${escapeHTML(cat)}</span> <span class="other-label">(catch-all)</span>`
          : `<input type="text" class="budget-cat-input" value="${escapeHTML(cat)}" data-original="${escapeHTML(cat)}" aria-label="Category name">`
        }
      </td>
      <td>
        <input type="text" class="budget-amt-input mono" value="${budget.toFixed(2)}" inputmode="decimal" aria-label="${escapeHTML(cat)} budget amount" data-cat="${escapeHTML(cat)}">
        <p class="field-error" role="alert"></p>
      </td>
      <td>
        ${isOther ? '' : `<button class="btn-remove-budget" data-cat="${escapeHTML(cat)}" aria-label="Remove ${escapeHTML(cat)} budget">&times;</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateTotalBudget(totalOutput);
  attachBudgetListeners();
}

function updateTotalBudget(outputEl) {
  if (!outputEl) outputEl = document.getElementById('total-budget');
  const total = Object.values(state.settings.categoryBudgets)
    .reduce((s, v) => s + (parseFloat(v) || 0), 0);
  outputEl.textContent = formatCurrency(total, state.settings.baseCurrency);
}

function attachBudgetListeners() {
  // Budget amount changes
  document.querySelectorAll('.budget-amt-input').forEach(input => {
    input.addEventListener('change', () => {
      const msg = validate('budget', input.value);
      const errEl = input.closest('td').querySelector('.field-error');
      if (errEl) errEl.textContent = msg || '';
      input.style.borderColor = msg ? 'var(--color-danger)' : 'var(--color-border)';

      if (!msg) {
        const cat = input.dataset.cat;
        const newBudgets = { ...state.settings.categoryBudgets, [cat]: parseFloat(input.value) };
        state.updateSettings({ categoryBudgets: newBudgets });
        updateTotalBudget();
        announce(`${cat} budget updated`);
      }
    });
  });

  // Category name changes
  document.querySelectorAll('.budget-cat-input').forEach(input => {
    input.addEventListener('change', () => {
      const msg = validate('category', input.value);
      if (msg) {
        announce(msg, 'assertive');
        input.value = input.dataset.original;
        return;
      }

      const oldName = input.dataset.original;
      const newName = input.value.trim();

      if (oldName === newName) return;

      // Check duplicates
      if (state.settings.categories.some(c => c.toLowerCase() === newName.toLowerCase() && c !== oldName)) {
        announce('Category already exists', 'assertive');
        input.value = oldName;
        return;
      }

      // Update categories list
      const newCategories = state.settings.categories.map(c => c === oldName ? newName : c);

      // Update budgets map
      const newBudgets = {};
      for (const [cat, val] of Object.entries(state.settings.categoryBudgets)) {
        newBudgets[cat === oldName ? newName : cat] = val;
      }

      // Update any records using old category
      const affected = state.records.filter(r => r.category === oldName);
      affected.forEach(r => {
        state.updateRecord(r.id, { category: newName });
      });

      state.updateSettings({ categories: newCategories, categoryBudgets: newBudgets });
      populateCategories();
      renderBudgetTable();
      announce(`Renamed "${oldName}" to "${newName}"${affected.length ? `, ${affected.length} transaction${affected.length > 1 ? 's' : ''} updated` : ''}`);
    });
  });

  // Remove budget item
  document.querySelectorAll('.btn-remove-budget').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const affected = state.records.filter(r => r.category === cat);

      if (affected.length > 0) {
        if (!confirm(`${affected.length} transaction${affected.length > 1 ? 's' : ''} use "${cat}". They will be moved to "Other". Continue?`)) return;
        affected.forEach(r => {
          state.updateRecord(r.id, { category: 'Other' });
        });
      } else {
        if (!confirm(`Remove "${cat}" budget item?`)) return;
      }

      const newCategories = state.settings.categories.filter(c => c !== cat);
      const newBudgets = { ...state.settings.categoryBudgets };
      delete newBudgets[cat];

      state.updateSettings({ categories: newCategories, categoryBudgets: newBudgets });
      populateCategories();
      renderBudgetTable();
      announce(`Removed "${cat}" budget`);
    });
  });
}

// ── Add Budget Item ──

function initAddBudget() {
  document.getElementById('btn-add-budget').addEventListener('click', () => {
    const tbody = document.getElementById('budget-body');

    // Check if there's already an unsaved new row
    if (tbody.querySelector('.new-budget-row')) {
      tbody.querySelector('.new-budget-row .budget-cat-input')?.focus();
      return;
    }

    const tr = document.createElement('tr');
    tr.className = 'new-budget-row';
    tr.innerHTML = `
      <td>
        <input type="text" class="budget-cat-input" placeholder="Category name" aria-label="New category name">
      </td>
      <td>
        <input type="text" class="budget-amt-input mono" placeholder="0.00" inputmode="decimal" aria-label="Budget amount">
        <p class="field-error" role="alert"></p>
      </td>
      <td>
        <button class="btn-save-new-budget" aria-label="Save new budget item">✓</button>
        <button class="btn-cancel-new-budget" aria-label="Cancel">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);

    const catInput = tr.querySelector('.budget-cat-input');
    const amtInput = tr.querySelector('.budget-amt-input');
    const errEl = tr.querySelector('.field-error');

    catInput.focus();

    tr.querySelector('.btn-save-new-budget').addEventListener('click', () => {
      const catName = catInput.value.trim();
      const amount = amtInput.value.trim();

      const catErr = validate('category', catName);
      if (catErr) {
        errEl.textContent = catErr;
        catInput.focus();
        return;
      }

      if (state.settings.categories.some(c => c.toLowerCase() === catName.toLowerCase())) {
        errEl.textContent = 'Category already exists';
        catInput.focus();
        return;
      }

      const amtErr = validate('budget', amount || '0');
      if (amtErr) {
        errEl.textContent = amtErr;
        amtInput.focus();
        return;
      }

      const newCategories = [...state.settings.categories];
      // Insert before "Other"
      const otherIdx = newCategories.indexOf('Other');
      if (otherIdx >= 0) {
        newCategories.splice(otherIdx, 0, catName);
      } else {
        newCategories.push(catName);
      }

      const newBudgets = { ...state.settings.categoryBudgets, [catName]: parseFloat(amount) || 0 };

      state.updateSettings({ categories: newCategories, categoryBudgets: newBudgets });
      populateCategories();
      renderBudgetTable();
      announce(`Added "${catName}" budget`);
    });

    tr.querySelector('.btn-cancel-new-budget').addEventListener('click', () => {
      tr.remove();
    });
  });
}

// ── Currency ──

function initCurrencySettings() {
  // Rate validation
  document.querySelectorAll('.currency-rate').forEach(input => {
    input.addEventListener('input', () => {
      const msg = validate('rate', input.value);
      input.style.borderColor = msg ? 'var(--color-danger)' : 'var(--color-border)';
      const errEl = input.closest('.currency-row').querySelector('.field-error');
      if (errEl) errEl.textContent = msg || '';
    });
  });

  // Save currencies
  document.getElementById('btn-save-currencies').addEventListener('click', () => {
    const rows = document.querySelectorAll('.currency-row');
    const currencies = [];
    let hasError = false;

    rows.forEach(row => {
      const codeInput = row.querySelector('.currency-code');
      const codeLabel = row.querySelector('.currency-label');
      const rateInput = row.querySelector('.currency-rate');
      const errEl = row.querySelector('.field-error');

      const code = (codeInput?.value || codeLabel?.textContent || '').trim().toUpperCase();
      const rate = rateInput.value.trim();

      if (!code && !rate) return;

      if (!code) {
        if (errEl) errEl.textContent = 'Enter a currency code';
        hasError = true;
        return;
      }

      const rateErr = validate('rate', rate);
      if (rateErr) {
        if (errEl) errEl.textContent = rateErr;
        rateInput.style.borderColor = 'var(--color-danger)';
        hasError = true;
        return;
      }

      currencies.push({ code, rate: parseFloat(rate) });
    });

    if (hasError) {
      announce('Fix currency errors before saving', 'assertive');
      return;
    }

    state.updateSettings({ currencies });
    updateConvertSelect(currencies);
    announce('Currencies saved');
  });

  // Show converted toggle
  const showConverted = document.getElementById('s-show-converted');
  const convertRow = document.getElementById('convert-select-row');

  showConverted.checked = state.settings.showConverted || false;
  convertRow.classList.toggle('hidden', !showConverted.checked);

  showConverted.addEventListener('change', () => {
    convertRow.classList.toggle('hidden', !showConverted.checked);
    state.updateSettings({ showConverted: showConverted.checked });
  });

  // Convert-to select
  const convertSelect = document.getElementById('s-convert-to');
  updateConvertSelect(state.settings.currencies);
  if (state.settings.convertToCurrency) {
    convertSelect.value = state.settings.convertToCurrency;
  }

  convertSelect.addEventListener('change', () => {
    state.updateSettings({ convertToCurrency: convertSelect.value });
  });
}

function updateConvertSelect(currencies) {
  const select = document.getElementById('s-convert-to');
  const current = select.value;
  select.innerHTML = '';
  currencies.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = `${c.code} (${c.rate})`;
    select.appendChild(opt);
  });
  if (current && [...select.options].some(o => o.value === current)) {
    select.value = current;
  }
}

// ── Data (Import / Export / Seed) ──

function initDataSettings() {
  document.getElementById('btn-export').addEventListener('click', () => {
    if (state.records.length === 0) {
      announce('No transactions to export');
      return;
    }
    exportJSON(state.records);
    announce('Transactions exported');
  });

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

// ── Init ──

export function initSettings() {
  renderBudgetTable();
  initAddBudget();
  initCurrencySettings();
  initDataSettings();
}
