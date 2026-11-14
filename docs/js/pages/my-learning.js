// My learning page (Figure 7) - FR-12, FR-13, FR-15, FR-16
(function () {
  const user = initPage('myLearning');
  if (!user) return;

  const alertBox = $('#alert');
  let chosenFile = null;
  let feedbackSessionId = getParam('feedback') || '';
  let rating = 0;

  // ---------- practice work ----------
  function renderPracticeOptions() {
    const booked = listLearnerBookings(user.id).map(x => x.session).filter(s => s.status !== 'cancelled').reverse();
    $('#practice-session').innerHTML = booked.length
      ? booked.map(s => `<option value="${s.id}">${escapeHtml(s.title)} · ${fmtShortDate(s.dateTime)}</option>`).join('')
      : '<option value="">Book a session first</option>';
  }

  function renderSubmissions() {
    const subs = viewSubmissions(user.id);
    $('#submissions').innerHTML = subs.length ? subs.map(sub => `
      <div class="list-row" style="display:block">
        <div class="row-between">
          <div class="row"><span class="file-icon"></span><strong>${escapeHtml(sub.title)}</strong></div>
          ${sub.comments.length ? '<span class="badge badge-green">Reviewed</span>' : '<span class="badge badge-amber">Waiting for tutor</span>'}
        </div>
        <div class="small muted mt-16" style="margin-top:4px">${escapeHtml(sub.file.name)} · ${fmtSize(sub.file.size)} · submitted ${fmtShortDate(sub.submittedAt)} · ${escapeHtml(sub.sessionTitle)}</div>
        ${sub.comments.map(c => `
          <div class="comment-box">
            <span class="avatar">${initials(c.tutorName)}</span>
            <div><strong>${escapeHtml(c.tutorName)}'s comment</strong><div>${escapeHtml(c.comment)}</div><div class="small muted">${fmtDateTime(c.at)}</div></div>
          </div>`).join('')}
      </div>`).join('') : '<p class="muted">No practice work submitted yet.</p>';
  }

  function setFile(file) {
    chosenFile = file || null;
    $('#drop-text').innerHTML = chosenFile
      ? `Selected: <strong>${escapeHtml(chosenFile.name)}</strong> (${fmtSize(chosenFile.size)})`
      : 'Drag a file here or <u>browse</u> (max 10 MB)';
  }

  $('#practice-file').addEventListener('change', e => setFile(e.target.files[0]));
  const zone = $('#dropzone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); setFile(e.dataTransfer.files[0]); });

  $('#practice-form').addEventListener('submit', e => {
    e.preventDefault();
    const ok = tryAction(() => submitPractice($('#practice-session').value, user.id, chosenFile, $('#practice-title').value),
      alertBox, 'Practice submitted. Your tutor was notified.');
    if (ok) {
      setFile(null);
      $('#practice-title').value = '';
      $('#practice-file').value = '';
      renderSubmissions();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---------- feedback (only attended sessions - FR-15) ----------
  function renderFeedback() {
    const history = viewSessionHistory(user.id);
    const eligible = history.filter(h => h.attended === true && !h.feedbackGiven);
    if (!eligible.some(h => h.session.id === feedbackSessionId)) {
      feedbackSessionId = eligible.length ? eligible[0].session.id : '';
    }
    if (!eligible.length) {
      $('#feedback-area').innerHTML = '<p class="muted">No sessions waiting for feedback. You can leave feedback after a tutor marks you as present.</p>';
      return;
    }
    const current = eligible.find(h => h.session.id === feedbackSessionId).session;
    $('#feedback-area').innerHTML = `
      <div class="field">
        <label for="fb-session">Session</label>
        <select id="fb-session">${eligible.map(h => `<option value="${h.session.id}" ${h.session.id === feedbackSessionId ? 'selected' : ''}>${escapeHtml(h.session.title)}</option>`).join('')}</select>
        <p class="hint">${escapeHtml(current.tutorName)} · ${fmtShortDate(current.dateTime)}</p>
      </div>
      <div class="field">
        <span class="label">How useful was it?</span>
        <div class="row" id="rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rate ${n <= rating ? 'on' : ''}" data-rate="${n}" aria-label="${n} out of 5">${n}</button>`).join('')}</div>
      </div>
      <div class="field">
        <label for="fb-comment">Comment</label>
        <textarea id="fb-comment" placeholder="What helped? What's still unclear?" maxlength="1000"></textarea>
      </div>
      <button class="btn btn-block" id="send-feedback">Send feedback</button>`;

    $('#fb-session').addEventListener('change', e => { feedbackSessionId = e.target.value; renderFeedback(); });
    document.querySelectorAll('.rate').forEach(btn => btn.addEventListener('click', () => {
      rating = Number(btn.dataset.rate);
      document.querySelectorAll('.rate').forEach(b => b.classList.toggle('on', Number(b.dataset.rate) <= rating));
    }));
    $('#send-feedback').addEventListener('click', () => {
      if (tryAction(() => leaveFeedback(feedbackSessionId, user.id, rating, $('#fb-comment').value), alertBox, 'Thanks! Your feedback was sent.')) {
        rating = 0;
        renderFeedback();
        renderHistory();
      }
    });
  }

  // ---------- session history ----------
  function renderHistory() {
    const history = viewSessionHistory(user.id);
    if (!history.length) {
      $('#history').innerHTML = '<p class="muted">No past sessions yet.</p>';
      return;
    }
    $('#history').innerHTML = `
      <table class="table">
        <thead><tr><th>Session</th><th>Tutor</th><th>Date</th><th>Attendance</th><th>Feedback</th></tr></thead>
        <tbody>${history.map(h => {
          const attendance = h.bookingStatus === 'cancelled' ? '<span class="badge badge-outline">Cancelled</span>'
            : h.attended === true ? '<span class="badge badge-green">Attended</span>'
            : h.attended === false ? '<span class="badge badge-red">Absent</span>'
            : '<span class="badge badge-amber">Not recorded</span>';
          const fb = h.feedbackGiven ? '<span class="muted">Sent</span>'
            : h.attended === true ? `<button class="btn btn-outline btn-sm" data-feedback="${h.session.id}">Leave feedback</button>`
            : '<span class="muted">—</span>';
          return `<tr>
            <td><a href="session.html?id=${h.session.id}">${escapeHtml(h.session.title)}</a></td>
            <td>${escapeHtml(h.session.tutorName)}</td>
            <td>${fmtShortDate(h.session.dateTime)}</td>
            <td>${attendance}</td>
            <td>${fb}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    document.querySelectorAll('[data-feedback]').forEach(btn => btn.addEventListener('click', () => {
      feedbackSessionId = btn.dataset.feedback;
      renderFeedback();
      $('#feedback-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }

  // ---------- complaints (FR-16) ----------
  function renderComplaints() {
    const sessions = listLearnerBookings(user.id).map(x => x.session).reverse();
    $('#complaint-session').innerHTML = sessions.length
      ? sessions.map(s => `<option value="${s.id}">${escapeHtml(s.title)} · ${fmtShortDate(s.dateTime)}</option>`).join('')
      : '<option value="">No sessions yet</option>';

    const mine = listMyComplaints(user.id);
    $('#complaints').innerHTML = mine.length ? mine.map(c => {
      const history = viewComplaintHistory(c.id);
      const kind = c.status === 'Resolved' ? 'badge-green' : c.status === 'In review' ? 'badge-amber' : 'badge-red';
      return `
        <div class="list-row mb-16" style="display:block">
          <div class="row-between"><strong>${escapeHtml(c.sessionTitle)}</strong><span class="badge ${kind}">${c.status}</span></div>
          <p class="mt-16" style="margin-top:4px">${escapeHtml(c.description)}</p>
          <p class="small muted">Sent ${fmtDateTime(c.date)}</p>
          ${history.decisions.length ? `<div class="timeline">${history.decisions.map(d => `
            <div class="timeline-item"><strong>${escapeHtml(d.coordinatorName)}</strong> <span class="small muted">${fmtDateTime(d.at)} · ${d.statusAfter}</span><div>${escapeHtml(d.decision)}</div></div>`).join('')}</div>` : ''}
        </div>`;
    }).join('') : '<p class="muted">You have not reported any problems.</p>';
  }

  $('#complaint-form').addEventListener('submit', e => {
    e.preventDefault();
    if (tryAction(() => recordComplaint(user.id, $('#complaint-session').value, $('#complaint-text').value), alertBox, 'Your complaint was sent to the coordinators.')) {
      $('#complaint-text').value = '';
      renderComplaints();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  renderPracticeOptions();
  renderSubmissions();
  renderFeedback();
  renderHistory();
  renderComplaints();
})();
