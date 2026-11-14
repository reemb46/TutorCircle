/* =====================================================================
   TutorCircle - profiles.js  (section 1.2 Tutor Profiles)
   FR-03 Tutors create profiles with subjects, topic tags, experience
         and availability.
   FR-04 Coordinators approve tutor applications and subject coverage.
   ===================================================================== */

// Helper: a blank profile for a new tutor (status "pending", not submitted yet)
function emptyProfile(tutorId) {
  const now = new Date().toISOString();
  const availability = {};
  DAYS.forEach(d => { availability[d] = []; });
  return {
    tutorId, programme: '', year: '', formats: [], subjects: [], experience: '',
    availability, status: 'pending', since: now, submittedAt: null, updatedAt: now,
  };
}

function findProfile(db, tutorId) {
  const profile = db.tutorProfiles.find(p => p.tutorId === tutorId);
  if (!profile) throw new Error('Tutor profile not found.');
  return profile;
}

/* FR-03 ------------------------------------------------------------- */

// subjects:     ['SWEN 360', 'CSCI 210']
// topicTags:    { 'SWEN 360': ['UML diagrams', 'Use cases'], 'CSCI 210': ['Recursion'] }
// experience:   text
// availability: { Sun: ['10-12', '2-4'], Mon: [], ... }
// extra:        { programme, year, formats } (optional details shown on the profile)
function saveTutorProfile(tutorId, subjects, topicTags, experience, availability, extra = {}) {
  const user = requireRole(['tutor']);
  requireSelf(user, tutorId);

  subjects = [...new Set(subjects || [])];
  if (subjects.length === 0) throw new Error('Add at least one subject you can teach.');
  subjects.forEach(code => {
    if (!SUBJECTS[code]) throw new Error(`${code} is not a subject offered at the university.`);
    const tags = (topicTags[code] || []).map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) throw new Error(`Add at least one topic tag for ${code}.`);
  });
  if (!experience || !experience.trim()) throw new Error('Describe your tutoring experience.');
  const slots = Object.values(availability || {}).flat();
  if (slots.length === 0) throw new Error('Choose at least one time you are available.');

  const db = loadDB();
  let profile = db.tutorProfiles.find(p => p.tutorId === tutorId);
  if (!profile) {
    profile = emptyProfile(tutorId);
    db.tutorProfiles.push(profile);
  }
  const firstSubmit = !profile.submittedAt;

  profile.subjects = subjects.map(code => {
    const topics = [...new Set(topicTags[code].map(t => t.trim()).filter(Boolean))];
    const old = profile.subjects.find(s => s.code === code);
    // Approval is kept only if nothing new was added; new coverage needs approval again
    const unchanged = old && old.status === 'approved' && topics.every(t => old.topics.includes(t));
    return { code, topics, status: unchanged ? 'approved' : 'pending' };
  });
  profile.experience = experience.trim();
  profile.availability = availability;
  if (extra.programme !== undefined) profile.programme = extra.programme.trim();
  if (extra.year !== undefined) profile.year = extra.year;
  if (extra.formats !== undefined) profile.formats = extra.formats;

  // A rejected tutor who updates their profile applies again
  if (profile.status === 'rejected') profile.status = 'pending';
  profile.submittedAt = profile.status === 'pending' || firstSubmit ? new Date().toISOString() : profile.submittedAt;
  profile.updatedAt = new Date().toISOString();

  if (profile.status === 'pending') {
    notifyCoordinators(db, `${user.name} submitted a tutor application.`);
  } else if (profile.subjects.some(s => s.status === 'pending')) {
    notifyCoordinators(db, `${user.name} asked for new subject coverage.`);
  }
  saveDB(db);
  return profile;
}

function getTutorProfile(tutorId) {
  const db = loadDB();
  const profile = db.tutorProfiles.find(p => p.tutorId === tutorId);
  if (!profile) return null;
  const user = db.users.find(u => u.id === tutorId);
  return { ...profile, name: user ? user.name : 'Unknown tutor', email: user ? user.email : '' };
}

/* FR-04 ------------------------------------------------------------- */

// Applications waiting for a decision: new tutors, or approved tutors
// asking to teach a new subject
function listTutorApplications() {
  requireRole(['coordinator', 'admin']);
  const db = loadDB();
  return db.tutorProfiles
    .filter(p => p.submittedAt && (p.status === 'pending' || p.subjects.some(s => s.status === 'pending')))
    .map(p => ({
      ...p,
      name: userName(db, p.tutorId),
      email: (db.users.find(u => u.id === p.tutorId) || {}).email,
      pendingSubjects: p.subjects.filter(s => s.status === 'pending').map(s => s.code),
    }))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

function approveTutor(tutorId) {
  const user = requireRole(['coordinator', 'admin']);
  const db = loadDB();
  const profile = findProfile(db, tutorId);
  if (!profile.submittedAt) throw new Error('This tutor has not completed their profile yet.');
  profile.status = 'approved';
  profile.decidedBy = user.id;
  profile.decidedAt = new Date().toISOString();
  addAudit(db, user.id, 'Approved tutor', userName(db, tutorId));
  addNotification(db, tutorId, 'Your tutor application was approved. Approved subjects can now be used for sessions.', 'my-profile.html');
  saveDB(db);
  return profile;
}

function rejectTutor(tutorId) {
  const user = requireRole(['coordinator', 'admin']);
  const db = loadDB();
  const profile = findProfile(db, tutorId);
  profile.status = 'rejected';
  profile.decidedBy = user.id;
  profile.decidedAt = new Date().toISOString();
  addAudit(db, user.id, 'Rejected tutor', userName(db, tutorId));
  addNotification(db, tutorId, 'Your tutor application was not approved. You can update your profile and apply again.', 'my-profile.html');
  saveDB(db);
  return profile;
}

function approveSubjectCoverage(tutorId, subject) {
  const user = requireRole(['coordinator', 'admin']);
  const db = loadDB();
  const profile = findProfile(db, tutorId);
  const entry = profile.subjects.find(s => s.code === subject);
  if (!entry) throw new Error(`This tutor did not apply to teach ${subject}.`);
  entry.status = 'approved';
  addAudit(db, user.id, 'Approved subject coverage', `${userName(db, tutorId)} – ${subject} (${entry.topics.join(', ')})`);
  addNotification(db, tutorId, `You are approved to teach ${subject}.`, 'my-profile.html');
  saveDB(db);
  return entry;
}
