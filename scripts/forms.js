import { validate, validateDate, hasDuplicateWord, formatAmount } from './validators.js';
import * as state from './state.js';

let editId = null;

export function initForm(onSave) {
  const form = document.getElementById('transaction-form');
  const descInput = document.getElementById('f-description');
  const amountInput = document.getElementById('f-amount');
  const categorySelect = document.getElementById('f-category');
  const dateInput = document.getElementById('f-date');
  const cancelBtn = document.getElementById('form-cancel');
  const heading = document.getElementById('add-heading');
  const submitBtn = document.getElementById('form-submit');
  const warnDup = document.getElementById('warn-duplicate');

  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;
  dateInput.value = today;
  dateInput.max = today;
  dateInput.min = yearStart;

  populateCategories(categorySelect);

  descInput.addEventListener('input', () => {
    showFieldError('description', descInput.value);
    warnDup.classList.toggle('hidden', !hasDuplicateWord(descInput.value));
  });

  amountInput.addEventListener('input', () => {
    showFieldError('amount', amountInput.value);
  });

  amountInput.addEventListener('blur', () => {
    if (!validate('amount', amountInput.value)) {
      amountInput.value = formatAmount(amountInput.value);
    }
  });

  dateInput.addEventListener('change', () => {
    showDateError(dateInput.value);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();

    const fields = {
      description: descInput.value,
      amount: amountInput.value,
      date: dateInput.value,
      category: categorySelect.value
    };

    const errors = [];
    for (const [field, value] of Object.entries(fields)) {
      const msg = field === 'date' ? showDateError(value) : showFieldError(field, value);
      if (msg) errors.push(field);
    }

    if (errors.length) {
      announce(`${errors.length} error${errors.length > 1 ? 's' : ''} found`);
      document.getElementById(`f-${errors[0]}`)?.focus();
      return;
    }

    const now = new Date().toISOString();
    if (editId) {
      state.updateRecord(editId, {
        description: fields.description,
        amount: parseFloat(fields.amount),
        category: fields.category,
        date: fields.date
      });
    } else {
      state.addRecord({
        id: state.generateId(),
        description: fields.description,
        amount: parseFloat(fields.amount),
        category: fields.category,
        date: fields.date,
        createdAt: now,
        updatedAt: now
      });
    }

    announce('Transaction saved');
    clearForm();
    if (onSave) onSave();
  });

  cancelBtn.addEventListener('click', () => {
    const prevId = editId;
    clearForm();
    if (onSave) onSave(prevId);
  });

  function clearForm() {
    editId = null;
    form.reset();
    dateInput.value = today;
    heading.textContent = 'Add Transaction';
    submitBtn.textContent = 'Save Transaction';
    cancelBtn.classList.add('hidden');
    warnDup.classList.add('hidden');
    ['description', 'amount', 'date', 'category'].forEach(f => {
      const el = document.getElementById(`err-${f}`);
      if (el) el.textContent = '';
    });
  }
}

export function startEdit(record) {
  editId = record.id;
  document.getElementById('f-description').value = record.description;
  document.getElementById('f-amount').value = record.amount.toFixed(2);
  document.getElementById('f-category').value = record.category;
  document.getElementById('f-date').value = record.date;
  document.getElementById('add-heading').textContent = 'Edit Transaction';
  document.getElementById('form-submit').textContent = 'Update Transaction';
  document.getElementById('form-cancel').classList.remove('hidden');
  document.getElementById('f-description').focus();
}

export function populateCategories(select) {
  if (!select) select = document.getElementById('f-category');
  const current = select.value;
  select.innerHTML = '';
  state.settings.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  if (current && [...select.options].some(o => o.value === current)) {
    select.value = current;
  }
}

function showFieldError(field, value) {
  const errEl = document.getElementById(`err-${field}`);
  if (!errEl) return null;
  const msg = validate(field, value);
  errEl.textContent = msg || '';
  return msg;
}

function showDateError(value) {
  const errEl = document.getElementById('err-date');
  if (!errEl) return null;
  const msg = validateDate(value);
  errEl.textContent = msg || '';
  return msg;
}

function announce(message, priority = 'polite') {
  const el = document.getElementById('live-region');
  if (!el) return;
  el.setAttribute('aria-live', priority);
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = message; });
}
