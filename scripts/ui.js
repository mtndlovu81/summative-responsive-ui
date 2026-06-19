import { highlight, escapeHTML } from './search.js';

export function renderTable(records, regex, settings) {
  const tbody = document.getElementById('records-body');
  const caption = document.getElementById('table-caption');
  const emptyState = document.getElementById('empty-state');
  const table = document.getElementById('records-table');

  tbody.innerHTML = '';

  if (records.length === 0) {
    table.classList.add('hidden');
    emptyState.classList.remove('hidden');
    caption.textContent = 'No transactions found';
    return;
  }

  table.classList.remove('hidden');
  emptyState.classList.add('hidden');
  caption.textContent = `Showing ${records.length} transaction${records.length !== 1 ? 's' : ''}`;

  records.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'record-row';
    tr.dataset.id = r.id;

    const catColor = getCatColor(r.category);
    const descHTML = highlight(r.description, regex);
    const converted = settings && settings.showConverted && settings.convertToCurrency
      ? getConvertedHTML(r.amount, settings)
      : '';

    tr.innerHTML = `
      <td data-label="Date">${escapeHTML(r.date)}</td>
      <td data-label="Description">${descHTML}</td>
      <td data-label="Category"><span class="category-badge" style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}44">${escapeHTML(r.category)}</span></td>
      <td data-label="Amount"><span class="mono">$${escapeHTML(r.amount.toFixed(2))}</span>${converted}</td>
      <td data-label="Actions">
        <button class="btn-edit" data-id="${r.id}" aria-label="Edit ${escapeHTML(r.description)}">Edit</button>
        <button class="btn-delete" data-id="${r.id}" aria-label="Delete ${escapeHTML(r.description)}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function getConvertedHTML(amount, settings) {
  const currency = settings.currencies.find(c => c.code === settings.convertToCurrency);
  if (!currency) return '';
  const converted = (amount * currency.rate).toFixed(2);
  return ` <span class="amount-converted mono muted">${currency.code} ${converted}</span>`;
}

export function sortRecords(records, field, direction) {
  return [...records].sort((a, b) => {
    let cmp;
    if (field === 'date') {
      cmp = a.date.localeCompare(b.date);
    } else if (field === 'description') {
      cmp = a.description.localeCompare(b.description);
    } else if (field === 'amount') {
      cmp = a.amount - b.amount;
    } else {
      cmp = 0;
    }
    return direction === 'asc' ? cmp : -cmp;
  });
}

function getCatColor(category) {
  const map = {
    food: 'var(--cat-food)', books: 'var(--cat-books)',
    transport: 'var(--cat-transport)', entertainment: 'var(--cat-entertainment)',
    fees: 'var(--cat-fees)', other: 'var(--cat-other)'
  };
  return map[category.toLowerCase()] || 'var(--cat-custom-1)';
}

export function announce(message, priority = 'polite') {
  const el = document.getElementById('live-region');
  if (!el) return;
  el.setAttribute('aria-live', priority);
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = message; });
}
