/* =====================================================================
   TutorCircle - insights.js
   Section 1.8 Demand and Session Insights (Advanced - Sprint 2)
   FR-17 Coordinators see unmet demand, waiting-list lengths, attendance
         patterns and tutor availability by topic.
   FR-18 The system suggests extra sessions when demand exceeds a
         configurable limit, and records if the coordinator acted on it.
   ===================================================================== */

// Helper: does this session cover the topic? (case-insensitive)
function sessionHasTopic(session, topic) {
  return session.topics.some(t => t.toLowerCase() === String(topic).toLowerCase());
}

// Helper: every topic the system knows about
function knownTopics(db = loadDB()) {
  const topics = new Set();
  db.sessions.forEach(s => s.topics.forEach(t => topics.add(t)));
  db.tutorProfiles.forEach(p => p.subjects.forEach(s => s.topics.forEach(t => topics.add(t))));
  db.searchLog.forEach(l => topics.add(l.topic));
  return [...topics].sort();
}

// Helper: called by searchSessions(). When a learner searches a known
// topic and no session has a free place, it counts as unmet demand.
// Each learner is counted once per topic per day.
function logUnmetSearch(topic, results) {
  const user = getCurrentUser();
  if (!user || user.role !== 'learner' || !topic) return;
  const db = loadDB();
  const match = knownTopics(db).find(t => t.toLowerCase() === topic.trim().toLowerCase());
  if (!match) return;
  if (results.some(r => r.remaining > 0)) return;
  const today = new Date().toISOString().slice(0, 10);
  const already = db.searchLog.some(l => l.topic === match && l.learnerId === user.id && l.at.slice(0, 10) === today);
  if (already) return;
  db.searchLog.push({ topic: match, learnerId: user.id, at: new Date().toISOString() });
  saveDB(db);
  checkDemand(match);
}

/* FR-17 ------------------------------------------------------------- */

function joinWaitingList(sessionId, learnerId) {
  const user = requireRole(['learner']);
  requireSelf(user, learnerId);
  const db = loadDB();
  const session = findSession(db, sessionId);
  if (session.status !== 'published' || hasStarted(session)) throw new Error('This session is not open.');
  const bookings = activeBookings(db, sessionId);
  if (bookings.some(b => b.learnerId === learnerId)) throw new Error('You have already booked this session.');
  if (session.capacity - bookings.length > 0) throw new Error('There are still places left – book directly.');
  if (db.waitingList.some(w => w.sessionId === sessionId && w.learnerId === learnerId)) {
    throw new Error('You are already on the waiting list.');
  }
  const entry = { id: newId('w'), sessionId, learnerId, at: new Date().toISOString() };
  db.waitingList.push(entry);
  addNotification(db, learnerId, `You joined the waiting list for "${session.title}". We'll tell you if a place opens.`, `session.html?id=${sessionId}`);
  saveDB(db);
  session.topics.forEach(t => checkDemand(t));
  return entry;
}

// Helper: leave a waiting list
function leaveWaitingList(sessionId, learnerId) {
  const user = requireRole(['learner']);
  requireSelf(user, learnerId);
  const db = loadDB();
  db.waitingList = db.waitingList.filter(w => !(w.sessionId === sessionId && w.learnerId === learnerId));
  saveDB(db);
  return true;
}

// Helper: 1 = first in line, 0 = not on the list
function getWaitingPosition(sessionId, learnerId) {
  const list = loadDB().waitingList.filter(w => w.sessionId === sessionId)
    .sort((a, b) => a.at.localeCompare(b.at));
  return list.findIndex(w => w.learnerId === learnerId) + 1;
}

// Helper (no role check, used by the system): learners who wanted the topic but had no place
function computeUnmetDemand(db, topic) {
  const learners = new Set();
  db.waitingList.forEach(w => {
    const s = db.sessions.find(x => x.id === w.sessionId);
    if (s && sessionHasTopic(s, topic) && !hasStarted(s)) learners.add(w.learnerId);
  });
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();
  db.searchLog.forEach(l => {
    if (l.topic.toLowerCase() === String(topic).toLowerCase() && l.at >= monthAgo) learners.add(l.learnerId);
  });
  return learners.size;
}

function getUnmetDemand(topic) {
  requireRole(['coordinator', 'admin']);
  return computeUnmetDemand(loadDB(), topic);
}

function getWaitingListLength(topic) {
  requireRole(['coordinator', 'admin']);
  const db = loadDB();
  return db.waitingList.filter(w => {
    const s = db.sessions.find(x => x.id === w.sessionId);
    return s && sessionHasTopic(s, topic) && !hasStarted(s);
  }).length;
}

