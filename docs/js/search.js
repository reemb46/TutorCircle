/* =====================================================================
   TutorCircle - search.js  (section 1.3 Search)
   FR-05 Learners can search for tutors and sessions by subject and topic.
   FR-06 Learners can filter results by format, available time and group size.
   ===================================================================== */

// Helper: case-insensitive "does the text contain the search words"
function textContains(text, query) {
  return String(text).toLowerCase().includes(String(query).trim().toLowerCase());
}

// Helper: adds tutor name and seat numbers to a session
function decorateSession(db, session) {
  const booked = db.bookings.filter(b => b.sessionId === session.id && b.status === 'booked').length;
  return {
    ...session,
    kind: 'session',
    tutorName: userName(db, session.tutorId),
    bookedCount: booked,
    remaining: session.capacity - booked,
  };
}

// Helper: every topic that appears in approved tutor subjects or sessions
function getAllTopics(subject = '') {
  const db = loadDB();
  const topics = new Set();
  db.tutorProfiles.filter(p => p.status === 'approved').forEach(p => {
    p.subjects.filter(s => s.status === 'approved' && (!subject || s.code === subject))
      .forEach(s => s.topics.forEach(t => topics.add(t)));
  });
  db.sessions.filter(s => s.status === 'published' && (!subject || s.subject === subject))
    .forEach(s => s.topics.forEach(t => topics.add(t)));
  return [...topics].sort();
}

/* FR-05 ------------------------------------------------------------- */

// Returns the approved tutors who teach the given subject and topic.
// Leave subject or topic empty ('') to match any.
function searchTutors(subject, topic) {
  const db = loadDB();
  return db.tutorProfiles
    .filter(p => p.status === 'approved')
    .map(p => ({
      ...p,
      kind: 'tutor',
      name: userName(db, p.tutorId),
      approvedSubjects: p.subjects.filter(s => s.status === 'approved'),
    }))
    .filter(t => t.approvedSubjects.some(s =>
      (!subject || s.code === subject) &&
      (!topic || textContains([s.code, SUBJECTS[s.code] || '', ...s.topics, t.name].join(' '), topic))
    ));
}

// Returns the upcoming, published sessions on the given subject and topic.
function searchSessions(subject, topic) {
  const db = loadDB();
  const now = Date.now();
  const results = db.sessions
    .filter(s => s.status === 'published' && new Date(s.dateTime).getTime() > now)
    .filter(s => !subject || s.subject === subject)
    .filter(s => !topic || textContains([s.title, s.subject, SUBJECTS[s.subject] || '', ...s.topics, userName(db, s.tutorId)].join(' '), topic))
    .map(s => decorateSession(db, s))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  // FR-17: a search with no free places counts as unmet demand (see insights.js)
  logUnmetSearch(topic, results);
  return results;
}

/* FR-06 ------------------------------------------------------------- */

// format: 'in-person', 'online', or an array of them. Empty = keep all.
function filterByFormat(results, format) {
  const wanted = [].concat(format || []).filter(f => f && f !== 'any');
  if (wanted.length === 0) return results;
  return results.filter(r =>
    r.kind === 'tutor' ? wanted.some(f => r.formats.includes(f)) : wanted.includes(r.format)
  );
}

// from / to: Date objects for the day range (null = no limit).
// fromHour / toHour (optional): part of the day, e.g. 12 and 17 for afternoon.
// Tutors are matched using their weekly availability slots.
function filterByTime(results, from, to, fromHour = null, toHour = null) {
  return results.filter(r => {
    if (r.kind === 'tutor') {
      if (fromHour === null) return true;
      return Object.values(r.availability).flat().some(slot => {
        const [start, end] = SLOT_HOURS[slot];
        return start < toHour && end > fromHour;
      });
    }
    const start = new Date(r.dateTime);
    if (from && start < from) return false;
    if (to && start > to) return false;
    if (fromHour !== null) {
      const hour = start.getHours() + start.getMinutes() / 60;
      if (hour < fromHour || hour >= toHour) return false;
    }
    return true;
  });
}

// groupSize: 'any', 'individual' (1-to-1), 'group', 'small' (group up to 6), 'large' (group of 7+)
function filterByGroupSize(results, groupSize) {
  if (!groupSize || groupSize === 'any') return results;
  return results.filter(r => {
    if (r.kind === 'tutor') return r.formats.includes(groupSize === 'individual' ? 'individual' : 'group');
    if (groupSize === 'individual') return r.type === 'individual';
    if (groupSize === 'group') return r.type === 'group';
    if (groupSize === 'small') return r.type === 'group' && r.capacity <= 6;
    if (groupSize === 'large') return r.type === 'group' && r.capacity > 6;
    return true;
  });
}

// filters = { formats, from, to, fromHour, toHour, groupSize }
function applyFilters(results, filters = {}) {
  let out = filterByFormat(results, filters.formats);
  out = filterByTime(out, filters.from || null, filters.to || null,
    filters.fromHour ?? null, filters.toHour ?? null);
  out = filterByGroupSize(out, filters.groupSize);
  return out;
}
