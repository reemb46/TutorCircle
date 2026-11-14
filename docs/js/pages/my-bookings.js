// My bookings page (learner)
(function () {
  const user = initPage('myBookings');
  if (!user) return;

  const all = listLearnerBookings(user.id);
  const upcoming = all.filter(x => !hasStarted(x.session) && x.session.status === 'published');
  const cancelled = all.filter(x => x.session.status === 'cancelled');
  const past = all.filter(x => hasStarted(x.session) && x.session.status === 'published').reverse();

  function rows(list, kind) {
    if (list.length === 0) return '<div class="empty">Nothing here yet.</div>';
    return list.map(({ session: s, booking }) => `
      <article class="result">
        <span class="avatar">${initials(s.tutorName)}</span>
        <div class="result-body">
          <a class="result-title" href="session.html?id=${s.id}">${escapeHtml(s.title)}</a>
          <div class="meta">${escapeHtml(s.tutorName)} · ${escapeHtml(s.subject)} · ${fmtWhen(s)} · ${escapeHtml(placeLabel(s))}</div>
          <div class="badges">
            <span class="badge">${typeLabel(s)}</span>
            <span class="badge">${formatLabel(s)}</span>
            ${kind === 'cancelled' ? '<span class="badge badge-red">Cancelled by tutor</span>' : `<span class="badge badge-outline">Booked ${fmtShortDate(booking.bookedAt)}</span>`}
          </div>
        </div>
        <div class="row">
          <a class="btn btn-outline" href="session.html?id=${s.id}">Details</a>
          ${kind !== 'cancelled' ? `<a class="btn" href="workspace.html?id=${s.id}">Workspace</a>` : ''}
        </div>
      </article>`).join('');
  }

  $('#page').innerHTML = `
    <section>
      <h2 class="mb-16">Upcoming (${upcoming.length})</h2>
      <div class="stack-sm">${upcoming.length ? rows(upcoming, 'upcoming') : '<div class="empty">No upcoming bookings. <a href="find-sessions.html">Find a session</a></div>'}</div>
    </section>
    ${cancelled.length ? `<section><h2 class="mb-16">Cancelled</h2><div class="stack-sm">${rows(cancelled, 'cancelled')}</div></section>` : ''}
    <section>
      <h2 class="mb-16">Past (${past.length})</h2>
      <div class="stack-sm">${rows(past, 'past')}</div>
    </section>`;
})();
