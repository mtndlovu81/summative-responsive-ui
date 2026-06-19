import { highlight, escapeHTML } from './search.js';
import { renderDonut, renderLineGraph } from './charts.js';

// ── Utilities ──

export function getCatColor(category) {
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

export function focusEl(selector) {
  requestAnimationFrame(() => {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    el?.focus();
  });
}

function formatCurrency(amount, code = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
}

// ── Timeline Filter ──

export function filterByTimeline(records, timeline) {
  if (timeline === 'all') return records;
  if (timeline === '365') {
    const yearStart = `${new Date().getFullYear()}-01-01`;
    return records.filter(r => r.date >= yearStart);
  }
  const days = parseInt(timeline, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return records.filter(r => new Date(r.date) >= cutoff);
}

function getTimelineLabel(timeline) {
  const labels = { '7': 'past week', '30': 'past month', '90': 'past 90 days', '365': 'this year', 'all': 'all time' };
  return labels[timeline] || 'selected period';
}

// ── Dashboard Orchestrator ──

export function renderDashboard(records, settings) {
  const timeline = settings.dashboardTimeline ?? '30';
  const filtered = filterByTimeline(records, timeline);
  renderStatCards(filtered, records, settings, timeline);
  renderCategoryBars(filtered, settings);
  renderDonut(filtered, settings);
  renderLineGraph(filtered, settings);
}

// ── Stat Cards ──

function renderStatCards(filtered, allRecords, settings, timeline) {
  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const count = filtered.length;

  document.getElementById('stat-total').textContent = formatCurrency(total, settings.baseCurrency);
  document.getElementById('stat-total-sub').textContent = 'in ' + getTimelineLabel(timeline);

  document.getElementById('stat-count').textContent = String(count);
  document.getElementById('stat-count-sub').textContent = getTimelineLabel(timeline);

  // Top category
  const catTotals = {};
  filtered.forEach(r => { catTotals[r.category] = (catTotals[r.category] ?? 0) + r.amount; });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('stat-top-cat').textContent = topCat ? topCat[0] : '—';
  document.getElementById('stat-top-amount').textContent = topCat ? formatCurrency(topCat[1], settings.baseCurrency) : '';

  // Budget remaining — always based on current month's spending
  const budgetDD = document.getElementById('stat-budget-remaining');
  const budgetSub = document.getElementById('stat-budget-sub');
  const budget = settings.monthlyBudget || 0;
  if (budget > 0) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthSpent = allRecords
      .filter(r => r.date.startsWith(monthKey))
      .reduce((s, r) => s + r.amount, 0);
    const remaining = budget - monthSpent;
    budgetDD.textContent = formatCurrency(Math.abs(remaining), settings.baseCurrency);
    if (remaining >= 0) {
      budgetDD.className = 'mono ok';
      budgetSub.textContent = 'remaining this month';
    } else {
      budgetDD.className = 'mono over';
      budgetSub.textContent = 'over budget this month';
    }
  } else {
    budgetDD.textContent = '—';
    budgetDD.className = 'mono';
    budgetSub.textContent = 'no budget set';
  }
}

// ── Category Progress Bars ──

function renderCategoryBars(filtered, settings) {
  const container = document.getElementById('category-bars');
  container.innerHTML = '';

  const { categories, categoryBudgets } = settings;

  const spendMap = {};
  filtered.forEach(r => { spendMap[r.category] = (spendMap[r.category] ?? 0) + r.amount; });

  const allCats = new Set([...categories, ...Object.keys(spendMap)]);

  allCats.forEach(cat => {
    const spent = spendMap[cat] ?? 0;
    const budget = categoryBudgets[cat] ?? 0;
    const hasBudget = budget > 0;

    let fillPct, overPct, srText;

    if (!hasBudget) {
      fillPct = spent > 0 ? 100 : 0;
      overPct = 0;
      srText = `${cat}: spent ${formatCurrency(spent, settings.baseCurrency)}, no budget set`;
    } else if (spent <= budget) {
      fillPct = (spent / budget) * 100;
      overPct = 0;
      const remaining = budget - spent;
      srText = `${cat}: spent ${formatCurrency(spent, settings.baseCurrency)} of ${formatCurrency(budget, settings.baseCurrency)} budget, ${Math.round(fillPct)}% used, ${formatCurrency(remaining, settings.baseCurrency)} remaining`;
    } else {
      fillPct = 100;
      const overage = spent - budget;
      overPct = Math.min((overage / budget) * 100, 30);
      srText = `${cat}: over budget by ${formatCurrency(overage, settings.baseCurrency)}`;
      announce(`${cat} is over budget by ${formatCurrency(overage, settings.baseCurrency)}`, 'assertive');
    }

    const catColor = getCatColor(cat);
    const pctLabel = hasBudget ? `${Math.round(spent / budget * 100)}%` : '';
    const amountLabel = hasBudget
      ? `${formatCurrency(spent, settings.baseCurrency)} / ${formatCurrency(budget, settings.baseCurrency)}`
      : `${formatCurrency(spent, settings.baseCurrency)} (no limit)`;

    const row = document.createElement('div');
    row.className = 'cat-bar-row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', `${cat} spending`);
    row.innerHTML = `
      <div class="cat-bar-header">
        <span class="cat-dot" style="background:${catColor}" aria-hidden="true"></span>
        <span class="cat-name">${escapeHTML(cat)}</span>
        <span class="cat-amounts mono">${amountLabel}</span>
        <span class="cat-pct">${pctLabel}</span>
      </div>
      <div class="cat-bar-track" aria-hidden="true">
        <div class="cat-bar-fill" style="--bar-target:${fillPct}%;width:${fillPct}%;background:${catColor}"></div>
        ${overPct > 0 ? `<div class="cat-bar-over" style="--bar-target:${overPct}%;width:${overPct}%"></div>` : ''}
      </div>
      <p class="sr-only">${srText}</p>
    `;
    container.appendChild(row);
  });
}

// ── Transactions Table ──

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
