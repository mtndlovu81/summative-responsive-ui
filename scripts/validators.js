export const RULES = {
  description: {
    pattern: /^\S(?:.*\S)?$/,
    message: 'No leading or trailing spaces allowed'
  },
  amount: {
    pattern: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
    message: 'Enter a valid amount e.g. 12 or 12.50'
  },
  date: {
    pattern: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    message: 'Use YYYY-MM-DD format'
  },
  category: {
    pattern: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
    message: 'Letters, spaces, and hyphens only'
  },
  rate: {
    pattern: /^(0|[1-9]\d*)(\.\d{1,6})?$/,
    message: 'Enter a valid exchange rate'
  },
  budget: {
    pattern: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
    message: 'Enter a valid budget amount'
  }
};

export const DUPLICATE_WORD_RE = /\b(\w+)\s+\1\b/i;

export function compileRegex(input, flags = 'i') {
  try {
    return input ? new RegExp(input, flags) : null;
  } catch {
    return null;
  }
}

export function validate(field, value) {
  const rule = RULES[field];
  if (!rule) return null;
  return rule.pattern.test(value) ? null : rule.message;
}

export function validateDate(value) {
  const formatErr = validate('date', value);
  if (formatErr) return formatErr;

  const today = new Date();
  const yearStart = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().slice(0, 10);

  if (value < yearStart) return `Date must be in ${today.getFullYear()}`;
  if (value > todayStr) return 'Future dates are not allowed';
  return null;
}

export function hasDuplicateWord(text) {
  return DUPLICATE_WORD_RE.test(text);
}
