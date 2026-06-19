import * as state from './state.js';
import { initForm, startEdit } from './forms.js';
import { initSettings } from './settings.js';
import { renderTable, sortRecords, announce, renderDashboard } from './ui.js';
import { compileRegex } from './validators.js';
import { filterByRegex } from './search.js';

const sections = document.querySelectorAll('main > section');
const navLinks = document.querySelectorAll('.nav-link');
const indicator = document.querySelector('.nav-indicator');
let currentSection = 'dashboard';

let sortField = 'date';
let sortDirection = 'desc';
let currentRegex = null;

function navigateTo(sectionId) {
  sections.forEach(s => { s.hidden = true; });
  const target = document.getElementById(sectionId);
  if (target) target.hidden = false;

  navLinks.forEach(a => {
    a.setAttribute('aria-current', a.dataset.section === sectionId ? 'page' : 'false');
  });

  currentSection = sectionId;
  updateNavIndicator(sectionId);

  if (sectionId === 'transactions') refreshTable();
  if (sectionId === 'dashboard') renderDashboard(state.records, state.settings);
}

function updateNavIndicator(sectionId) {
  let activeLink;
  if (sectionId === 'dashboard' && !location.hash) {
    activeLink = document.querySelector('.nav-link[data-home]');
  }
  activeLink = activeLink || document.querySelector(`.nav-link[data-section="${sectionId}"]:not([data-home])`);
  if (!activeLink || !indicator) return;

  const nav = activeLink.closest('ul');
  if (!nav) return;

  const navRect = nav.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();

  indicator.style.setProperty('--indicator-left', `${linkRect.left - navRect.left}px`);
  indicator.style.setProperty('--indicator-width', `${linkRect.width}px`);
}

function refreshTable() {
  let filtered = filterByRegex(state.records, currentRegex);
  let sorted = sortRecords(filtered, sortField, sortDirection);
  renderTable(sorted, currentRegex, state.settings);
}

// Nav
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const section = link.dataset.section;
    if (!section) return;
    navigateTo(section);
    if (link.dataset.home) {
      history.pushState(null, '', location.pathname);
    } else {
      history.pushState(null, '', `#${section}`);
    }
  });
});

window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1) || 'dashboard';
  navigateTo(hash);
});

window.addEventListener('resize', () => updateNavIndicator(currentSection));

// Search
const searchInput = document.getElementById('search-input');
const searchCI = document.getElementById('search-ci');
const searchError = document.getElementById('search-error');

function handleSearch() {
  const val = searchInput.value.trim();
  if (!val) {
    currentRegex = null;
    searchError.classList.add('hidden');
    searchError.textContent = '';
    refreshTable();
    return;
  }
  const flags = searchCI.checked ? 'i' : '';
  const re = compileRegex(val, flags);
  if (!re) {
    searchError.textContent = 'Invalid regex pattern';
    searchError.classList.remove('hidden');
    currentRegex = null;
    refreshTable();
    return;
  }
  searchError.classList.add('hidden');
  searchError.textContent = '';
  currentRegex = re;
  refreshTable();
}

searchInput.addEventListener('input', handleSearch);
searchCI.addEventListener('change', handleSearch);

// Search chips
document.querySelectorAll('.search-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    searchInput.value = chip.dataset.pattern;
    handleSearch();
    searchInput.focus();
  });
});

// Sort
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const field = btn.dataset.sort;
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = field === 'description' ? 'asc' : 'desc';
    }

    document.querySelectorAll('.sort-btn').forEach(b => {
      b.setAttribute('aria-pressed', b.dataset.sort === sortField ? 'true' : 'false');
    });

    const arrows = { date: sortDirection === 'asc' ? '↑' : '↓', description: sortDirection === 'asc' ? 'A→Z' : 'Z→A', amount: sortDirection === 'asc' ? '↑' : '↓' };
    btn.textContent = `${field.charAt(0).toUpperCase() + field.slice(1)} ${arrows[field]}`;

    refreshTable();
  });
});

// Edit / Delete delegation
document.getElementById('records-body').addEventListener('click', e => {
  const editBtn = e.target.closest('.btn-edit');
  const deleteBtn = e.target.closest('.btn-delete');

  if (editBtn) {
    const record = state.records.find(r => r.id === editBtn.dataset.id);
    if (record) {
      startEdit(record);
      navigateTo('add');
      history.pushState(null, '', '#add');
    }
  }

  if (deleteBtn) {
    const record = state.records.find(r => r.id === deleteBtn.dataset.id);
    if (record && confirm(`Delete "${record.description}"?`)) {
      state.deleteRecord(record.id);
      refreshTable();
      announce('Transaction deleted');
    }
  }
});

// Timeline picker
document.querySelectorAll('.timeline-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.timeline-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    state.updateSettings({ dashboardTimeline: btn.dataset.timeline });
    renderDashboard(state.records, state.settings);
  });
});

// State changes
state.subscribe(event => {
  if (event.type === 'records-changed') {
    if (currentSection === 'transactions') refreshTable();
    if (currentSection === 'dashboard') renderDashboard(state.records, state.settings);
  }
  if (event.type === 'settings-changed' && currentSection === 'dashboard') {
    renderDashboard(state.records, state.settings);
  }
});

// Init
state.init();

initForm(() => {
  navigateTo('transactions');
  history.pushState(null, '', '#transactions');
});

initSettings();

// Set initial timeline button
const activeTimeline = state.settings.dashboardTimeline ?? '30';
document.querySelectorAll('.timeline-btn').forEach(b => {
  b.setAttribute('aria-pressed', b.dataset.timeline === activeTimeline ? 'true' : 'false');
});

const startHash = location.hash.slice(1) || 'dashboard';
navigateTo(startHash);

console.log('SFT loaded');
