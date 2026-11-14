// My sessions page (tutor)
(function () {
  const user = initPage('mySessions');
  if (!user) return;

  const profile = loadDB().tutorProfiles.find(p => p.tutorId === user.id);
  if (!profile || profile.status !== 'approved') {
    showAlert($('#alert'), 'Your tutor application is waiting for coordinator approval. Complete it in My profile – once approved you can create sessions.', 'info');
  }

  const sessions = listTutorSessions(user.id);
  const groups = [
    { title: 'Upcoming', list: sessions.filter(s => s.status === 'published' && !hasStarted(s)) },
    { title: 'Drafts', list: sessions.filter(s => s.status === 'draft') },
    { title: 'Past', list: sessions.filter(s => s.status === 'published' && hasStarted(s)).reverse() },
    { title: 'Cancelled', list: sessions.filter(s => s.status === 'cancelled') },
  ];

  function row(s) {
    const status = s.status === 'draft' ? '<span class="badge badge-amber">Draft</span>'
      : s.status === 'cancelled' ? '<span class="badge badge-red">Cancelled</span>'
      : hasStarted(s) ? '<span class="badge badge-outline">Finished</span>'
      : '<span class="badge badge-green">Published</span>';
    const canEdit = s.status !== 'cancelled' && !hasStarted(s);
    return `
      <article class="result">
        <div class="result-body">
          <a class="result-title" href="workspace.html?id=${s.id}">${escapeHtml(s.title)}</a>
          <div class="meta">${escapeHtml(s.subject)} · ${fmtWhen(s)} · ${escapeHtml(placeLabel(s))}</div>
          <div class="badges">
            ${status}
            <span class="badge">${typeLabel(s)}</span>
            <span class="badge">${formatLabel(s)}</span>
            <span class="badge badge-outline">${s.bookedCount} of ${s.capacity} booked</span>
          </div>
        </div>
        <div class="row">
          ${canEdit ? `<a class="btn btn-outline" href="create-session.html?edit=${s.id}">Edit</a>` : ''}
          <a class="btn" href="workspace.html?id=${s.id}">Workspace</a>
        </div>
      </article>`;
  }

  $('#page').innerHTML = groups
    .filter(g => g.list.length || g.title === 'Upcoming')
    .map(g => `
      <section>
        <h2 class="mb-16">${g.title} (${g.list.length})</h2>
        <div class="stack-sm">${g.list.length ? g.list.map(row).join('') : '<div class="empty">No upcoming sessions. <a href="create-session.html">Create one</a></div>'}</div>
      </section>`).join('');
})();
