// Admin accounts page - FR-01 (admins create coordinator/admin accounts), FR-02
(function () {
  const user = initPage('admin');
  if (!user) return;

  const alertBox = $('#alert');
  const roleBadge = {
    learner: 'badge', tutor: 'badge badge-green', coordinator: 'badge badge-amber', admin: 'badge badge-navy',
  };

  function renderUsers() {
    const filter = $('#role-filter').value;
    const users = listUsers().filter(u => filter === 'all' || u.role === filter);
    $('#user-count').textContent = users.length;
    $('#users').innerHTML = `
      <table class="table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
        <tbody>${users.map(u => `<tr>
          <td><div class="row"><span class="avatar">${initials(u.name)}</span>${escapeHtml(u.name)}</div></td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="${roleBadge[u.role]}" style="text-transform:capitalize">${u.role}</span></td>
          <td>${fmtShortDate(u.createdAt)}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  }

  $('#role-filter').addEventListener('change', renderUsers);

  $('#create-form').addEventListener('submit', e => {
    e.preventDefault();
    const created = tryAction(() => registerUser($('#c-name').value, $('#c-email').value, $('#c-password').value, $('#c-role').value),
      alertBox);
    if (created) {
      showAlert(alertBox, `${created.name} can now log in as ${created.role}.`, 'success');
      e.target.reset();
      renderUsers();
    }
  });

  $('#reset-btn').addEventListener('click', () => {
    if (!confirm('Delete every change and restore the demo data? You will be logged out.')) return;
    resetDB();
    location.href = 'index.html';
  });

  renderUsers();
})();
