// Tutor profile page (Figure 3) - opened from search results
(function () {
  const user = initPage('viewTutorProfile');
  if (!user) return;

  $('#back-link').addEventListener('click', e => { e.preventDefault(); history.back(); });

  const db = loadDB();
  const tutorId = getParam('id') || user.id;
  const profile = db.tutorProfiles.find(p => p.tutorId === tutorId);

  if (!profile || (profile.status !== 'approved' && user.role === 'learner')) {
    showAlert($('#alert'), 'This tutor profile is not available.');
    return;
  }

  const name = userName(db, tutorId);
  const statusBadge = {
    approved: '<span class="badge badge-green">&#10003; Approved by coordinator</span>',
    pending: '<span class="badge badge-amber">Waiting for coordinator approval</span>',
    rejected: '<span class="badge badge-red">Not approved</span>',
  }[profile.status];
  const formatNames = { group: 'Group', individual: '1-to-1', 'in-person': 'In person', online: 'Online' };

  // Subjects: learners only see approved coverage
  const subjects = profile.subjects.filter(s => user.role !== 'learner' || s.status === 'approved');
  const subjectsHtml = subjects.map(s => `
    <div class="mb-16">
      <div class="row-between">
        <strong>${escapeHtml(s.code)} · ${escapeHtml(SUBJECTS[s.code] || '')}</strong>
        ${s.status === 'approved' ? '<span class="badge badge-green">Approved</span>' : '<span class="badge badge-amber">Pending approval</span>'}
      </div>
      <div class="badges">${s.topics.map(t => `<span class="badge badge-outline">${escapeHtml(t)}</span>`).join('')}</div>
    </div>`).join('');

  // Weekly availability grid
  let grid = '<div></div>' + DAYS.map(d => `<div class="avail-head">${d}</div>`).join('');
  SLOTS.forEach(slot => {
    grid += `<div class="avail-label">${slot.replace('-', '–')}</div>`;
    DAYS.forEach(day => {
      const on = (profile.availability[day] || []).includes(slot);
      grid += `<div class="slot ${on ? 'on' : ''}" title="${day} ${slot}: ${on ? 'available' : 'not available'}"></div>`;
    });
  });

  const upcoming = searchSessions('', '').filter(s => s.tutorId === tutorId).length;

  $('#page').innerHTML = `
    <section class="card mb-16">
      <div class="row-between">
        <div class="row" style="gap:18px">
          <span class="avatar avatar-lg">${initials(name)}</span>
          <div>
            <div class="row"><h1 class="page-title">${escapeHtml(name)}</h1>${statusBadge}</div>
            <p class="muted">${escapeHtml(profile.programme)} · Year ${escapeHtml(profile.year)} · Peer tutor since ${new Date(profile.since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
            <div class="badges">${profile.formats.map(f => `<span class="badge badge-outline">${formatNames[f] || f}</span>`).join('')}</div>
          </div>
        </div>
        <a class="btn" href="find-sessions.html?tutor=${tutorId}">See upcoming sessions (${upcoming})</a>
      </div>
    </section>

    <div class="grid-main" style="grid-template-columns:1fr 1fr">
      <div class="stack">
        <section class="card">
          <h2 class="mb-16">Subjects and topics</h2>
          ${subjectsHtml || '<p class="muted">No approved subjects yet.</p>'}
        </section>
        <section class="card">
          <h2 class="mb-16">Experience</h2>
          <p>${escapeHtml(profile.experience)}</p>
        </section>
      </div>
      <section class="card">
        <h2 class="mb-16">Weekly availability</h2>
        <div class="avail">${grid}</div>
        <div class="legend"><span class="on">Available</span><span>Not available</span></div>
      </section>
    </div>`;
})();
