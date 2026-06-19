const sections = document.querySelectorAll('main > section');
const navLinks = document.querySelectorAll('.nav-link');
const indicator = document.querySelector('.nav-indicator');
let currentSection = 'dashboard';

function navigateTo(sectionId) {
  sections.forEach(s => { s.hidden = true; });
  const target = document.getElementById(sectionId);
  if (target) target.hidden = false;

  navLinks.forEach(a => {
    a.setAttribute('aria-current', a.dataset.section === sectionId ? 'page' : 'false');
  });

  currentSection = sectionId;
  updateNavIndicator(sectionId);
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

const startHash = location.hash.slice(1) || 'dashboard';
navigateTo(startHash);

console.log('SFT loaded');
