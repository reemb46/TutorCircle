// Create a session page (Figure 4) - uses createSession() / updateSession()
(function () {
  const user = initPage('createSession');
  if (!user) return;

  const alertBox = $('#alert');
  const db = loadDB();
  const profile = db.tutorProfiles.find(p => p.tutorId === user.id);
  const approvedSubjects = profile ? profile.subjects.filter(s => s.status === 'approved') : [];
  const editId = getParam('edit');
  const editing = editId ? viewSessionDetails(editId) : null;

  const state = { type: 'group', format: 'in-person', topics: [] };

  // Tutors who are not approved yet cannot publish (FR-07 + coordinator approval)
  if (!profile || profile.status !== 'approved' || approvedSubjects.length === 0) {
    showAlert(alertBox, 'Your tutor application is waiting for coordinator approval. You can create sessions once a coordinator approves you and at least one subject.', 'info');
    $('#publish').disabled = true;
    $('#save-draft').disabled = true;
  }

  // ----- fill dropdowns -----
  $('#subject').innerHTML = approvedSubjects.map(s =>
    `<option value="${escapeHtml(s.code)}">${escapeHtml(s.code)} · ${escapeHtml(SUBJECTS[s.code] || '')}</option>`).join('')
    || '<option value="">No approved subjects</option>';

  for (let mins = 8 * 60; mins <= 20 * 60; mins += 30) {
    const d = new Date(2000, 0, 1, Math.floor(mins / 60), mins % 60);
    const value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    $('#time').insertAdjacentHTML('beforeend', `<option value="${value}">${fmtTime(d)}</option>`);
  }
  $('#time').value = '16:00';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  $('#date').min = new Date().toISOString().slice(0, 10);
  $('#date').value = tomorrow.toISOString().slice(0, 10);

  function renderTopics() {
    const subject = approvedSubjects.find(s => s.code === $('#subject').value);
    const topics = subject ? subject.topics : [];
    state.topics = state.topics.filter(t => topics.includes(t));
    $('#topics').innerHTML = topics.map(t =>
      `<button type="button" class="chip ${state.topics.includes(t) ? 'selected' : ''}" data-topic="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('');
  }

  function addObjectiveInput(value = '') {
    const count = $('#objectives').children.length + 1;
    $('#objectives').insertAdjacentHTML('beforeend',
      `<input type="text" class="objective" placeholder="${count}. What will learners be able to do?" value="${escapeHtml(value)}" maxlength="120">`);
  }

  function selectOption(groupId, value) {
    document.querySelectorAll(`#${groupId} .option`).forEach(o => o.classList.toggle('selected', o.dataset.value === value));
  }

  function setType(type) {
    state.type = type;
    selectOption('type-options', type);
    $('#capacity').disabled = type === 'individual';
    if (type === 'individual') $('#capacity').value = 1;
    else if (Number($('#capacity').value) < 2) $('#capacity').value = 6;
  }

  function setFormat(format) {
    state.format = format;
    selectOption('format-options', format);
    $('#location').placeholder = format === 'online' ? 'https://meet.google.com/...' : 'e.g. Room S-204';
  }

  // Collects the form into the values createSession() needs
  function readForm(status) {
    return {
      type: state.type,
      dateTime: $('#date').value && $('#time').value ? new Date(`${$('#date').value}T${$('#time').value}`).toISOString() : '',
      objectives: [...document.querySelectorAll('.objective')].map(i => i.value),
      duration: Number($('#duration').value),
      capacity: Number($('#capacity').value),
      locationOrLink: $('#location').value,
      details: {
        title: $('#title').value,
        subject: $('#subject').value,
        topics: state.topics,
        format: state.format,
        prepNotes: $('#prep').value,
        status,
      },
    };
  }

  function renderPreview() {
    const f = readForm('published');
    const start = f.dateTime ? new Date(f.dateTime) : null;
    const fake = { dateTime: f.dateTime, duration: f.duration };
    $('#preview').innerHTML = `
      <h2>${escapeHtml(f.details.title || 'Session title')}</h2>
      <p class="meta">${start ? `${fmtDate(f.dateTime)} · ${fmtTimeRange(fake)}` : 'Date and time'} · ${escapeHtml(f.locationOrLink ? (state.format === 'online' ? 'Online link' : f.locationOrLink) : 'Location')}</p>
      <div class="badges">
        <span class="badge">${state.type === 'individual' ? '1-to-1' : 'Group'}</span>
        <span class="badge">${state.format === 'online' ? 'Online' : 'In person'}</span>
        <span class="badge badge-outline">${f.capacity || 0} place${f.capacity === 1 ? '' : 's'}</span>
        ${state.topics.map(t => `<span class="badge badge-outline">${escapeHtml(t)}</span>`).join('')}
      </div>
      <ul class="bullets mt-16 small">${f.objectives.filter(o => o.trim()).map(o => `<li>${escapeHtml(o)}</li>`).join('') || '<li class="muted">Learning objectives</li>'}</ul>
      <button type="button" class="btn btn-block mt-16" disabled>Book a place</button>`;
  }

  function save(status) {
    const f = readForm(status);
    const session = tryAction(() => editing
      ? updateSession(editing.id, { type: f.type, dateTime: f.dateTime, objectives: f.objectives, duration: f.duration, capacity: f.capacity, locationOrLink: f.locationOrLink, ...f.details })
      : createSession(user.id, f.type, f.dateTime, f.objectives, f.duration, f.capacity, f.locationOrLink, f.details),
    alertBox);
    if (!session) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    location.href = status === 'draft' ? 'my-sessions.html' : `workspace.html?id=${session.id}`;
  }

  // ----- events -----
  $('#subject').addEventListener('change', () => { renderTopics(); renderPreview(); });
  $('#topics').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const t = chip.dataset.topic;
    state.topics = state.topics.includes(t) ? state.topics.filter(x => x !== t) : [...state.topics, t];
    renderTopics();
    renderPreview();
  });
  document.querySelectorAll('#type-options .option').forEach(o => o.addEventListener('click', () => { setType(o.dataset.value); renderPreview(); }));
  document.querySelectorAll('#format-options .option').forEach(o => o.addEventListener('click', () => { setFormat(o.dataset.value); renderPreview(); }));
  $('#add-objective').addEventListener('click', () => { addObjectiveInput(); $('#objectives').lastElementChild.focus(); });
  $('#session-form').addEventListener('input', renderPreview);
  $('#session-form').addEventListener('change', renderPreview);
  $('#session-form').addEventListener('submit', e => { e.preventDefault(); save('published'); });
  $('#save-draft').addEventListener('click', () => save('draft'));

  // ----- start: new session or edit an existing one -----
  if (editing) {
    if (editing.tutorId !== user.id) { location.href = 'my-sessions.html'; return; }
    $('#form-title').textContent = 'Edit session';
    document.title = 'Edit session · TutorCircle';
    $('#publish').textContent = editing.status === 'draft' ? 'Publish session' : 'Save changes';
    $('#title').value = editing.title;
    $('#subject').value = editing.subject;
    state.topics = [...editing.topics];
    setType(editing.type);
    setFormat(editing.format);
    const start = new Date(editing.dateTime);
    $('#date').value = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    $('#time').value = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    $('#duration').value = String(editing.duration);
    $('#capacity').value = editing.capacity;
    $('#location').value = editing.locationOrLink;
    $('#prep').value = editing.prepNotes;
    editing.objectives.forEach(o => addObjectiveInput(o));
  } else {
    addObjectiveInput();
    addObjectiveInput();
  }
  renderTopics();
  renderPreview();
})();
