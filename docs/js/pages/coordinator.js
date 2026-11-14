// Coordinator dashboard - FR-04, FR-14, FR-16, FR-17, FR-18
(function () {
  const user = initPage('coordinator');
  if (!user) return;

  const alertBox = $('#alert');
  const state = {
    tab: getParam('tab') || 'applications',
    openApplication: '',
    minMisses: 2,
    complaintStatus: 'Open',
    openComplaint: '',
    patternTopic: '',
  };

  function pct(rate) {
    return rate === null ? '<span class="muted">No data</span>'
      : `<span class="mini-bar"><span style="width:${Math.round(rate * 100)}%"></span></span>${Math.round(rate * 100)}%`;
  }

  function renderStats() {
    // Let the system check demand for every topic first (FR-18)
    knownTopics().forEach(t => checkDemand(t));
    const stats = [
      { label: 'Applications waiting', value: listTutorApplications().length },
      { label: 'Open complaints', value: listComplaints('Open').length },
      { label: 'Repeated no-shows (2+)', value: getMissedSessionsReport(2).length },
      { label: 'Pending suggestions', value: listSuggestions().filter(s => s.status === 'Pending').length },
    ];
    $('#stats').innerHTML = stats.map(s => `<div class="stat"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join('');
  }

  // ---------------- Applications (FR-04, FR-14) ----------------
  function renderApplications() {
    const apps = listTutorApplications();
    if (!apps.length) return '<div class="empty">No applications are waiting for a decision.</div>';
    return `<div class="stack-sm">${apps.map(app => {
      const open = state.openApplication === app.tutorId;
      let details = '';
      if (open) {
        const full = reviewTutorApplication(app.tutorId);
        const slots = DAYS.map(d => `${d}: ${(full.availability[d] || []).join(', ') || '—'}`).join(' · ');
        details = `
          <div class="mt-16">
            <p><strong>Programme:</strong> ${escapeHtml(full.programme)} · Year ${escapeHtml(full.year)} · ${escapeHtml(full.email)}</p>
            <p class="mt-16"><strong>Experience:</strong> ${escapeHtml(full.experience)}</p>
            <p class="mt-16"><strong>Formats:</strong> ${full.formats.map(escapeHtml).join(', ') || '—'}</p>
            <p class="mt-16 small muted"><strong>Availability:</strong> ${slots}</p>
            <h2 class="mt-16 mb-16">Subject coverage</h2>
            <div class="stack-sm">${full.subjects.map(s => `
              <div class="list-row">
                <div style="flex:1"><strong>${escapeHtml(s.code)} · ${escapeHtml(SUBJECTS[s.code] || '')}</strong>
                  <div class="badges">${s.topics.map(t => `<span class="badge badge-outline">${escapeHtml(t)}</span>`).join('')}</div></div>
                ${s.status === 'approved' ? '<span class="badge badge-green">Approved</span>'
                  : `<button class="btn btn-sm" data-approve-subject="${escapeHtml(s.code)}" data-tutor="${app.tutorId}">Approve subject</button>`}
              </div>`).join('')}</div>
            ${full.status !== 'approved' ? `
              <div class="row mt-16">
                <button class="btn" data-approve-tutor="${app.tutorId}">Approve tutor</button>
                <button class="btn btn-danger" data-reject-tutor="${app.tutorId}">Reject</button>
              </div>
              <p class="hint">Approve the tutor and at least one subject so they can create sessions.</p>` : ''}
          </div>`;
      }
      return `
        <article class="card">
          <div class="row-between">
            <div class="row">
              <span class="avatar">${initials(app.name)}</span>
              <div>
                <strong>${escapeHtml(app.name)}</strong>
                <div class="small muted">${app.status === 'approved' ? 'Approved tutor asking for new subjects' : 'New tutor application'} · sent ${fmtShortDate(app.submittedAt)}</div>
              </div>
            </div>
            <div class="row">
              ${app.status === 'approved' ? '<span class="badge badge-green">Tutor approved</span>' : '<span class="badge badge-amber">Pending</span>'}
              <span class="badge badge-outline">${app.pendingSubjects.length} subject${app.pendingSubjects.length === 1 ? '' : 's'} pending</span>
              <button class="btn btn-outline btn-sm" data-review="${app.tutorId}">${open ? 'Close' : 'Review'}</button>
            </div>
          </div>
          ${details}
        </article>`;
    }).join('')}</div>`;
  }

  // ---------------- Missed sessions (FR-14) ----------------
  function renderMissed() {
    const rows = getMissedSessionsReport(state.minMisses);
    return `
      <section class="card">
        <div class="row mb-16">
          <label for="min-misses" style="margin:0">Show everyone who missed at least</label>
          <input type="number" id="min-misses" min="1" max="20" value="${state.minMisses}" style="width:80px">
          <span class="muted">sessions</span>
        </div>
        ${rows.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Name</th><th>Role</th><th>Missed</th><th>Last missed</th><th>Sessions</th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td><strong>${escapeHtml(r.name)}</strong><div class="small muted">${escapeHtml(r.email)}</div></td>
            <td style="text-transform:capitalize">${escapeHtml(r.role)}</td>
            <td><span class="badge badge-red">${r.misses}</span></td>
            <td>${fmtShortDate(r.lastMissed)}</td>
            <td class="small">${r.sessions.map(escapeHtml).join('<br>')}</td>
          </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nobody has missed that many sessions.</div>'}
        <p class="hint">Learners count when a tutor marks them absent. Tutors count when they cancel a session.</p>
      </section>`;
  }

  // ---------------- Complaints (FR-16) ----------------
  function renderComplaintsPanel() {
    const list = listComplaints(state.complaintStatus);
    const statusBadge = s => `<span class="badge ${s === 'Resolved' ? 'badge-green' : s === 'In review' ? 'badge-amber' : 'badge-red'}">${s}</span>`;
    return `
      <div class="row mb-16">
        <label for="complaint-filter" style="margin:0">Status</label>
        <select id="complaint-filter" style="width:auto">
          ${['Open', 'In review', 'Resolved', 'all'].map(s => `<option value="${s}" ${s === state.complaintStatus ? 'selected' : ''}>${s === 'all' ? 'All' : s}</option>`).join('')}
        </select>
      </div>
      ${list.length ? `<div class="stack-sm">${list.map(c => {
        const open = state.openComplaint === c.id;
        let body = '';
        if (open) {
          const history = viewComplaintHistory(c.id);
          body = `
            <h2 class="mt-16 mb-16">History</h2>
            <div class="timeline">
              <div class="timeline-item"><strong>${escapeHtml(c.fromName)}</strong> <span class="small muted">${fmtDateTime(c.date)} · Complaint made (Open)</span></div>
              ${history.decisions.map(d => `<div class="timeline-item"><strong>${escapeHtml(d.coordinatorName)}</strong> <span class="small muted">${fmtDateTime(d.at)} · ${d.statusBefore} → ${d.statusAfter}</span><div>${escapeHtml(d.decision)}</div></div>`).join('')}
            </div>
            <form class="mt-16 decision-form" data-id="${c.id}">
              <div class="field"><label>Decision</label><textarea class="decision-text" placeholder="What did you decide and why?" maxlength="1000"></textarea></div>
              <div class="row">
                <select class="decision-status" style="width:auto">
                  <option value="In review">Mark as In review</option>
                  <option value="Resolved" selected>Mark as Resolved</option>
                  <option value="Open">Keep Open</option>
                </select>
                <button class="btn" type="submit">Record decision</button>
              </div>
              <p class="hint">Earlier decisions are kept. Each new decision is added to the history.</p>
            </form>`;
        }
        return `
          <article class="card">
            <div class="row-between">
              <div>
                <strong>${escapeHtml(c.sessionTitle)}</strong> <span class="muted small">· tutor ${escapeHtml(c.tutorName)}</span>
                <div class="small muted">From ${escapeHtml(c.fromName)} · ${fmtDateTime(c.date)} · ${c.decisionCount} decision${c.decisionCount === 1 ? '' : 's'}</div>
              </div>
              <div class="row">${statusBadge(c.status)}<button class="btn btn-outline btn-sm" data-complaint="${c.id}">${open ? 'Close' : 'Open'}</button></div>
            </div>
            <p class="mt-16">${escapeHtml(c.description)}</p>
            ${body}
          </article>`;
      }).join('')}</div>` : '<div class="empty">No complaints with this status.</div>'}`;
  }

  // ---------------- Demand insights (FR-17, FR-18) ----------------
  function renderDemand() {
    const summary = getDemandSummary();
    const limit = loadDB().settings.demandLimit;
    const suggestions = listSuggestions();
    if (!state.patternTopic && summary.length) state.patternTopic = summary[0].topic;
    const pattern = state.patternTopic ? getAttendancePattern(state.patternTopic) : null;

    return `
      <div class="grid-main">
        <div class="stack">
          <section class="card">
            <div class="card-head"><h2>Demand by topic</h2><button class="btn btn-outline btn-sm" id="check-demand">Check demand now</button></div>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Topic</th><th>Unmet demand</th><th>Waiting list</th><th>Attendance</th><th>Tutors available</th></tr></thead>
              <tbody>${summary.map(r => `<tr>
                <td><strong>${escapeHtml(r.topic)}</strong></td>
                <td>${r.overLimit ? `<span class="badge badge-red">${r.unmetDemand} – over limit</span>` : r.unmetDemand}</td>
                <td>${r.waitingList}</td>
                <td>${pct(r.attendanceRate)}</td>
                <td>${r.tutorsAvailable === 0 ? '<span class="badge badge-amber">0</span>' : r.tutorsAvailable}</td>
              </tr>`).join('')}</tbody>
            </table></div>
            <p class="hint">Unmet demand = learners on a waiting list, or who searched a topic in the last 30 days and found no free place.</p>
          </section>

          <section class="card">
            <div class="card-head">
              <h2>Attendance pattern</h2>
              <select id="pattern-topic" style="width:auto">${summary.map(r => `<option ${r.topic === state.patternTopic ? 'selected' : ''}>${escapeHtml(r.topic)}</option>`).join('')}</select>
            </div>
            ${pattern && pattern.sessions.length ? `<table class="table">
              <thead><tr><th>Date</th><th>Session</th><th>Booked</th><th>Attended</th><th>Rate</th></tr></thead>
              <tbody>${pattern.sessions.map(p => `<tr><td>${fmtShortDate(p.date)}</td><td>${escapeHtml(p.title)}</td><td>${p.booked}</td><td>${p.attended}</td><td>${pct(p.rate)}</td></tr>`).join('')}</tbody>
            </table>` : '<p class="muted">No past sessions on this topic yet.</p>'}
          </section>
        </div>

        <div class="stack">
          <section class="card">
            <h2 class="mb-16">Demand limit</h2>
            <form class="row" id="limit-form">
              <input type="number" id="limit" min="1" max="100" value="${limit}" style="width:90px">
              <button class="btn" type="submit">Save limit</button>
            </form>
            <p class="hint">An extra session is suggested when unmet demand for a topic is above this number.</p>
          </section>

          <section class="card">
            <h2 class="mb-16">Extra-session suggestions</h2>
            ${suggestions.length ? suggestions.map(s => `
              <div class="post">
                <div class="row-between">
                  <strong>${escapeHtml(s.topic)}</strong>
                  <span class="badge ${s.status === 'Accepted' ? 'badge-green' : s.status === 'Ignored' ? 'badge-outline' : 'badge-amber'}">${s.status}</span>
                </div>
                <div class="small muted">${s.demand} learners vs limit ${s.limit} · suggested ${fmtShortDate(s.createdAt)}</div>
                ${s.status === 'Pending' ? `
                  <div class="row mt-16">
                    <button class="btn btn-sm" data-suggestion="${s.id}" data-decision="accepted">Accept</button>
                    <button class="btn btn-outline btn-sm" data-suggestion="${s.id}" data-decision="ignored">Ignore</button>
                  </div>` : `<div class="small muted">${s.status} by ${escapeHtml(s.decidedByName)} on ${fmtDateTime(s.decidedAt)}</div>`}
              </div>`).join('') : '<p class="muted">No suggestions yet.</p>'}
          </section>
        </div>
      </div>`;
  }

  // ---------------- Decision log (FR-16 traceability) ----------------
  function renderLog() {
    const log = getAuditLog();
    return `<section class="card">${log.length ? `<table class="table">
      <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
      <tbody>${log.map(a => `<tr><td>${fmtDateTime(a.at)}</td><td>${escapeHtml(a.actorName)}</td><td>${escapeHtml(a.action)}</td><td>${escapeHtml(a.details)}</td></tr>`).join('')}</tbody>
    </table>` : '<p class="muted">No decisions recorded yet.</p>'}</section>`;
  }

  // ---------------- render + events ----------------
  function render() {
    renderStats();
    document.querySelectorAll('#tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.tab));
    const panels = { applications: renderApplications, missed: renderMissed, complaints: renderComplaintsPanel, demand: renderDemand, log: renderLog };
    $('#panel').innerHTML = panels[state.tab]();
    bind();
  }

  function act(action, message) {
    if (tryAction(action, alertBox, message)) render();
  }

  function bind() {
    const on = (sel, evt, fn) => { const el = $(sel); if (el) el.addEventListener(evt, fn); };
    const each = (sel, fn) => document.querySelectorAll(sel).forEach(fn);

    each('[data-review]', b => b.addEventListener('click', () => {
      state.openApplication = state.openApplication === b.dataset.review ? '' : b.dataset.review;
      render();
    }));
    each('[data-approve-tutor]', b => b.addEventListener('click', () => act(() => approveTutor(b.dataset.approveTutor), 'Tutor approved.')));
    each('[data-reject-tutor]', b => b.addEventListener('click', () => {
      if (confirm('Reject this tutor application?')) act(() => rejectTutor(b.dataset.rejectTutor), 'Application rejected.');
    }));
    each('[data-approve-subject]', b => b.addEventListener('click', () =>
      act(() => approveSubjectCoverage(b.dataset.tutor, b.dataset.approveSubject), `${b.dataset.approveSubject} approved.`)));

    on('#min-misses', 'change', e => { state.minMisses = Number(e.target.value) || 1; render(); });

    on('#complaint-filter', 'change', e => { state.complaintStatus = e.target.value; state.openComplaint = ''; render(); });
    each('[data-complaint]', b => b.addEventListener('click', () => {
      state.openComplaint = state.openComplaint === b.dataset.complaint ? '' : b.dataset.complaint;
      render();
    }));
    each('.decision-form', form => form.addEventListener('submit', e => {
      e.preventDefault();
      const status = form.querySelector('.decision-status').value;
      act(() => recordDecision(form.dataset.id, user.id, form.querySelector('.decision-text').value, status), 'Decision recorded.');
    }));

    on('#check-demand', 'click', () => {
      const created = knownTopics().map(t => checkDemand(t)).filter(Boolean);
      showAlert(alertBox, created.length ? `${created.length} new suggestion(s) created.` : 'No topic is over the limit without a pending suggestion.', created.length ? 'success' : 'info');
      render();
    });
    on('#limit-form', 'submit', e => { e.preventDefault(); act(() => setDemandLimit($('#limit').value), 'Demand limit saved.'); });
    on('#pattern-topic', 'change', e => { state.patternTopic = e.target.value; render(); });
    each('[data-suggestion]', b => b.addEventListener('click', () =>
      act(() => recordSuggestionDecision(b.dataset.suggestion, user.id, b.dataset.decision), 'Decision recorded.')));
  }

  document.querySelectorAll('#tabs .tab').forEach(tab => tab.addEventListener('click', () => {
    state.tab = tab.dataset.tab;
    clearAlert(alertBox);
    render();
  }));

  render();
})();
