/* =====================================================================
   TutorCircle - learning.js  (section 1.6 Practice and Feedback)
   FR-12 Learners submit practice work and receive tutor comments.
   FR-13 Learners view session history and leave feedback on attended
         sessions.
   ===================================================================== */

function findSubmission(db, submissionId) {
  const sub = db.submissions.find(s => s.id === submissionId);
  if (!sub) throw new Error('Submission not found.');
  return sub;
}

// Helper: adds session title, tutor name and commenter names
function decorateSubmission(db, sub) {
  const session = db.sessions.find(s => s.id === sub.sessionId) || {};
  return {
    ...sub,
    sessionTitle: session.title || 'Unknown session',
    tutorId: session.tutorId,
    tutorName: userName(db, session.tutorId),
    learnerName: userName(db, sub.learnerId),
    comments: sub.comments.map(c => ({ ...c, tutorName: userName(db, c.tutorId) })),
  };
}

/* FR-12 ------------------------------------------------------------- */

function submitPractice(sessionId, learnerId, file, title = '') {
  const user = requireRole(['learner']);
  requireSelf(user, learnerId);
  const db = loadDB();
  const session = findSession(db, sessionId);
  const booked = db.bookings.some(b => b.sessionId === sessionId && b.learnerId === learnerId && b.status === 'booked');
  if (!booked) throw new Error('You can only submit practice work for sessions you booked.');

  const info = fileInfo(file);
  const sub = {
    id: newId('sub'), sessionId, learnerId,
    title: (title || '').trim() || info.name,
    file: info, submittedAt: new Date().toISOString(), comments: [],
  };
  db.submissions.push(sub);
  addNotification(db, session.tutorId, `${user.name} submitted practice work for "${session.title}".`, `workspace.html?id=${sessionId}`);
  saveDB(db);
  return sub;
}

function addTutorComment(submissionId, tutorId, comment) {
  const user = requireRole(['tutor']);
  requireSelf(user, tutorId);
  const db = loadDB();
  const sub = findSubmission(db, submissionId);
  const session = findSession(db, sub.sessionId);
  requireOwnSession(user, session);
  const text = requireText(comment, 'comment');
  sub.comments.push({ tutorId, comment: text, at: new Date().toISOString() });
  addNotification(db, sub.learnerId, `${user.name} commented on your practice work "${sub.title}".`, 'my-learning.html');
  saveDB(db);
  return sub;
}

function viewSubmissions(learnerId) {
  const user = requireRole(['learner', 'coordinator', 'admin']);
  if (user.role === 'learner') requireSelf(user, learnerId);
  const db = loadDB();
  return db.submissions.filter(s => s.learnerId === learnerId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map(s => decorateSubmission(db, s));
}

// Helper (workspace, tutor view): every submission for one session
function viewSessionSubmissions(sessionId) {
  const user = requireRole(['tutor', 'coordinator', 'admin']);
  const db = loadDB();
  const session = findSession(db, sessionId);
  if (user.role === 'tutor') requireOwnSession(user, session);
  return db.submissions.filter(s => s.sessionId === sessionId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map(s => decorateSubmission(db, s));
}

/* FR-13 ------------------------------------------------------------- */

// Past sessions the learner booked (newest first), with attendance and feedback status
function viewSessionHistory(learnerId) {
  const user = requireRole(['learner', 'coordinator', 'admin']);
  if (user.role === 'learner') requireSelf(user, learnerId);
  const db = loadDB();
  return db.bookings
    .filter(b => b.learnerId === learnerId)
    .map(b => ({ booking: b, session: db.sessions.find(s => s.id === b.sessionId) }))
    .filter(x => x.session && hasStarted(x.session))
    .sort((a, b) => b.session.dateTime.localeCompare(a.session.dateTime))
    .map(({ booking, session }) => {
      const record = db.attendance.find(a => a.sessionId === session.id && a.learnerId === learnerId);
      return {
        session: decorateSession(db, session),
        bookingStatus: booking.status,                 // 'booked' or 'cancelled'
        attended: record ? record.attended : null,     // true, false, or null = not recorded
        feedbackGiven: db.feedback.some(f => f.sessionId === session.id && f.learnerId === learnerId),
      };
    });
}

function leaveFeedback(sessionId, learnerId, rating, comment) {
  const user = requireRole(['learner']);
  requireSelf(user, learnerId);
  // FR-15: only learners who attended may give feedback
  if (!canGiveFeedback(sessionId, learnerId)) {
    throw new Error('You can only leave feedback on sessions you attended.');
  }
  const db = loadDB();
  if (db.feedback.some(f => f.sessionId === sessionId && f.learnerId === learnerId)) {
    throw new Error('You already left feedback on this session.');
  }
  rating = Number(rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a rating from 1 to 5.');
  const session = findSession(db, sessionId);
  const entry = {
    id: newId('f'), sessionId, learnerId, rating,
    comment: (comment || '').trim().slice(0, 1000), at: new Date().toISOString(),
  };
  db.feedback.push(entry);
  addNotification(db, session.tutorId, `New feedback (${rating}/5) on "${session.title}".`, `workspace.html?id=${sessionId}`);
  saveDB(db);
  return entry;
}

// Helper: feedback a session received (tutor workspace).
// NFR-09: feedback is only visible to the session's tutor and the learner who wrote it.
function getSessionFeedback(sessionId) {
  const user = requireRole(['tutor', 'learner']);
  const db = loadDB();
  const session = findSession(db, sessionId);
  return db.feedback
    .filter(f => f.sessionId === sessionId)
    .filter(f => session.tutorId === user.id || f.learnerId === user.id)
    .map(f => ({ ...f, learnerName: userName(db, f.learnerId) }));
}
