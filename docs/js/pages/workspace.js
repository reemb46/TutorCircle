// Session workspace page (Figure 6)
// Tutor view: announcements, materials, answers, attendance, reminders (FR-09, FR-10)
// Learner view: read everything, post questions and preparation notes (FR-11)
(function () {
  const user = initPage('workspace');
  if (!user) return;

  const alertBox = $('#alert');
  const sessionId = getParam('id');
  const attendanceDraft = {}; // learnerId -> true/false before "Save attendance"

  function render() {
    let data;
    try { data = viewWorkspace(sessionId); } catch (err) { showAlert(alertBox, err.message); $('#page').innerHTML = ''; return; }
    const { session: s, posts } = data;
    const isTutor = user.role === 'tutor' && s.tutorId === user.id;
    const isLearner = user.role === 'learner';

    const announcements = posts.filter(p => p.kind === 'announcement');
    const materials = posts.filter(p => p.kind === 'material');
    const questions = posts.filter(p => p.kind === 'question');
    const notes = posts.filter(p => p.kind === 'note');

    // ----- header -----
    const header = `
      <div class="page-head">
        <div>
          <p class="eyebrow">Session workspace · ${isTutor ? 'tutor view' : 'learner view'}</p>
          <h1 class="page-title">${escapeHtml(s.title)}</h1>
          <p class="muted">${fmtDate(s.dateTime)} · ${fmtTimeRange(s)} · ${escapeHtml(placeLabel(s))} · ${s.bookedCount} learner${s.bookedCount === 1 ? '' : 's'} booked</p>
          ${s.status === 'cancelled' ? '<span class="badge badge-red mt-16">Cancelled</span>' : ''}
          ${s.status === 'draft' ? '<span class="badge badge-amber mt-16">Draft – not visible to learners</span>' : ''}
        </div>
        <div class="row">
          ${isTutor && s.status !== 'cancelled' ? `
            <button class="btn btn-outline" id="remind-btn">Send reminders</button>
            <a class="btn btn-outline" href="create-session.html?edit=${s.id}">Edit session</a>
            <button class="btn btn-danger" id="cancel-session-btn">Cancel session</button>` : ''}
          ${!isTutor ? `<a class="btn btn-outline" href="session.html?id=${s.id}">Session details</a>` : ''}
        </div>
      </div>`;

    // ----- announcements -----
    const announcementCard = `
      <section class="card">
        <h2 class="mb-16">Announcements</h2>
        ${isTutor ? `
          <form class="row mb-16" id="announce-form">
            <input type="text" id="announce-text" placeholder="Write an announcement to all learners..." style="flex:1" maxlength="1000">
            <button class="btn" type="submit">Post</button>
          </form>` : ''}
        ${announcements.length ? announcements.map(p => `
          <div class="post">
            <div class="post-title">${escapeHtml(p.text)}</div>
            <div class="small muted">${escapeHtml(p.authorName)} · ${fmtDateTime(p.createdAt)}</div>
          </div>`).join('') : '<p class="muted">No announcements yet.</p>'}
      </section>`;

    // ----- materials -----
    const materialCard = `
      <section class="card">
        <div class="card-head">
          <h2>Materials</h2>
          ${isTutor ? `<label class="btn btn-outline btn-sm" style="margin:0">+ Upload<input type="file" id="upload-input" hidden></label>` : ''}
        </div>
        <div class="stack-sm">
          ${materials.length ? materials.map(p => `
            <div class="list-row">
              <span class="file-icon"></span>
              <span style="flex:1">${escapeHtml(p.file.name)}</span>
              <span class="small muted">${fmtSize(p.file.size)} · ${fmtShortDate(p.createdAt)}</span>
            </div>`).join('') : '<p class="muted">No materials uploaded yet.</p>'}
        </div>
      </section>`;

    // ----- learner questions -----
    const questionCard = `
      <section class="card">
        <h2 class="mb-16">Learner questions (${questions.length})</h2>
        ${isLearner ? `
          <form class="row mb-16" id="question-form">
            <input type="text" id="question-text" placeholder="Ask the tutor a question..." style="flex:1" maxlength="1000">
            <button class="btn" type="submit">Ask</button>
          </form>` : ''}
        ${questions.length ? questions.map(p => `
          <div class="post">
            <div class="row-between" style="align-items:flex-start">
              <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
                <span class="avatar">${initials(p.authorName)}</span>
                <div>
                  <div class="post-title">${escapeHtml(p.authorName)}</div>
                  <div>${escapeHtml(p.text)}</div>
                  <div class="small muted">${fmtDateTime(p.createdAt)}</div>
                </div>
              </div>
              ${p.answered ? '<span class="badge badge-green">Answered</span>' : '<span class="badge badge-amber">Unanswered</span>'}
            </div>
            ${p.reply ? `<div class="reply"><strong>${escapeHtml(s.tutorName)}:</strong> ${escapeHtml(p.reply)}</div>` : ''}
            ${isTutor && !p.answered ? `
              <form class="row mt-16 answer-form" data-id="${p.id}">
                <input type="text" placeholder="Write an answer..." style="flex:1" maxlength="1000">
                <button class="btn btn-sm" type="submit">Answer</button>
              </form>` : ''}
          </div>`).join('') : '<p class="muted">No questions yet.</p>'}
      </section>`;

    // ----- learner preparation notes -----
    const notesCard = `
      <section class="card">
        <h2 class="mb-16">Learner preparation notes (${notes.length})</h2>
        ${isLearner ? `
          <form class="mb-16" id="note-form">
            <textarea id="note-text" placeholder="What did you prepare? What do you want to cover?" maxlength="1000"></textarea>
            <div class="row mt-16" style="justify-content:flex-end"><button class="btn" type="submit">Add note</button></div>
          </form>` : ''}
        ${notes.length ? notes.map(p => `
          <div class="post">
            <div class="post-title">${escapeHtml(p.authorName)}</div>
            <div>${escapeHtml(p.text)}</div>
            <div class="small muted">${fmtDateTime(p.createdAt)}</div>
          </div>`).join('') : '<p class="muted">No preparation notes yet.</p>'}
      </section>`;

    // ----- tutor's preparation notes -----
    const prepCard = `
      <section class="card">
        <h2 class="mb-16">Preparation notes</h2>
        <div id="prep-view">
          <p class="${s.prepNotes ? '' : 'muted'}">${escapeHtml(s.prepNotes || 'No preparation notes yet.')}</p>
          ${isTutor ? '<button class="btn btn-outline btn-sm mt-16" id="edit-prep">Edit notes</button>' : ''}
        </div>
        ${isTutor ? `
          <form id="prep-form" hidden>
            <textarea id="prep-text" maxlength="1000">${escapeHtml(s.prepNotes)}</textarea>
            <div class="row mt-16"><button class="btn btn-sm" type="submit">Save notes</button><button class="btn btn-outline btn-sm" type="button" id="prep-cancel">Cancel</button></div>
          </form>` : ''}
      </section>`;

    // ----- attendance (tutor only) -----
    let attendanceCard = '';
    if (isTutor) {
      const learners = getBookedLearners(s.id);
      const records = getAttendance(s.id);
      learners.forEach(l => {
        if (!(l.id in attendanceDraft)) {
          const rec = records.find(r => r.learnerId === l.id);
          attendanceDraft[l.id] = rec ? rec.attended : null;
        }
      });
      attendanceCard = `
        <section class="card">
          <div class="card-head"><h2>Attendance</h2><span class="badge badge-outline">Tutor only</span></div>
          ${learners.length ? `
            <div class="stack-sm">
              ${learners.map(l => `
                <div class="row-between">
                  <span>${escapeHtml(l.name)}</span>
                  <div class="pill-group">
                    <button class="pill ${attendanceDraft[l.id] === true ? 'on-present' : ''}" data-learner="${l.id}" data-attended="1">Present</button>
                    <button class="pill ${attendanceDraft[l.id] === false ? 'on-absent' : ''}" data-learner="${l.id}" data-attended="0">Absent</button>
                  </div>
                </div>`).join('')}
            </div>
            <button class="btn btn-block mt-16" id="save-attendance">Save attendance</button>
            ${records.length ? `<p class="hint">Last saved ${fmtDateTime(records.map(r => r.recordedAt).sort().pop())}</p>` : ''}`
          : '<p class="muted">No learners have booked yet.</p>'}
        </section>`;
    }

    // ----- practice submissions + feedback (tutor only, FR-12 / FR-13) -----
    let practiceCard = '';
    let feedbackCard = '';
    if (isTutor) {
      const subs = viewSessionSubmissions(s.id);
      practiceCard = `
        <section class="card">
          <h2 class="mb-16">Practice submissions (${subs.length})</h2>
          ${subs.length ? subs.map(sub => `
            <div class="post">
              <div class="row-between">
                <strong>${escapeHtml(sub.learnerName)}</strong>
                ${sub.comments.length ? '<span class="badge badge-green">Reviewed</span>' : '<span class="badge badge-amber">To review</span>'}
              </div>
              <div class="small">${escapeHtml(sub.title)}</div>
              <div class="small muted">${escapeHtml(sub.file.name)} · ${fmtSize(sub.file.size)} · ${fmtShortDate(sub.submittedAt)}</div>
              ${sub.comments.map(c => `<div class="reply">${escapeHtml(c.comment)}</div>`).join('')}
              <form class="row mt-16 comment-form" data-id="${sub.id}">
                <input type="text" placeholder="Write a comment..." style="flex:1" maxlength="1000">
                <button class="btn btn-sm" type="submit">Comment</button>
              </form>
            </div>`).join('') : '<p class="muted">No practice work submitted yet.</p>'}
        </section>`;
      const feedback = getSessionFeedback(s.id);
      if (feedback.length) {
        const avg = (feedback.reduce((n, f) => n + f.rating, 0) / feedback.length).toFixed(1);
        feedbackCard = `
          <section class="card">
            <div class="card-head"><h2>Learner feedback</h2><span class="badge">${avg} / 5</span></div>
            ${feedback.map(f => `<div class="post"><strong>${f.rating}/5</strong> · ${escapeHtml(f.learnerName)}<div>${escapeHtml(f.comment || '')}</div></div>`).join('')}
          </section>`;
      }
    }

    $('#page').innerHTML = `
      ${header}
      <div class="grid-main">
        <div class="stack">${announcementCard}${materialCard}${questionCard}${notesCard}</div>
        <div class="stack">${prepCard}${attendanceCard}${practiceCard}${feedbackCard}</div>
      </div>`;

    bindEvents(s);
  }

  function bindEvents(s) {
    const on = (sel, evt, fn) => { const el = $(sel); if (el) el.addEventListener(evt, fn); };

    on('#announce-form', 'submit', e => {
      e.preventDefault();
      if (tryAction(() => postAnnouncement(s.id, user.id, $('#announce-text').value), alertBox, 'Announcement posted. Booked learners were notified.')) render();
    });
    on('#upload-input', 'change', e => {
      const file = e.target.files[0];
      if (file && tryAction(() => uploadMaterial(s.id, user.id, file), alertBox, `${file.name} uploaded.`)) render();
    });
    on('#question-form', 'submit', e => {
      e.preventDefault();
      if (tryAction(() => postQuestion(s.id, user.id, $('#question-text').value), alertBox, 'Question posted. The tutor was notified.')) render();
    });
    on('#note-form', 'submit', e => {
      e.preventDefault();
      if (tryAction(() => postPreparationNote(s.id, user.id, $('#note-text').value), alertBox, 'Preparation note added.')) render();
    });
    document.querySelectorAll('.answer-form').forEach(form => form.addEventListener('submit', e => {
      e.preventDefault();
      if (tryAction(() => answerQuestion(form.dataset.id, user.id, form.querySelector('input').value), alertBox, 'Answer posted.')) render();
    }));

    document.querySelectorAll('.comment-form').forEach(form => form.addEventListener('submit', e => {
      e.preventDefault();
      if (tryAction(() => addTutorComment(form.dataset.id, user.id, form.querySelector('input').value), alertBox, 'Comment sent to the learner.')) render();
    }));
        on('#edit-prep', 'click', () => { $('#prep-view').hidden = true; $('#prep-form').hidden = false; });
    on('#prep-cancel', 'click', () => { $('#prep-view').hidden = false; $('#prep-form').hidden = true; });
    on('#prep-form', 'submit', e => {
      e.preventDefault();
      if (tryAction(() => updateSession(s.id, { prepNotes: $('#prep-text').value }), alertBox, 'Preparation notes saved.')) render();
    });

    document.querySelectorAll('.pill').forEach(pill => pill.addEventListener('click', () => {
      attendanceDraft[pill.dataset.learner] = pill.dataset.attended === '1';
      render();
    }));
    on('#save-attendance', 'click', () => {
      const entries = Object.entries(attendanceDraft).filter(([, v]) => v !== null);
      if (entries.length === 0) { showAlert(alertBox, 'Mark at least one learner as present or absent.'); return; }
      if (tryAction(() => entries.forEach(([learnerId, attended]) => recordAttendance(s.id, learnerId, attended)), alertBox, 'Attendance saved.')) render();
    });

    on('#remind-btn', 'click', () => {
      const count = tryAction(() => sendReminders(s.id), alertBox);
      if (count !== false) showAlert(alertBox, count ? `Reminder sent to ${count} learner${count === 1 ? '' : 's'}.` : 'No learners have booked yet.', count ? 'success' : 'info');
    });
    on('#cancel-session-btn', 'click', () => {
      if (!confirm('Cancel this session? All booked learners will be notified.')) return;
      if (tryAction(() => cancelSession(s.id), alertBox, 'Session cancelled. Learners were notified.')) render();
    });
  }

  render();
})();
