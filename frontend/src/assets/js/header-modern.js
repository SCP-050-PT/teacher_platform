/**
 * Шапка: активный пункт + выпадающее меню профиля
 * Вставить в <script> каждой страницы (или один раз в общий файл)
 * Требует: localStorage user { name|full_name|username, role }
 * и функцию logout()
 */

(function initHeaderModern() {
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }

  function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function roleLabel(role) {
    if (role === 'admin') return 'Администратор';
    if (role === 'teacher') return 'Учитель';
    return role || 'Пользователь';
  }

  function markActiveNav() {
    const path = (location.pathname || '').split('/').pop() || 'index.html';
    document.querySelectorAll('.header-modern .nav-link').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      const isList =
        (path === 'orientir-list.html' && href === 'orientir-uroka.html') ||
        (path === 'ipr-list.html' && href === 'ipr.html');
      a.classList.toggle('active', href === path || isList);
    });
  }

  function fillUserChip() {
    const user = getUser();
    const name = user.fullName || user.full_name || user.username || 'Пользователь';

    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const avEl = document.getElementById('userAvatar');
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = roleLabel(user.role);
    if (avEl) avEl.textContent = initials(name);

    const adminLink = document.getElementById('navAdmin');
    if (adminLink) {
      adminLink.style.display = user.role === 'admin' ? 'flex' : 'none';
    }
    document.querySelectorAll('.admin-only').forEach((el) => {
      if (user.role === 'admin') {
        el.style.display = el.tagName === 'A' ? 'inline-flex' : '';
      }
    });
  }

  function setupDropdown() {
    const chip = document.getElementById('userChip');
    const dropdown = document.getElementById('userDropdown');
    if (!chip || !dropdown) return;

    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle('is-open');
      chip.classList.toggle('is-open', open);
      chip.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('is-open');
      chip.classList.remove('is-open');
      chip.setAttribute('aria-expanded', 'false');
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  function run() {
    markActiveNav();
    fillUserChip();
    setupDropdown();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
