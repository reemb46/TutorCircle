// Find sessions page (Figure 2) - uses the 1.3 Search functions
(function () {
  const user = initPage('findSessions');
  if (!user) return;

  const state = {
    tab: 'sessions',
    topic: '',                       // topic chip that is selected
    tutorId: getParam('tutor') || '', // set when coming from "See upcoming sessions"
  };

  // Fill the subject dropdown
  const subjectSelect = $('#f-subject');
  Object.entries(SUBJECTS).forEach(([code, name]) => {
    subjectSelect.insertAdjacentHTML('beforeend', `<option value="${code}">${code} · ${name}</option>`);
  });

  function renderTopicChips() {
    const topics = getAllTopics(subjectSelect.value);
    if (!topics.includes(state.topic)) state.topic = '';
    $('#topic-chips').innerHTML = topics.map(t =>
      `<button type="button" class="chip ${t === state.topic ? 'selected' : ''}" data-topic="${escapeHtml(t)}">${escapeHtml(t)}</button>`
    ).join('') || '<span class="muted small">No topics yet</span>';
  }

  // Turns the "Available time" dropdowns into from / to dates and hours
  function timeFilters() {
    const day = $('#f-day').value;
    const part = $('#f-part').value;
    const startOfDay = offset => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(0, 0, 0, 0); return d; };
    let from = null, to = null;
    if (day === 'today') { from = startOfDay(0); to = startOfDay(1); }
    if (day === 'tomorrow') { from = startOfDay(1); to = startOfDay(2); }
    if (day === 'week') { from = startOfDay(0); to = startOfDay(7); }
    if (day === 'weekend') {
      const daysToFriday = (5 - new Date().getDay() + 7) % 7;
      from = startOfDay(daysToFriday); to = startOfDay(daysToFriday + 2);
    }
    const hours = { morning: [8, 12], afternoon: [12, 17], evening: [17, 21] }[part] || [null, null];
    return { from, to, fromHour: hours[0], toHour: hours[1] };
  }

  function currentFilters() {
    const formats = [...document.querySelectorAll('input[name="format"]:checked')].map(c => c.value);
    return { formats, ...timeFilters(), groupSize: $('#f-size').value };
  }

  function search() {
    const subject = subjectSelect.value;
    const query = $('#q').value.trim();
    const filters = currentFilters();

    // Topic chip and search box can be used together
    let sessions = searchSessions(subject, state.topic);
    let tutors = searchTutors(subject, state.topic);
    if (query) {
      const ids = new Set(searchSessions(subject, query).map(s => s.id));
      sessions = sessions.filter(s => ids.has(s.id));
      const tutorIds = new Set(searchTutors(subject, query).map(t => t.tutorId));
      tutors = tutors.filter(t => tutorIds.has(t.tutorId));
    }
    if (state.tutorId) sessions = sessions.filter(s => s.tutorId === state.tutorId);

    sessions = applyFilters(sessions, filters);
    tutors = applyFilters(tutors, filters);

    if ($('#sort').value === 'places') sessions.sort((a, b) => b.remaining - a.remaining);

    $('#count-sessions').textContent = sessions.length;
    $('#count-tutors').textContent = tutors.length;

    if (state.tab === 'sessions') renderSessions(sessions);
    else renderTutors(tutors);
  }

  function renderSessions(sessions) {
    $('#match-text').textContent = `${sessions.length} session${sessions.length === 1 ? '' : 's'} match`;
    $('#sort').hidden = false;
    $('#tutor-filter-note').innerHTML = state.tutorId
      ? `<div class="alert alert-info">Showing sessions by one tutor only. <a href="find-sessions.html">Show all</a></div>` : '';

    if (sessions.length === 0) {
      $('#results').innerHTML = '<div class="empty">No sessions match your search. Try another topic or clear the filters.</div>';
      return;
    }
    $('#results').innerHTML = sessions.map(s => {
      const booked = user.role === 'learner' && getLearnerBooking(s.id, user.id);
      const button = booked || s.remaining <= 0 || user.role !== 'learner'
        ? `<a class="btn btn-outline" href="session.html?id=${s.id}">View</a>`
        : `<a class="btn" href="session.html?id=${s.id}">View and book</a>`;
      return `
        <article class="result">
          <span class="avatar">${initials(s.tutorName)}</span>
          <div class="result-body">
            <a class="result-title" href="session.html?id=${s.id}">${escapeHtml(s.title)}</a>
            <div class="meta">
              <a href="tutor-profile.html?id=${s.tutorId}">${escapeHtml(s.tutorName)}</a>
              · ${escapeHtml(s.subject)} · ${fmtWhen(s)} · ${escapeHtml(placeLabel(s))}
            </div>
            <div class="badges">
              <span class="badge">${typeLabel(s)}</span>
              <span class="badge">${formatLabel(s)}</span>
              ${seatsBadge(s)}
              ${booked ? '<span class="badge badge-green">Booked</span>' : ''}
            </div>
          </div>
          ${button}
        </article>`;
    }).join('');
  }

  function renderTutors(tutors) {
    $('#match-text').textContent = `${tutors.length} tutor${tutors.length === 1 ? '' : 's'} match`;
    $('#sort').hidden = true;
    $('#tutor-filter-note').innerHTML = '';
    if (tutors.length === 0) {
      $('#results').innerHTML = '<div class="empty">No tutors match your search.</div>';
      return;
    }
    $('#results').innerHTML = tutors.map(t => `
      <article class="result">
        <span class="avatar">${initials(t.name)}</span>
        <div class="result-body">
          <a class="result-title" href="tutor-profile.html?id=${t.tutorId}">${escapeHtml(t.name)}</a>
          <div class="meta">${escapeHtml(t.programme)} · Year ${escapeHtml(t.year)} · ${t.approvedSubjects.map(s => escapeHtml(s.code)).join(', ')}</div>
          <div class="badges">${t.approvedSubjects.flatMap(s => s.topics).map(tp => `<span class="badge badge-outline">${escapeHtml(tp)}</span>`).join('')}</div>
        </div>
        <a class="btn btn-outline" href="tutor-profile.html?id=${t.tutorId}">View profile</a>
      </article>`).join('');
  }

  // ----- events -----
  $('#search-form').addEventListener('submit', e => { e.preventDefault(); search(); });
  subjectSelect.addEventListener('change', () => { renderTopicChips(); search(); });
  ['#f-day', '#f-part', '#f-size', '#sort'].forEach(sel => $(sel).addEventListener('change', search));
  document.querySelectorAll('input[name="format"]').forEach(c => c.addEventListener('change', search));

  $('#topic-chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.topic = state.topic === chip.dataset.topic ? '' : chip.dataset.topic;
    renderTopicChips();
    search();
  });

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    state.tab = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    search();
  }));

  $('#clear-filters').addEventListener('click', () => {
    subjectSelect.value = '';
    state.topic = '';
    state.tutorId = '';
    $('#q').value = '';
    document.querySelectorAll('input[name="format"]').forEach(c => { c.checked = true; });
    $('#f-day').value = 'any';
    $('#f-part').value = 'any';
    $('#f-size').value = 'any';
    history.replaceState(null, '', 'find-sessions.html');
    renderTopicChips();
    search();
  });

  renderTopicChips();
  search();
})();
