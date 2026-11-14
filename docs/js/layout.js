/* =====================================================================
   TutorCircle - layout.js
   Sidebar (different menu for each role - FR-02) and small helpers
   shared by every page.
   ===================================================================== */

const MENUS = {
  learner: [
    { href: 'find-sessions.html', label: 'Find sessions' },
    { href: 'my-bookings.html', label: 'My bookings' },
    { href: 'my-learning.html', label: 'My learning' },
    { href: 'notifications.html', label: 'Notifications', round: true },
  ],
  tutor: [
    { href: 'my-sessions.html', label: 'My sessions' },
    { href: 'create-session.html', label: 'Create session' },
    { href: 'my-profile.html', label: 'My profile' },
    { href: 'notifications.html', label: 'Notifications', round: true },
  ],
  coordinator: [
    { href: 'coordinator.html', label: 'Dashboard' },
    { href: 'find-sessions.html', label: 'Browse sessions' },
    { href: 'notifications.html', label: 'Notifications', round: true },
  ],
  admin: [
    { href: 'admin.html', label: 'Accounts' },
    { href: 'coordinator.html', label: 'Coordinator dashboard' },
    { href: 'find-sessions.html', label: 'Browse sessions' },
    { href: 'notifications.html', label: 'Notifications', round: true },
  ],
};

function homeFor(role) {
  return MENUS[role][0].href;
}

// Call at the top of every page. Sends visitors who are not logged in
// (or whose role may not use this page) somewhere else.
function initPage(feature) {
  const user = getCurrentUser();
  if (!user) {
    location.href = 'index.html';
    return null;
  }
  if (feature && !canAccess(user.role, feature)) {
    location.href = homeFor(user.role);
    return null;
  }
  if (user.role === 'learner') runDueReminders(user.id);
  renderSidebar(user);
  return user;
}

function renderSidebar(user) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const active = document.body.dataset.nav || location.pathname.split('/').pop();
  const unread = countUnread(user.id);
  const links = MENUS[user.role].map(item => `
    <a href="${item.href}" class="${item.href === active ? 'active' : ''}">
      <span class="nav-icon ${item.round ? 'round' : ''}"></span>
      ${item.label}
      ${item.round && unread ? `<span class="nav-count">${unread}</span>` : ''}
    </a>`).join('');

  sidebar.innerHTML = `
    <a class="brand" href="${homeFor(user.role)}">
      <span class="brand-logo">TC</span>
      <span><span class="brand-name">TutorCircle</span><span class="brand-role">${user.role}</span></span>
    </a>
    <nav class="nav">${links}</nav>
    <div class="sidebar-user">
      <span class="avatar">${initials(user.name)}</span>
      <div>
        <div class="sidebar-name">${escapeHtml(user.name)}</div>
        <a href="#" class="sidebar-link" id="logout-link">Log out</a>
      </div>
    </div>`;

  document.getElementById('logout-link').addEventListener('click', e => {
    e.preventDefault();
    logOut();
    location.href = 'index.html';
  });
}

/* ---------- small helpers ---------- */

function $(selector, root = document) {
  return root.querySelector(selector);
}

// Always use this before putting user text into innerHTML (stops HTML injection)
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function initials(name) {
  return String(name).split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function fmtDate(iso) {      // "Sun 18 Oct"
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtLongDate(iso) {  // "Sun 18 Oct 2026"
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShortDate(iso) { // "18 Oct"
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fmtTime(date) {     // "4:00 PM"
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtTimeRange(session) { // "4:00-5:00 PM"
  const start = new Date(session.dateTime);
  const end = new Date(start.getTime() + session.duration * 60000);
  return `${fmtTime(start)}–${fmtTime(end)}`;
}

function fmtWhen(session) {  // "Sun 18 Oct, 4:00-5:00 PM"
  return `${fmtDate(session.dateTime)}, ${fmtTimeRange(session)}`;
}

function fmtDateTime(iso) {
  return `${fmtShortDate(iso)}, ${fmtTime(new Date(iso))}`;
}

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function typeLabel(session) {
  return session.type === 'individual' ? '1-to-1' : 'Group';
}

function formatLabel(session) {
  return session.format === 'online' ? 'Online' : 'In person';
}

function placeLabel(session) {
  return session.format === 'online' ? 'Online link' : session.locationOrLink;
}

function seatsBadge(session) {
  if (session.remaining <= 0) return '<span class="badge badge-red">Full</span>';
  const kind = session.remaining === 1 ? 'badge-amber' : 'badge-outline';
  const word = session.remaining === 1 ? 'place' : 'places';
  return `<span class="badge ${kind}">${session.remaining} of ${session.capacity} ${word} left</span>`;
}

function showAlert(container, message, type = 'error') {
  container.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function clearAlert(container) {
  container.innerHTML = '';
}

// Runs an action; shows its error message instead of crashing
function tryAction(action, alertBox, successMessage) {
  try {
    const result = action();
    if (successMessage) showAlert(alertBox, successMessage, 'success');
    else clearAlert(alertBox);
    return result ?? true;
  } catch (err) {
    showAlert(alertBox, err.message, 'error');
    return false;
  }
}
