/* =====================================================================
   TutorCircle - tests.js  (NFR-14 automated tests)
   Open tests.html to run. Each test starts from fresh sample data.
   ===================================================================== */
(function () {
  const results = [];

  // ---- tiny test helpers ----
  function test(name, fn) {
    resetDB();
    loadDB();
    try {
      fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, error: err.message });
    }
    logOut();
  }
  function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
  }
  function assertThrows(fn, expectedText) {
    try { fn(); } catch (err) {
      if (expectedText && !err.message.includes(expectedText)) {
        throw new Error(`Expected error containing "${expectedText}" but got "${err.message}"`);
      }
      return;
    }
    throw new Error('Expected an error but none was thrown');
  }
  const as = email => logIn(email, 'password123');
  const LEARNER = 'learner@aubh.edu.bh';
  const TUTOR = 'tutor@aubh.edu.bh';
  const COORD = 'coordinator@aubh.edu.bh';

  // ---- keep the user's demo data safe ----
  const backup = { db: localStorage.getItem(DB_KEY), user: localStorage.getItem(SESSION_KEY) };

  /* ---------- 1.1 Accounts and roles ---------- */
  test('FR-01 registerUser rejects an email that is already registered', () => {
    assertThrows(() => registerUser('Someone', LEARNER, 'secret1', 'learner'), 'already exists');
  });
  test('FR-01 only an admin can create a coordinator', () => {
    assertThrows(() => registerUser('New Coord', 'nc@aubh.edu.bh', 'secret1', 'coordinator'), 'admin');
    as('admin@aubh.edu.bh');
    const u = registerUser('New Coord', 'nc@aubh.edu.bh', 'secret1', 'coordinator');
    assert(u.role === 'coordinator');
  });
  test('FR-01 logIn rejects a wrong password', () => {
    assertThrows(() => logIn(LEARNER, 'wrong'), 'Wrong email or password');
  });
  test('FR-02 canAccess: a learner cannot open coordinator features', () => {
    assert(canAccess('learner', 'coordinator') === false);
    assert(canAccess('coordinator', 'coordinator') === true);
  });

  /* ---------- 1.4 Booking (core logic) ---------- */
  test('FR-08 bookSession reserves a place and lowers remaining seats', () => {
    as(LEARNER);
    const before = getRemainingSeats('s_usecase');
    bookSession('s_usecase', 'u_learner1');
    assert(getRemainingSeats('s_usecase') === before - 1, 'seats did not go down by 1');
  });
  test('NFR-05 booking twice does not create a duplicate booking', () => {
    as(LEARNER);
    bookSession('s_usecase', 'u_learner1');
    assertThrows(() => bookSession('s_usecase', 'u_learner1'), 'already booked');
    const count = loadDB().bookings.filter(b => b.sessionId === 's_usecase' && b.learnerId === 'u_learner1' && b.status === 'booked').length;
    assert(count === 1, `expected 1 booking, found ${count}`);
  });
  test('NFR-04 a full session refuses new bookings', () => {
    as(LEARNER);
    assert(getRemainingSeats('s_testing') === 0);
    assertThrows(() => bookSession('s_testing', 'u_learner1'), 'full');
  });
  test('NFR-06 overlapping bookings are refused', () => {
    // Make a second session at the same time as s_usecase
    const db = loadDB();
    const clash = { ...db.sessions.find(s => s.id === 's_usecase'), id: 's_clash', title: 'Clash', tutorId: 'u_tutor3' };
    db.sessions.push(clash);
    saveDB(db);
    as(LEARNER);
    bookSession('s_usecase', 'u_learner1');
    assertThrows(() => bookSession('s_clash', 'u_learner1'), 'overlaps');
  });
  test('FR-08 cancelBooking frees the place', () => {
    as(LEARNER);
    const before = getRemainingSeats('s_usecase');
    bookSession('s_usecase', 'u_learner1');
    cancelBooking('s_usecase', 'u_learner1');
    assert(getRemainingSeats('s_usecase') === before);
  });
  test('FR-02 a tutor cannot book a session', () => {
    as(TUTOR);
    assertThrows(() => bookSession('s_usecase', 'u_tutor1'), 'learner');
  });
  test('FR-02 a learner cannot book for someone else', () => {
    as(LEARNER);
    assertThrows(() => bookSession('s_usecase', 'u_learner2'), 'own account');
  });

  /* ---------- 1.4 Creating sessions and attendance ---------- */
  test('FR-07 createSession rejects a session with missing details', () => {
    as(TUTOR);
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    assertThrows(() => createSession('u_tutor1', 'group', future, [], 60, 5, 'Room 1',
      { title: 'X', subject: 'SWEN 360', topics: ['UML diagrams'] }), 'objective');
    assertThrows(() => createSession('u_tutor1', 'group', future, ['Learn'], 60, 5, '',
      { title: 'X', subject: 'SWEN 360', topics: ['UML diagrams'] }), 'location');
  });
  test('FR-07 createSession works with all details and individual = 1 place', () => {
    as(TUTOR);
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    const s = createSession('u_tutor1', 'individual', future, ['Learn'], 45, 10, 'Room 1',
      { title: 'Help', subject: 'SWEN 360', topics: ['Use cases'] });
    assert(s.capacity === 1, 'individual session should have capacity 1');
  });
  test('FR-07 a tutor cannot teach a subject that is not approved', () => {
    as(TUTOR);
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    assertThrows(() => createSession('u_tutor1', 'group', future, ['Learn'], 60, 4, 'Room 1',
      { title: 'Lists', subject: 'CSCI 210', topics: ['Linked lists'] }), 'approved');
  });
  test('FR-09 recordAttendance saves present/absent', () => {
    as(TUTOR);
    recordAttendance('s_uml', 'u_learner1', true);
    const rec = getAttendance('s_uml').find(a => a.learnerId === 'u_learner1');
    assert(rec && rec.attended === true);
  });

  /* ---------- 1.3 Search ---------- */
  test('FR-05 searchSessions finds sessions by topic', () => {
    as(LEARNER);
    const results = searchSessions('', 'UML sequence');
    assert(results.some(s => s.id === 's_uml'));
  });
  test('FR-06 applyFilters keeps only online 1-to-1 sessions', () => {
    as(LEARNER);
    const out = applyFilters(searchSessions('', ''), { formats: ['online'], groupSize: 'individual' });
    assert(out.length > 0 && out.every(s => s.format === 'online' && s.type === 'individual'));
  });

  /* ---------- 1.6, 1.7 Feedback and complaints ---------- */
  test('FR-15 only learners who attended can leave feedback', () => {
    as('layla@aubh.edu.bh'); // marked absent in s_past_class
    assertThrows(() => leaveFeedback('s_past_class', 'u_learner3', 5, 'Great'), 'attended');
    logOut();
    as(LEARNER);             // marked present
    leaveFeedback('s_past_class', 'u_learner1', 5, 'Great');
    assertThrows(() => leaveFeedback('s_past_class', 'u_learner1', 4, 'Again'), 'already');
  });
  test('FR-16 decisions are added, never overwritten', () => {
    as(COORD);
    recordDecision('c_1', 'u_coord', 'Spoke to the tutor', 'In review');
    recordDecision('c_1', 'u_coord', 'Tutor apologised', 'Resolved');
    const h = viewComplaintHistory('c_1');
    assert(h.decisions.length === 2 && h.complaint.status === 'Resolved');
  });
  test('FR-14 missed-sessions report lists Layla with 3 misses', () => {
    as(COORD);
    const row = getMissedSessionsReport(2).find(r => r.userId === 'u_learner3');
    assert(row && row.misses === 3);
  });

  /* ---------- 1.8 Demand ---------- */
  test('FR-17 joinWaitingList only works on a full session', () => {
    as('omar@aubh.edu.bh');
    assertThrows(() => joinWaitingList('s_usecase', 'u_learner5'), 'places left');
  });
  test('FR-18 checkDemand creates one suggestion when demand > limit', () => {
    const first = checkDemand('Trees');   // 4 learners searched, limit 3
    const second = checkDemand('Trees');  // already pending -> no duplicate
    assert(first && first.status === 'Pending' && second === null);
    as(COORD);
    recordSuggestionDecision(first.id, 'u_coord', 'accepted');
    assert(listSuggestions()[0].status === 'Accepted');
  });

  // ---- put the demo data back ----
  if (backup.db) localStorage.setItem(DB_KEY, backup.db); else localStorage.removeItem(DB_KEY);
  if (backup.user) localStorage.setItem(SESSION_KEY, backup.user); else localStorage.removeItem(SESSION_KEY);

  // ---- show results ----
  const passed = results.filter(r => r.ok).length;
  document.getElementById('summary').innerHTML =
    `<div class="alert ${passed === results.length ? 'alert-success' : 'alert-error'}">${passed} of ${results.length} tests passed</div>`;
  document.getElementById('results').innerHTML = results.map(r => `
    <div class="post">
      <span class="badge ${r.ok ? 'badge-green' : 'badge-red'}">${r.ok ? 'PASS' : 'FAIL'}</span>
      <span style="margin-left:8px">${escapeHtml(r.name)}</span>
      ${r.ok ? '' : `<div class="small" style="color:var(--red);margin-top:4px">${escapeHtml(r.error)}</div>`}
    </div>`).join('');
})();
