// Notifications page - booking confirmations, reminders (FR-09) and workspace updates
(function () {
  const user = initPage('notifications');
  if (!user) return;

  const list = listNotifications(user.id);
  $('#page').innerHTML = list.length ? list.map(n => `
    <div class="notice">
      <span class="${n.read ? 'dot-read' : 'dot-unread'}"></span>
      <div style="flex:1">
        <div style="${n.read ? '' : 'font-weight:600'}">${escapeHtml(n.text)}</div>
        <div class="small muted">${fmtDateTime(n.at)}</div>
      </div>
      ${n.link ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(n.link)}">Open</a>` : ''}
    </div>`).join('') : '<p class="muted">You have no notifications yet.</p>';

  // Everything on screen has now been seen
  markNotificationsRead(user.id);
  renderSidebar(user);
})();