// Attendance for the topic's past sessions over time
function getAttendancePattern(topic) {
  requireRole(['coordinator', 'admin']);
  const db = loadDB();
  const sessions = db.sessions
    .filter(s => s.status === 'published' && hasStarted(s) && sessionHasTopic(s, topic))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .map(s => {
      const booked = activeBookings(db, s.id).length;
      const attended = db.attendance.filter(a => a.sessionId === s.id && a.attended).length;
      return { sessionId: s.id, title: s.title, date: s.dateTime, booked, attended, rate: booked ? attended / booked : null };
    });
  const totalBooked = sessions.reduce((n, s) => n + s.booked, 0);
  const totalAttended = sessions.reduce((n, s) => n + s.attended, 0);
  return { topic, sessions, overallRate: totalBooked ? totalAttended / totalBooked : null };
}

// How many approved tutors can teach the topic and have free time
function getTutorAvailability(topic) {
  requireRole(['coordinator', 'admin']);
  return loadDB().tutorProfiles.filter(p =>
    p.status === 'approved' &&
    p.subjects.some(s => s.status === 'approved' && s.topics.some(t => t.toLowerCase() === String(topic).toLowerCase())) &&
    Object.values(p.availability).flat().length > 0
  ).length;
}

// The four figures above for every topic, in one table
function getDemandSummary() {
  requireRole(['coordinator', 'admin']);
  const db = loadDB();
  const limit = db.settings.demandLimit;
  return knownTopics(db).map(topic => {
    const unmetDemand = getUnmetDemand(topic);
    return {
      topic,
      unmetDemand,
      waitingList: getWaitingListLength(topic),
      attendanceRate: getAttendancePattern(topic).overallRate,
      tutorsAvailable: getTutorAvailability(topic),
      overLimit: unmetDemand > limit,
    };
  }).sort((a, b) => b.unmetDemand - a.unmetDemand || a.topic.localeCompare(b.topic));
}

/* FR-18 ------------------------------------------------------------- */

function setDemandLimit(limit) {
  const user = requireRole(['coordinator', 'admin']);
  limit = Number(limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('The limit must be a whole number from 1 to 100.');
  const db = loadDB();
  const old = db.settings.demandLimit;
  db.settings.demandLimit = limit;
  addAudit(db, user.id, 'Changed demand limit', `${old} → ${limit}`);
  saveDB(db);
  return limit;
}

// Runs automatically (after searches and waiting-list joins) and from the
// coordinator dashboard. Creates a suggestion when demand > limit and there
// is no pending suggestion for that topic yet.
function checkDemand(topic) {
  const db = loadDB();
  const demand = computeUnmetDemand(db, topic);
  const limit = db.settings.demandLimit;
  if (demand <= limit) return null;
  const pending = db.suggestions.some(s => s.topic.toLowerCase() === topic.toLowerCase() && s.status === 'Pending');
  if (pending) return null;
  const suggestion = {
    id: newId('sg'), topic, demand, limit, status: 'Pending',
    createdAt: new Date().toISOString(), decidedBy: null, decidedAt: null,
  };
  db.suggestions.push(suggestion);
  notifyCoordinators(db, `Suggestion: add an extra session on "${topic}" (${demand} learners waiting, limit ${limit}).`);
  saveDB(db);
  return suggestion;
}

function listSuggestions() {
  requireRole(['coordinator', 'admin']);
  const db = loadDB();
  return db.suggestions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(s => ({ ...s, decidedByName: s.decidedBy ? userName(db, s.decidedBy) : '' }));
}

// decision: 'accepted' or 'ignored'
function recordSuggestionDecision(suggestionId, coordinatorId, decision) {
  const user = requireRole(['coordinator', 'admin']);
  requireSelf(user, coordinatorId);
  if (!['accepted', 'ignored'].includes(decision)) throw new Error('Choose accept or ignore.');
  const db = loadDB();
  const suggestion = db.suggestions.find(s => s.id === suggestionId);
  if (!suggestion) throw new Error('Suggestion not found.');
  if (suggestion.status !== 'Pending') throw new Error('A decision was already recorded for this suggestion.');
  suggestion.status = decision === 'accepted' ? 'Accepted' : 'Ignored';
  suggestion.decidedBy = coordinatorId;
  suggestion.decidedAt = new Date().toISOString();
  addAudit(db, coordinatorId, `Suggestion ${suggestion.status.toLowerCase()}`, `Extra session on "${suggestion.topic}"`);
  saveDB(db);
  return suggestion;
}
