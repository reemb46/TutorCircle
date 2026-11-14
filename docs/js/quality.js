/* =====================================================================
   TutorCircle - quality.js
   Section 1.7 Tutor Coordination and Service Quality (Advanced - Sprint 3)
   FR-14 Coordinators review tutor applications, approve subject coverage
         and see reports of repeated missed sessions.
         (also reuses listTutorApplications, approveTutor, rejectTutor and
          approveSubjectCoverage from profiles.js)
   FR-15 Feedback can be given only by learners who attended a session.
   FR-16 Complaints and coordinator decisions are recorded and traceable.
   ===================================================================== */

const COMPLAINT_STATUSES = ['Open', 'In review', 'Resolved'];

/* FR-14 ------------------------------------------------------------- */

// One application in full so the coordinator can review it
function reviewTutorApplication(tutorId) {
  requireRole(['coordinator', 'admin']);
  const profile = getTutorProfile(tutorId);
  if (!profile) throw new Error('Tutor application not found.');
  const db = loadDB();
  const sessionsTaught = db.sessions.filter(s => s.tutorId === tutorId && s.status === 'published').length;
  return { ...profile, sessionsTaught };
}

// Everyone who missed at least `minimumMisses` sessions: learners marked
// absent (attendance records from FR-09) and tutors who cancelled sessions
function getMissedSessionsReport(minimumMisses = 2) {
  requireRole(['coordinator', 'admin']);
  const min = Math.max(1, Number(minimumMisses) || 1);
  const db = loadDB();
  const byUser = {};
  db.attendance.filter(a => a.attended === false).forEach(a => {
    const session = db.sessions.find(s => s.id === a.sessionId);
    if (!session) return;
    if (!byUser[a.learnerId]) byUser[a.learnerId] = { userId: a.learnerId, misses: 0, lastMissed: null, sessions: [] };
    const row = byUser[a.learnerId];
    row.misses += 1;
    row.sessions.push(session.title);
    if (!row.lastMissed || session.dateTime > row.lastMissed) row.lastMissed = session.dateTime;
  });
  // Tutors who cancelled their own sessions also count as missed sessions (US-15)
  db.sessions.filter(s => s.status === 'cancelled').forEach(session => {
    if (!byUser[session.tutorId]) byUser[session.tutorId] = { userId: session.tutorId, misses: 0, lastMissed: null, sessions: [] };
    const row = byUser[session.tutorId];
    row.misses += 1;
    row.sessions.push(session.title + ' (cancelled)');
    if (!row.lastMissed || session.dateTime > row.lastMissed) row.lastMissed = session.dateTime;
  });
  return Object.values(byUser)
    .filter(r => r.misses >= min)
    .map(r => {
      const u = db.users.find(x => x.id === r.userId) || {};
      return { ...r, name: u.name || 'Unknown user', email: u.email || '', role: u.role || '' };
    })
    .sort((a, b) => b.misses - a.misses || b.lastMissed.localeCompare(a.lastMissed));
}

/* FR-15 ------------------------------------------------------------- */

function canGiveFeedback(sessionId, learnerId) {
  return loadDB().attendance.some(a =>
    a.sessionId === sessionId && a.learnerId === learnerId && a.attended === true);
}

/* FR-16 ------------------------------------------------------------- */

function recordComplaint(fromUserId, sessionId, description) {
  const user = requireRole(['learner', 'tutor']);
  requireSelf(user, fromUserId);
  const db = loadDB();
  const session = findSession(db, sessionId);
  const text = (description || '').trim();
  if (text.length < 10) throw new Error('Describe the problem in at least 10 characters.');
  if (text.length > 1000) throw new Error('Keep the description under 1000 characters.');
  const complaint = {
    id: newId('c'), fromUserId, sessionId, description: text,
    date: new Date().toISOString(), status: 'Open',
  };
  db.complaints.push(complaint);
  notifyCoordinators(db, `${user.name} made a complaint about "${session.title}".`);
  saveDB(db);
  return complaint;
}

// newStatus: 'Open', 'In review' or 'Resolved'.
// Every decision is added as a new record - earlier ones are never overwritten.
function recordDecision(complaintId, coordinatorId, decision, newStatus = 'Resolved') {
  const user = requireRole(['coordinator', 'admin']);
  requireSelf(user, coordinatorId);
  if (!COMPLAINT_STATUSES.includes(newStatus)) throw new Error('Choose a valid status.');
  const db = loadDB();
  const complaint = db.complaints.find(c => c.id === complaintId);
  if (!complaint) throw new Error('Complaint not found.');
  const text = (decision || '').trim();
  if (!text) throw new Error('Write the decision first.');

  const entry = {
    id: newId('d'), complaintId, coordinatorId, decision: text,
    statusBefore: complaint.status, statusAfter: newStatus, at: new Date().toISOString(),
  };
  db.decisions.push(entry);
  complaint.status = newStatus;
  addAudit(db, coordinatorId, 'Complaint decision', `${complaintId}: ${text} (${newStatus})`);
  addNotification(db, complaint.fromUserId, `A coordinator responded to your complaint: "${text}" – status: ${newStatus}.`, 'my-learning.html');
  saveDB(db);
  return entry;
}

// Helper: adds names and the session title to a complaint
function decorateComplaint(db, c) {
  const session = db.sessions.find(s => s.id === c.sessionId) || {};
  return {
    ...c,
    fromName: userName(db, c.fromUserId),
    sessionTitle: session.title || 'Unknown session',
    tutorName: userName(db, session.tutorId),
    decisionCount: db.decisions.filter(d => d.complaintId === c.id).length,
  };
}

// status: 'Open', 'In review', 'Resolved' or 'all'
function listComplaints(status = 'all') {
  requireRole(['coordinator', 'admin']);
  const db = loadDB();
  return db.complaints
    .filter(c => !status || status === 'all' || c.status === status)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(c => decorateComplaint(db, c));
}

// A complaint and every decision on it, oldest first
function viewComplaintHistory(complaintId) {
  const user = requireRole(['coordinator', 'admin', 'learner', 'tutor']);
  const db = loadDB();
  const complaint = db.complaints.find(c => c.id === complaintId);
  if (!complaint) throw new Error('Complaint not found.');
  if ((user.role === 'learner' || user.role === 'tutor') && complaint.fromUserId !== user.id) {
    throw new Error('You can only view your own complaints.');
  }
  const decisions = db.decisions
    .filter(d => d.complaintId === complaintId)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(d => ({ ...d, coordinatorName: userName(db, d.coordinatorId) }));
  return { complaint: decorateComplaint(db, complaint), decisions };
}

// Helper: complaints made by one user (My learning page)
function listMyComplaints(userId) {
  const user = requireRole(['learner', 'tutor']);
  requireSelf(user, userId);
  const db = loadDB();
  return db.complaints.filter(c => c.fromUserId === userId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(c => decorateComplaint(db, c));
}

// Helper: every recorded coordinator decision (approvals, complaints, suggestions)
function getAuditLog() {
  requireRole(['coordinator', 'admin']);
  const db = loadDB();
  return db.auditLog.slice().sort((a, b) => b.at.localeCompare(a.at))
    .map(a => ({ ...a, actorName: userName(db, a.actorId) }));
}
