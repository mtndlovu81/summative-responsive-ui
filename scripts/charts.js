import { getCatColor } from './ui.js';
import { escapeHTML } from './search.js';

function formatCurrency(amount, code = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
}

// ── Donut Chart ──

function describeArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const toRad = deg => (deg - 90) * Math.PI / 180;
  const p = (r, a) => [cx + r * Math.cos(toRad(a)), cy + r * Math.sin(toRad(a))];
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const [x1, y1] = p(rOuter, startAngle);
  const [x2, y2] = p(rOuter, endAngle);
  const [x3, y3] = p(rInner, endAngle);
  const [x4, y4] = p(rInner, startAngle);
  return `M${x1},${y1} A${rOuter},${rOuter} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${rInner},${rInner} 0 ${large} 0 ${x4},${y4}Z`;
}

export function renderDonut(filtered, settings) {
  const svg = document.getElementById('donut-svg');
  const legend = document.getElementById('donut-legend');
  const desc = document.getElementById('donut-desc');

  // Clear previous content but keep <title> and <desc>
  svg.querySelectorAll('path, text, circle').forEach(el => el.remove());
  legend.innerHTML = '';

  // Group by category
  const catTotals = {};
  filtered.forEach(r => { catTotals[r.category] = (catTotals[r.category] ?? 0) + r.amount; });

  const total = Object.values(catTotals).reduce((s, v) => s + v, 0);

  // Empty state
  if (total === 0) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    Object.entries({ cx: 110, cy: 110, r: 80, fill: 'none', stroke: 'var(--color-unused)', 'stroke-width': 28 })
      .forEach(([k, v]) => circle.setAttribute(k, v));
    svg.appendChild(circle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    Object.entries({ x: 110, y: 114, 'text-anchor': 'middle', fill: 'var(--color-muted)', 'font-family': 'Inter', 'font-size': '14' })
      .forEach(([k, v]) => text.setAttribute(k, v));
    text.textContent = 'No data';
    svg.appendChild(text);

    desc.textContent = 'No spending data available';
    return;
  }

  // Draw slices
  let startAngle = 0;
  const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const gap = 1.5;

  entries.forEach(([cat, amount], i) => {
    const pct = amount / total;
    const sweep = pct * 360 - gap;
    if (sweep <= 0) return;
    const endAngle = startAngle + sweep;
    const color = getCatColor(cat);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', describeArc(110, 110, 80, 52, startAngle, endAngle));
    path.setAttribute('fill', color);
    path.setAttribute('role', 'img');
    path.setAttribute('aria-label', `${cat}: ${formatCurrency(amount, settings.baseCurrency)} (${Math.round(pct * 100)}%)`);
    path.setAttribute('tabindex', '0');
    path.style.transition = 'transform 0.2s ease';
    path.style.transformOrigin = '110px 110px';
    path.style.cursor = 'pointer';
    path.style.animationDelay = `${i * 50}ms`;

    path.addEventListener('mouseenter', () => { path.style.transform = 'scale(1.05)'; });
    path.addEventListener('mouseleave', () => { path.style.transform = 'scale(1)'; });
    path.addEventListener('focus', () => { path.style.transform = 'scale(1.05)'; });
    path.addEventListener('blur', () => { path.style.transform = 'scale(1)'; });

    svg.appendChild(path);
    startAngle = endAngle + gap;

    // Legend item
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="legend-swatch" style="background:${color}" aria-hidden="true"></span>
      <span class="legend-cat">${escapeHTML(cat)}</span>
      <span class="legend-amt mono">${formatCurrency(amount, settings.baseCurrency)}</span>
    `;
    legend.appendChild(li);
  });

  // Centre text
  const amountText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  Object.entries({ x: 110, y: 104, 'text-anchor': 'middle', fill: 'var(--color-text)', 'font-family': "'JetBrains Mono', monospace", 'font-size': '18', 'font-weight': '700' })
    .forEach(([k, v]) => amountText.setAttribute(k, v));
  amountText.textContent = formatCurrency(total, settings.baseCurrency);
  svg.appendChild(amountText);

  const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  Object.entries({ x: 110, y: 122, 'text-anchor': 'middle', fill: 'var(--color-muted)', 'font-family': 'Inter', 'font-size': '12' })
    .forEach(([k, v]) => labelText.setAttribute(k, v));
  labelText.textContent = 'spent';
  svg.appendChild(labelText);

  desc.textContent = `Total spending: ${formatCurrency(total, settings.baseCurrency)} across ${entries.length} categories`;
}

// ── Line Graph ──

export function renderLineGraph(filtered, settings) {
  const svg = document.getElementById('line-svg');
  const desc = document.getElementById('line-desc');
  const caption = document.getElementById('line-caption');

  // Clear previous content
  svg.querySelectorAll('line, polyline, polygon, circle, text, rect, g').forEach(el => el.remove());

  const timeline = settings.dashboardTimeline ?? '30';
  const buckets = buildBuckets(filtered, timeline);

  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const w = 600 - pad.left - pad.right;
  const h = 220 - pad.top - pad.bottom;

  const maxSpend = Math.max(...buckets.map(b => b.total), 1);
  const yMax = maxSpend * 1.2;

  const xStep = buckets.length > 1 ? w / (buckets.length - 1) : w / 2;

  // Gridlines + Y-axis labels
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + h - (i / 4) * h;
    const val = (i / 4) * yMax;

    const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({ x1: pad.left, y1: y, x2: pad.left + w, y2: y, stroke: 'var(--color-border)', 'stroke-width': 0.5 })
      .forEach(([k, v]) => gridLine.setAttribute(k, v));
    svg.appendChild(gridLine);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    Object.entries({ x: pad.left - 8, y: y + 4, 'text-anchor': 'end', fill: 'var(--color-muted)', 'font-family': "'JetBrains Mono', monospace", 'font-size': '10' })
      .forEach(([k, v]) => label.setAttribute(k, v));
    label.textContent = `$${Math.round(val)}`;
    svg.appendChild(label);
  }

  // X-axis labels
  buckets.forEach((b, i) => {
    const x = pad.left + (buckets.length > 1 ? i * xStep : w / 2);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    Object.entries({ x, y: pad.top + h + 20, 'text-anchor': 'middle', fill: 'var(--color-muted)', 'font-family': 'Inter', 'font-size': '10' })
      .forEach(([k, v]) => label.setAttribute(k, v));
    label.textContent = b.label;
    svg.appendChild(label);
  });

  // Data points
  const points = buckets.map((b, i) => {
    const x = pad.left + (buckets.length > 1 ? i * xStep : w / 2);
    const y = pad.top + h - (b.total / yMax) * h;
    return { x, y, total: b.total, label: b.label };
  });

  if (points.length > 0) {
    // Area fill
    const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
    const baseY = pad.top + h;
    const areaPoints = `${points[0].x},${baseY} ${polyPoints} ${points[points.length - 1].x},${baseY}`;

    const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    area.setAttribute('points', areaPoints);
    area.setAttribute('fill', 'var(--color-accent)');
    area.setAttribute('opacity', '0.12');
    svg.appendChild(area);

    // Polyline
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', polyPoints);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'var(--color-accent-2)');
    line.setAttribute('stroke-width', '2');
    line.classList.add('line-path');
    svg.appendChild(line);

    // Measure and set line length for animation
    requestAnimationFrame(() => {
      let len = 1000;
      try { len = line.getTotalLength(); } catch {};
      line.style.setProperty('--line-length', len);
      line.setAttribute('stroke-dasharray', len);
      line.setAttribute('stroke-dashoffset', len);
      line.style.animation = 'none';
      line.offsetHeight; // reflow
      line.style.animation = '';
    });

    // Data circles + hover tooltips
    points.forEach(p => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      Object.entries({ cx: p.x, cy: p.y, r: 4, fill: 'var(--color-accent)', 'tabindex': '0' })
        .forEach(([k, v]) => circle.setAttribute(k, v));
      circle.setAttribute('aria-label', `${p.label}: ${formatCurrency(p.total, settings.baseCurrency)}`);

      // Hover rect for pointer events
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      Object.entries({ x: p.x - 15, y: pad.top, width: 30, height: h, fill: 'transparent', style: 'cursor:pointer' })
        .forEach(([k, v]) => hitArea.setAttribute(k, v));

      // Tooltip group
      const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      tooltip.style.display = 'none';

      const tooltipBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const tooltipText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const tooltipContent = `${p.label}: ${formatCurrency(p.total, settings.baseCurrency)}`;

      Object.entries({ x: p.x - 40, y: p.y - 30, width: 80, height: 22, rx: 4, fill: 'var(--color-surface-2)', stroke: 'var(--color-border)', 'stroke-width': 1 })
        .forEach(([k, v]) => tooltipBg.setAttribute(k, v));
      Object.entries({ x: p.x, y: p.y - 15, 'text-anchor': 'middle', fill: 'var(--color-text)', 'font-family': "'JetBrains Mono', monospace", 'font-size': '10' })
        .forEach(([k, v]) => tooltipText.setAttribute(k, v));
      tooltipText.textContent = tooltipContent;

      tooltip.appendChild(tooltipBg);
      tooltip.appendChild(tooltipText);

      const show = () => { tooltip.style.display = ''; };
      const hide = () => { tooltip.style.display = 'none'; };

      hitArea.addEventListener('mouseenter', show);
      hitArea.addEventListener('mouseleave', hide);
      circle.addEventListener('focus', show);
      circle.addEventListener('blur', hide);

      svg.appendChild(hitArea);
      svg.appendChild(circle);
      svg.appendChild(tooltip);
    });
  }

  // Budget line
  const budget = settings.monthlyBudget || 0;
  if (budget > 0 && budget <= yMax) {
    const budgetY = pad.top + h - (budget / yMax) * h;

    const budgetLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({ x1: pad.left, y1: budgetY, x2: pad.left + w, y2: budgetY, stroke: 'var(--color-danger)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' })
      .forEach(([k, v]) => budgetLine.setAttribute(k, v));
    svg.appendChild(budgetLine);

    const budgetLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    Object.entries({ x: pad.left + w, y: budgetY - 6, 'text-anchor': 'end', fill: 'var(--color-danger)', 'font-family': "'JetBrains Mono', monospace", 'font-size': '10' })
      .forEach(([k, v]) => budgetLabel.setAttribute(k, v));
    budgetLabel.textContent = `${formatCurrency(budget, settings.baseCurrency)} limit`;
    svg.appendChild(budgetLabel);
  }

  // Accessibility summary
  const totalSpend = filtered.reduce((s, r) => s + r.amount, 0);
  const peak = buckets.reduce((max, b) => b.total > max.total ? b : max, { total: 0, label: '' });
  const summaryText = `Spending over ${getTimelineLabel(timeline)}: total ${formatCurrency(totalSpend, settings.baseCurrency)}, peak ${peak.label} ${formatCurrency(peak.total, settings.baseCurrency)}`;
  desc.textContent = summaryText;
  caption.textContent = summaryText;
}

function getTimelineLabel(timeline) {
  const labels = { '7': 'past week', '30': 'past month', '90': 'past 90 days', '365': 'this year', 'all': 'all time' };
  return labels[timeline] || 'selected period';
}

function buildBuckets(records, timeline) {
  const now = new Date();
  const buckets = [];

  if (timeline === '7') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      buckets.push({ key, label, total: 0 });
    }
    records.forEach(r => {
      const b = buckets.find(b => b.key === r.date);
      if (b) b.total += r.amount;
    });
  } else if (timeline === '30') {
    for (let w = 0; w < 4; w++) {
      buckets.push({ label: `Week ${w + 1}`, total: 0, weekStart: w * 7, weekEnd: (w + 1) * 7 });
    }
    records.forEach(r => {
      const daysAgo = Math.floor((now - new Date(r.date)) / 86400000);
      const weekIdx = Math.min(3, 3 - Math.floor(daysAgo / 7));
      if (weekIdx >= 0 && weekIdx < 4) buckets[weekIdx].total += r.amount;
    });
  } else if (timeline === '90') {
    for (let m = 2; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, label, total: 0 });
    }
    records.forEach(r => {
      const key = r.date.slice(0, 7);
      const b = buckets.find(b => b.key === key);
      if (b) b.total += r.amount;
    });
  } else if (timeline === '365') {
    for (let m = 0; m < 12; m++) {
      const d = new Date(now.getFullYear(), m, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`;
      buckets.push({ key, label, total: 0 });
    }
    records.forEach(r => {
      const key = r.date.slice(0, 7);
      const b = buckets.find(b => b.key === key);
      if (b) b.total += r.amount;
    });
  } else {
    // All time — bucket per month or per year
    if (records.length === 0) return buckets;
    const dates = records.map(r => new Date(r.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const spanYears = maxDate.getFullYear() - minDate.getFullYear();

    if (spanYears < 2) {
      let d = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1);
      while (d < end) {
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        buckets.push({ key, label, total: 0 });
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
      records.forEach(r => {
        const key = r.date.slice(0, 7);
        const b = buckets.find(b => b.key === key);
        if (b) b.total += r.amount;
      });
    } else {
      for (let y = minDate.getFullYear(); y <= maxDate.getFullYear(); y++) {
        buckets.push({ key: String(y), label: String(y), total: 0 });
      }
      records.forEach(r => {
        const key = r.date.slice(0, 4);
        const b = buckets.find(b => b.key === key);
        if (b) b.total += r.amount;
      });
    }
  }

  return buckets;
}
