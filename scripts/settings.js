import { validate } from './validators.js';

export function initSettings() {
  const rateInputs = document.querySelectorAll('.currency-rate');
  rateInputs.forEach(input => {
    input.addEventListener('input', () => {
      const msg = validate('rate', input.value);
      input.style.borderColor = msg ? 'var(--color-danger)' : 'var(--color-border)';
      const errEl = input.closest('.currency-row').querySelector('.field-error');
      if (errEl) errEl.textContent = msg || '';
    });
  });
}
