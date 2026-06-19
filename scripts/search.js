export function highlight(text, re) {
  if (!re) return escapeHTML(text);
  let result = '';
  let lastIndex = 0;
  const safeRe = new RegExp(re.source, re.flags.replace('g', '') + 'g');
  let match;
  while ((match = safeRe.exec(text)) !== null) {
    result += escapeHTML(text.slice(lastIndex, match.index));
    result += `<mark>${escapeHTML(match[0])}</mark>`;
    lastIndex = safeRe.lastIndex;
    if (match[0].length === 0) { safeRe.lastIndex++; }
  }
  return result + escapeHTML(text.slice(lastIndex));
}

export function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function filterByRegex(records, re) {
  if (!re) return records;
  return records.filter(r => re.test(r.description) || re.test(r.category));
}
