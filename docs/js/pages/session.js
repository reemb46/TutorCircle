// Session details and booking page (Figure 5) - FR-08 and reminders (FR-09)
(function () {
  const user = initPage('viewSession');
  if (!user) return;

  const alertBox = $('#alert');
  const sessionId = getParam('id');
  if (user.role === 'tutor') { $('#back-link').href = 'my-sessions.html'; $('#back-link').innerHTML = '&larr; Back to my sessions'; }

  function render() {
    let s;
    try { s = viewSessionDetails(sessionId); } catch (err) { showAlert(alertBox, err.message); $('#page').innerHTML = ''; return; }

    const isLearner = user.role === 'learner';
    const isOwner = s.tutorId === user.id;
    if (s.status === 'draft' && !isOwner) { showAlert(alertBox, 'Session not found.'); $('#page').innerHTML = ''; return; }
    const booking = isLearner ? getLearnerBooking(s.id, user.id) : null;
    const started = hasStarted(s);

    // Online link is only shown to people who can join
    const showLink = s.format === 'online' && (booking || isOwner || user.role !== 'learner');
    const place = s.format === 'online'
      ? (showLink ? `<a href="${escapeHtml(s.locationOrLink)}" target="_blank" rel="noopener">Join meeting</a>` : 'Online – link shown after booking')
      : escapeHtml(s.locationOrLink);

    const statusNote = s.status === 'cancelled' ? '<div class="alert alert-error">This session was cancelled by the tutor.</div>'
      : s.status === 'draft' ? '<div class="alert alert-info">This is a draft. Learners cannot see it yet.</div>' : '';

    // ----- left: details -----
    const details = `
      <section class="card">
        ${statusNote}
        <div class="badges" style="margin-top:0">
          <span class="badge">${escapeHtml(s.subject)}</span>
          <span class="badge">${typeLabel(s)}</span>
          <span class="badge">${formatLabel(s)}</span>
          ${s.topics.map(t => `<span class="badge badge-outline">${escapeHtml(t)}</span>`).join('')}
        </div>
        <h1 class="page-title" style="margin-top:10px">${escapeHtml(s.title)}</h1>
        <div class="facts">
          <div><div class="fact-label">Date</div><div class="fact-value">${fmtLongDate(s.dateTime)}</div></div>
          <div><div class="fact-label">Time</div><div class="fact-value">${fmtTimeRange(s)} (${s.duration} min)</div></div>
          <div><div class="fact-label">Location</div><div class="fact-value">${place}</div></div>
        </div>
        <a class="list-row mb-16" href="tutor-profile.html?id=${s.tutorId}" style="text-decoration:none;color:inherit">
          <span class="avatar">${initials(s.tutorName)}</span>
          <div><strong>${escapeHtml(s.tutorName)}</strong><div class="small muted">View tutor profile</div></div>
        </a>
        <h2>Learning objectives</h2>
        <ul class="bullets mt-16 mb-16">${s.objectives.map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ul>
        <h2>Preparation notes</h2>
        <p class="mt-16 ${s.prepNotes ? '' : 'muted'}">${escapeHtml(s.prepNotes || 'No preparation notes yet.')}</p>
        ${booking || isOwner || user.role === 'coordinator' || user.role === 'admin'
          ? `<a class="btn btn-outline mt-16" href="workspace.html?id=${s.id}">Open session workspace</a>` : ''}
      </section>`;

    // ----- right: places + booking -----
    const percent = Math.min(100, Math.round((s.bookedCount / s.capacity) * 100));
    let action = '';
    if (s.status !== 'published') {
      action = '';
    } else if (started) {
      action = '<p class="muted small">This session has already started.</p>';
    } else if (isLearner && booking) {
      action = `
        <div class="booked-box"><span class="tick"></span><div><strong>You're booked</strong><div class="small muted">Booked on ${fmtShortDate(booking.bookedAt)}</div></div></div>
        <button class="btn btn-outline btn-block" id="cancel-btn">Cancel booking</button>
        <p class="hint">Cancel at least 2 hours before so your place can go to someone else.</p>`;
    } else if (isLearner && s.remaining > 0) {
      action = `<button class="btn btn-block" id="book-btn">Book a place</button>
        <p class="hint">${s.remaining} place${s.remaining === 1 ? '' : 's'} left.</p>`;
    } else if (isLearner) {
      // Full session: waiting list (FR-17)
      const position = getWaitingPosition(s.id, user.id);
      action = position
        ? `<div class="alert alert-info">You're on the waiting list (number ${position}). We'll notify you if a place opens.</div>
           <button class="btn btn-outline btn-block" id="leave-wait-btn">Leave waiting list</button>`
        : `<div class="alert alert-error">This session is full.</div>
           <button class="btn btn-block" id="wait-btn">Join waiting list</button>`;
    } else if (isOwner) {
      action = `<a class="btn btn-block" href="workspace.html?id=${s.id}">Manage in workspace</a>`;
    }

    const reminders = isLearner && booking && !started ? `
      <section class="card">
        <h2 class="mb-16">Reminders</h2>
        <label class="check"><input type="checkbox" data-pref="oneDay" ${booking.reminders.oneDay ? 'checked' : ''}> 1 day before</label>
        <label class="check"><input type="checkbox" data-pref="oneHour" ${booking.reminders.oneHour ? 'checked' : ''}> 1 hour before</label>
        <label class="check"><input type="checkbox" data-pref="email" ${booking.reminders.email ? 'checked' : ''}> Email me too</label>
        <p class="hint">Reminders appear in Notifications.</p>
      </section>` : '';

    const side = `
      <aside class="stack">
        <section class="card">
          <div class="row-between"><h2>Places</h2><span class="small">${s.bookedCount} of ${s.capacity} booked</span></div>
          <div class="bar"><span style="width:${percent}%"></span></div>
          ${action}
        </section>
        ${reminders}
      </aside>`;

    $('#page').innerHTML = details + side;

    // ----- events -----
    const bookBtn = $('#book-btn');
    if (bookBtn) bookBtn.addEventListener('click', () => {
      if (tryAction(() => bookSession(s.id, user.id), alertBox, 'Booked! You will get reminders before the session.')) {
        render();
        renderSidebar(user);
      }
    });
    const cancelBtn = $('#cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      if (!confirm('Cancel your booking for this session?')) return;
      if (tryAction(() => cancelBooking(s.id, user.id), alertBox, 'Your booking was cancelled and the place is free again.')) render();
    });
    const waitBtn = $('#wait-btn');
    if (waitBtn) waitBtn.addEventListener('click', () => {
      if (tryAction(() => joinWaitingList(s.id, user.id), alertBox, 'You joined the waiting list.')) render();
    });
    const leaveWaitBtn = $('#leave-wait-btn');
    if (leaveWaitBtn) leaveWaitBtn.addEventListener('click', () => {
      if (tryAction(() => leaveWaitingList(s.id, user.id), alertBox, 'You left the waiting list.')) render();
    });
        document.querySelectorAll('[data-pref]').forEach(box => box.addEventListener('change', () => {
      tryAction(() => updateReminderPreferences(s.id, user.id, { [box.dataset.pref]: box.checked }), alertBox, 'Reminder settings saved.');
    }));
  }

  render();
})();
