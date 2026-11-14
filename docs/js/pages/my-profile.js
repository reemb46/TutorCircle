// My profile page (tutor) - FR-03 saveTutorProfile()
(function () {
  const user = initPage('myProfile');
  if (!user) return;

  const alertBox = $('#alert');
  $('#public-link').href = `tutor-profile.html?id=${user.id}`;

  let profile = getTutorProfile(user.id);
  const availability = {};
  DAYS.forEach(d => { availability[d] = profile ? [...(profile.availability[d] || [])] : []; });

  function renderStatus() {
    profile = getTutorProfile(user.id);
    let html = '';
    if (!profile || !profile.submittedAt) {
      html = '<div class="alert alert-info">Complete your profile and save it to send your application to a coordinator.</div>';
    } else if (profile.status === 'pending') {
      html = '<div class="alert alert-info">Your application is waiting for coordinator approval.</div>';
    } else if (profile.status === 'rejected') {
      html = '<div class="alert alert-error">Your application was not approved. Update your profile and save to apply again.</div>';
    } else {
      html = '<div class="alert alert-success">You are an approved peer tutor. New subjects or topics need approval again.</div>';
    }
    $('#status').innerHTML = html;
  }

  function subjectOptions(selected) {
    return Object.entries(SUBJECTS).map(([code, name]) =>
      `<option value="${code}" ${code === selected ? 'selected' : ''}>${code} · ${name}</option>`).join('');
  }

  function addSubjectRow(subject = null) {
    const status = subject ? subject.status : 'new';
    const badge = status === 'approved' ? '<span class="badge badge-green">Approved</span>'
      : status === 'pending' ? '<span class="badge badge-amber">Pending</span>'
      : '<span class="badge badge-outline">New</span>';
    $('#subjects').insertAdjacentHTML('beforeend', `
      <div class="subject-row">
        <select class="subject-code">${subjectOptions(subject ? subject.code : '')}</select>
        <input type="text" class="subject-topics" placeholder="Topic tags, separated by commas" value="${subject ? escapeHtml(subject.topics.join(', ')) : ''}">
        ${badge}
        <button type="button" class="btn btn-outline btn-sm remove-subject" aria-label="Remove subject">Remove</button>
      </div>`);
  }

  function renderAvailability() {
    let grid = '<div></div>' + DAYS.map(d => `<div class="avail-head">${d}</div>`).join('');
    SLOTS.forEach(slot => {
      grid += `<div class="avail-label">${slot.replace('-', '–')}</div>`;
      DAYS.forEach(day => {
        const on = availability[day].includes(slot);
        grid += `<button type="button" class="slot slot-btn ${on ? 'on' : ''}" data-day="${day}" data-slot="${slot}" aria-pressed="${on}" aria-label="${day} ${slot}"></button>`;
      });
    });
    $('#avail').innerHTML = grid;
  }

  // ----- fill the form with the saved profile -----
  if (profile) {
    $('#programme').value = profile.programme || '';
    if (profile.year) $('#year').value = String(profile.year);
    $('#experience').value = profile.experience || '';
    document.querySelectorAll('input[name="formats"]').forEach(c => { c.checked = (profile.formats || []).includes(c.value); });
    profile.subjects.forEach(s => addSubjectRow(s));
  }
  if ($('#subjects').children.length === 0) addSubjectRow();
  renderStatus();
  renderAvailability();

  // ----- events -----
  $('#add-subject').addEventListener('click', () => addSubjectRow());
  $('#subjects').addEventListener('click', e => {
    if (e.target.classList.contains('remove-subject')) e.target.closest('.subject-row').remove();
  });
  $('#avail').addEventListener('click', e => {
    const btn = e.target.closest('.slot-btn');
    if (!btn) return;
    const list = availability[btn.dataset.day];
    const i = list.indexOf(btn.dataset.slot);
    if (i >= 0) list.splice(i, 1); else list.push(btn.dataset.slot);
    renderAvailability();
  });

  $('#profile-form').addEventListener('submit', e => {
    e.preventDefault();
    const subjects = [];
    const topicTags = {};
    document.querySelectorAll('.subject-row').forEach(row => {
      const code = row.querySelector('.subject-code').value;
      const tags = row.querySelector('.subject-topics').value.split(',').map(t => t.trim()).filter(Boolean);
      if (!subjects.includes(code)) subjects.push(code);
      topicTags[code] = [...(topicTags[code] || []), ...tags];
    });
    const formats = [...document.querySelectorAll('input[name="formats"]:checked')].map(c => c.value);
    const saved = tryAction(() => saveTutorProfile(user.id, subjects, topicTags, $('#experience').value, availability,
      { programme: $('#programme').value, year: Number($('#year').value), formats }), alertBox, 'Profile saved.');
    if (saved) {
      renderStatus();
      $('#subjects').innerHTML = '';
      saved.subjects.forEach(s => addSubjectRow(s));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
