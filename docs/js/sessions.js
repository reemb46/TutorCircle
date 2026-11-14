/* =====================================================================
   TutorCircle - sessions.js  (section 1.4 Sessions)
   FR-07 Tutors create individual and group sessions.
   FR-08 Learners book, cancel and view session details.
   FR-09 Tutors record attendance; booked learners get reminders.
   ===================================================================== */

// ---------- helpers ----------
function findSession(db, sessionId) {
  const session = db.sessions.find(s => s.id === sessionId);
  if (!session) throw new Error('Session not found.');
  return session;
}

function activeBookings(db, sessionId) {
  return db.bookings.filter(b => b.sessionId === sessionId && b.status === 'booked');
}

function hasStarted(session) {
  return new Date(session.dateTime).getTime() <= Date.now();
}

function requireOwnSession(user, session) {
  if (session.tutorId !== user.id) throw new Error('Only the tutor of this session can do this.');
}

function shortWhen(session) {
  const d = new Date(session.dateTime);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Checks every field and returns clean session data. Throws if something is missing.
function validateSessionInput(db, tutorId, input) {
  const profile = db.tutorProfiles.find(p => p.tutorId === tutorId);
  if (!profile || profile.status !== 'approved') {
    throw new Error('Your tutor application must be approved by a coordinator before you can create sessions.');
  }
  const title = (input.title || '').trim();
  if (!title) throw new Error('Give the session a title.');

  const subject = profile.subjects.find(s => s.code === input.subject && s.status === 'approved');
  if (!subject) throw new Error('Choose a subject you are approved to teach.');
  const topics = (input.topics || []).filter(t => subject.topics.includes(t));
  if (topics.length === 0) throw new Error('Choose at least one topic.');

  if (!['individual', 'group'].includes(input.type)) throw new Error('Choose individual (1-to-1) or group.');

  const objectives = (input.objectives || []).map(o => o.trim()).filter(Boolean);
  if (objectives.length === 0) throw new Error('Add at least one learning objective.');

  const start = new Date(input.dateTime);
  if (isNaN(start.getTime())) throw new Error('Choose a date and start time.');
  if (start.getTime() <= Date.now()) throw new Error('The session must be in the future.');

  const duration = Number(input.duration);
  if (!duration || duration < 15 || duration > 240) throw new Error('Duration must be between 15 and 240 minutes.');

  let capacity = Number(input.capacity);
  if (input.type === 'individual') capacity = 1;
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Capacity must be a whole number of learners.');
  if (input.type === 'group' && (capacity < 2 || capacity > 50)) throw new Error('A group session needs between 2 and 50 learners.');

  const format = input.format === 'online' ? 'online' : 'in-person';
  const locationOrLink = (input.locationOrLink || '').trim();
  if (!locationOrLink) throw new Error(format === 'online' ? 'Add the external meeting link.' : 'Add the room or location.');
  if (format === 'online' && !/^https?:\/\/\S+$/.test(locationOrLink)) {
    throw new Error('The meeting link must start with http:// or https://');
  }

  return {
    title, subject: subject.code, topics, type: input.type, dateTime: start.toISOString(),
    duration, capacity, format, locationOrLink, objectives,
    prepNotes: (input.prepNotes || '').trim(),
    status: input.status === 'draft' ? 'draft' : 'published',
  };
}

/* FR-07 ------------------------------------------------------------- */

// details = { title, subject, topics, format, prepNotes, status } (extra info from the form)
function createSession(tutorId, type, dateTime, objectives, duration, capacity, locationOrLink, details = {}) {
  const user = requireRole(['tutor']);
  requireSelf(user, tutorId);
  const db = loadDB();
  const data = validateSessionInput(db, tutorId,
    { type, dateTime, objectives, duration, capacity, locationOrLink, ...details });
  const session = { id: newId('s'), tutorId, ...data, createdAt: new Date().toISOString() };
  db.sessions.push(session);
  saveDB(db);
  return session;
}

// Helper (Edit session button): updates a session the tutor owns
function updateSession(sessionId, changes) {
  const user = requireRole(['tutor']);
  const db = loadDB();
  const session = findSession(db, sessionId);
  requireOwnSession(user, session);

  const onlyNotes = Object.keys(changes).every(k => k === 'prepNotes');
  if (onlyNotes) {
    session.prepNotes = (changes.prepNotes || '').trim();
  } else {
    const data = validateSessionInput(db, user.id, { ...session, ...changes });
    const booked = activeBookings(db, sessionId).length;
    if (data.capacity < booked) throw new Error(`${booked} learners have already booked, so capacity cannot be lower than that.`);
    Object.assign(session, data);
  }
  activeBookings(db, sessionId).forEach(b =>
    addNotification(db, b.learnerId, `"${session.title}" was updated by the tutor.`, `session.html?id=${sessionId}`));
  saveDB(db);
  return session;
}

// Helper (Cancel session button): cancels the whole session and tells booked learners
function cancelSession(sessionId) {
  const user = requireRole(['tutor']);
  const db = loadDB();
  const session = findSession(db, sessionId);
  requireOwnSession(user, session);
  session.status = 'cancelled';
  activeBookings(db, sessionId).forEach(b =>
    addNotification(db, b.learnerId, `"${session.title}" on ${shortWhen(session)} was cancelled by the tutor.`, `session.html?id=${sessionId}`));
  saveDB(db);
  return session;
}

// Helper: all sessions created by a tutor
function listTutorSessions(tutorId) {
  const db = loadDB();
  return db.sessions.filter(s => s.tutorId === tutorId).map(s => decorateSession(db, s))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}

/* FR-08 ------------------------------------------------------------- */

function viewSessionDetails(sessionId) {
  const db = loadDB();
  return decorateSession(db, findSession(db, sessionId));
}

function getRemainingSeats(sessionId) {
  const db = loadDB();
  const session = findSession(db, sessionId);
  return session.capacity - activeBookings(db, sessionId).length;
}

function bookSession(sessionId, learnerId) {
  const user = requireRole(['learner']);
  requireSelf(user, learnerId);
  const db = loadDB();
  const session = findSession(db, sessionId);

  if (session.status !== 'published') throw new Error('This session is not open for booking.');
  if (hasStarted(session)) throw new Error('This session has already started.');
  const bookings = activeBookings(db, sessionId);
  if (bookings.some(b => b.learnerId === learnerId)) throw new Error('You have already booked this session.');
  if (session.capacity - bookings.length <= 0) throw new Error('Sorry, this session is full. You can join the waiting list instead.');

  // NFR-06: check the learner's schedule so two bookings cannot overlap
  const start = new Date(session.dateTime).getTime();
  const end = start + session.duration * 60000;
  const clash = db.bookings
    .filter(b => b.learnerId === learnerId && b.status === 'booked')
    .map(b => db.sessions.find(x => x.id === b.sessionId))
    .find(other => {
      if (!other || other.status !== 'published') return false;
      const oStart = new Date(other.dateTime).getTime();
      const oEnd = oStart + other.duration * 60000;
      return start < oEnd && oStart < end;
    });
  if (clash) throw new Error(`This overlaps with "${clash.title}" which you already booked.`);

  const booking = {
    id: newId('b'), sessionId, learnerId, status: 'booked', bookedAt: new Date().toISOString(),
    reminders: { oneDay: true, oneHour: true, email: false }, remindersSent: [],
  };
  db.bookings.push(booking);
  // Booking a place takes the learner off the waiting list (FR-17)
  db.waitingList = db.waitingList.filter(w => !(w.sessionId === sessionId && w.learnerId === learnerId));
  addNotification(db, learnerId, `You're booked on "${session.title}" (${shortWhen(session)}).`, `session.html?id=${sessionId}`);
  addNotification(db, session.tutorId, `${user.name} booked "${session.title}".`, `workspace.html?id=${sessionId}`);
  saveDB(db);
  return booking;
}

function cancelBooking(sessionId, learnerId) {
  const user = requireRole(['learner']);
  requireSelf(user, learnerId);
  const db = loadDB();
  const session = findSession(db, sessionId);
  const booking = activeBookings(db, sessionId).find(b => b.learnerId === learnerId);
  if (!booking) throw new Error("You don't have a booking for this session.");

  const twoHours = 2 * 60 * 60 * 1000;
  if (new Date(session.dateTime).getTime() - Date.now() < twoHours) {
    throw new Error('Bookings can only be cancelled at least 2 hours before the session starts.');
  }
  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();
  // Tell the first learner on the waiting list that a place opened (FR-17)
  const next = db.waitingList.filter(w => w.sessionId === sessionId).sort((a, b) => a.at.localeCompare(b.at))[0];
  if (next) addNotification(db, next.learnerId, `A place opened up in "${session.title}". Book it before someone else does!`, `session.html?id=${sessionId}`);
  addNotification(db, session.tutorId, `${user.name} cancelled their booking for "${session.title}".`, `workspace.html?id=${sessionId}`);
  saveDB(db);
  return true;
}

// Helper: the learner's active booking on a session (or undefined)
function getLearnerBooking(sessionId, learnerId) {
  return activeBookings(loadDB(), sessionId).find(b => b.learnerId === learnerId);
}

// Helper: all of a learner's active bookings, with session details
function listLearnerBookings(learnerId) {
  const db = loadDB();
  return db.bookings.filter(b => b.learnerId === learnerId && b.status === 'booked')
    .map(b => ({ booking: b, session: decorateSession(db, findSession(db, b.sessionId)) }))
    .sort((a, b) => a.session.dateTime.localeCompare(b.session.dateTime));
}

// Helper: learner chooses which reminders they want (Reminders card)
function updateReminderPreferences(sessionId, learnerId, prefs) {
  const user = requireRole(['learner']);
  requireSelf(user, learnerId);
  const db = loadDB();
  const booking = activeBookings(db, sessionId).find(b => b.learnerId === learnerId);
  if (!booking) throw new Error('Book the session first.');
  booking.reminders = { ...booking.reminders, ...prefs };
  saveDB(db);
  return booking.reminders;
}

/* FR-09 ------------------------------------------------------------- */

function getBookedLearners(sessionId) {
  const user = requireRole(['tutor', 'coordinator', 'admin']);
  const db = loadDB();
  const session = findSession(db, sessionId);
  if (user.role === 'tutor') requireOwnSession(user, session);
  return activeBookings(db, sessionId).map(b => {
    const learner = db.users.find(u => u.id === b.learnerId);
    return { id: learner.id, name: learner.name, email: learner.email, bookedAt: b.bookedAt };
  });
}

function recordAttendance(sessionId, learnerId, attended) {
  const user = requireRole(['tutor']);
  const db = loadDB();
  const session = findSession(db, sessionId);
  requireOwnSession(user, session);
  if (!activeBookings(db, sessionId).some(b => b.learnerId === learnerId)) {
    throw new Error('This learner has not booked the session.');
  }
  const record = db.attendance.find(a => a.sessionId === sessionId && a.learnerId === learnerId);
  if (record) {
    record.attended = !!attended;
    record.recordedAt = new Date().toISOString();
  } else {
    db.attendance.push({ sessionId, learnerId, attended: !!attended, recordedAt: new Date().toISOString(), recordedBy: user.id });
  }
  saveDB(db);
  return true;
}

function getAttendance(sessionId) {
  const user = requireRole(['tutor', 'coordinator', 'admin']);
  const db = loadDB();
  const session = findSession(db, sessionId);
  if (user.role === 'tutor') requireOwnSession(user, session);
  return db.attendance.filter(a => a.sessionId === sessionId)
    .map(a => ({ ...a, learnerName: userName(db, a.learnerId) }));
}

// Tutor presses "Send reminders": every booked learner gets a reminder now
function sendReminders(sessionId) {
  const user = requireRole(['tutor', 'coordinator', 'admin']);
  const db = loadDB();
  const session = findSession(db, sessionId);
  if (user.role === 'tutor') requireOwnSession(user, session);
  if (hasStarted(session)) throw new Error('This session has already started.');
  const bookings = activeBookings(db, sessionId);
  bookings.forEach(b => addNotification(db, b.learnerId,
    `Reminder: "${session.title}" is on ${shortWhen(session)} - ${session.locationOrLink}.`, `session.html?id=${sessionId}`));
  saveDB(db);
  return bookings.length;
}

// Helper (automatic reminders): runs when a learner opens the site and
// sends the "1 day before" / "1 hour before" reminders they chose.
function runDueReminders(learnerId) {
  const db = loadDB();
  const now = Date.now();
  let changed = false;
  db.bookings.filter(b => b.learnerId === learnerId && b.status === 'booked').forEach(b => {
    const session = db.sessions.find(s => s.id === b.sessionId);
    if (!session || session.status !== 'published') return;
    const msLeft = new Date(session.dateTime).getTime() - now;
    if (msLeft <= 0) return;
    const checks = [
      { key: '1d', on: b.reminders.oneDay, within: 24 * 3600000, label: 'tomorrow' },
      { key: '1h', on: b.reminders.oneHour, within: 3600000, label: 'in less than an hour' },
    ];
    checks.forEach(c => {
      if (c.on && msLeft <= c.within && !b.remindersSent.includes(c.key)) {
        const email = b.reminders.email ? ' (an email copy would also be sent)' : '';
        addNotification(db, learnerId, `Reminder: "${session.title}" starts ${c.label} - ${session.locationOrLink}.${email}`, `session.html?id=${session.id}`);
        b.remindersSent.push(c.key);
        changed = true;
      }
    });
  });
  if (changed) saveDB(db);
}
