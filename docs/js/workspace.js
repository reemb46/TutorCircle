/* =====================================================================
   TutorCircle - workspace.js  (section 1.5 Session Workspaces)
   FR-10 Tutors upload materials and post announcements.
   FR-11 Learners post questions and preparation notes.
   ===================================================================== */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Helper: keeps the file's name, size and type.
// (The site has no server yet, so the file itself is not stored.)
function fileInfo(file) {
  if (!file || !file.name) throw new Error('Choose a file to upload.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Files must be 10 MB or smaller.');
  return { name: file.name, size: file.size || 0, type: file.type || '' };
}

// Helper: who may open a workspace - its tutor, booked learners, coordinators and admins
function canSeeWorkspace(db, user, session) {
  if (user.role === 'coordinator' || user.role === 'admin') return true;
  if (user.role === 'tutor') return session.tutorId === user.id;
  return db.bookings.some(b => b.sessionId === session.id && b.learnerId === user.id && b.status === 'booked');
}

// Helper: saves a post and notifies the right people
function addPost(db, session, kind, authorId, content) {
  const post = { id: newId('p'), sessionId: session.id, kind, authorId, createdAt: new Date().toISOString(), ...content };
  db.posts.push(post);
  return post;
}

function requireText(text, what) {
  const clean = (text || '').trim();
  if (!clean) throw new Error(`Write your ${what} first.`);
  if (clean.length > 1000) throw new Error(`Keep your ${what} under 1000 characters.`);
  return clean;
}

/* FR-10 ------------------------------------------------------------- */

function uploadMaterial(sessionId, tutorId, file) {
  const user = requireRole(['tutor']);
  requireSelf(user, tutorId);
  const db = loadDB();
  const session = findSession(db, sessionId);
  requireOwnSession(user, session);
  const post = addPost(db, session, 'material', tutorId, { file: fileInfo(file) });
  activeBookings(db, sessionId).forEach(b => addNotification(db, b.learnerId,
    `New material in "${session.title}": ${post.file.name}`, `workspace.html?id=${sessionId}`));
  saveDB(db);
  return post;
}

function postAnnouncement(sessionId, tutorId, text) {
  const user = requireRole(['tutor']);
  requireSelf(user, tutorId);
  const db = loadDB();
  const session = findSession(db, sessionId);
  requireOwnSession(user, session);
  const post = addPost(db, session, 'announcement', tutorId, { text: requireText(text, 'announcement') });
  activeBookings(db, sessionId).forEach(b => addNotification(db, b.learnerId,
    `New announcement in "${session.title}": ${post.text}`, `workspace.html?id=${sessionId}`));
  saveDB(db);
  return post;
}

/* FR-11 ------------------------------------------------------------- */

function postQuestion(sessionId, learnerId, text) {
  const user = requireRole(['learner']);
  requireSelf(user, learnerId);
  const db = loadDB();
  const session = findSession(db, sessionId);
  if (!canSeeWorkspace(db, user, session)) throw new Error('Book this session to post in its workspace.');
  const post = addPost(db, session, 'question', learnerId, { text: requireText(text, 'question'), answered: false });
  addNotification(db, session.tutorId, `${user.name} asked a question in "${session.title}".`, `workspace.html?id=${sessionId}`);
  saveDB(db);
  return post;
}

function postPreparationNote(sessionId, learnerId, text) {
  const user = requireRole(['learner']);
  requireSelf(user, learnerId);
  const db = loadDB();
  const session = findSession(db, sessionId);
  if (!canSeeWorkspace(db, user, session)) throw new Error('Book this session to post in its workspace.');
  const post = addPost(db, session, 'note', learnerId, { text: requireText(text, 'note') });
  saveDB(db);
  return post;
}

// Helper: the tutor answers a learner question
function answerQuestion(postId, tutorId, reply) {
  const user = requireRole(['tutor']);
  requireSelf(user, tutorId);
  const db = loadDB();
  const post = db.posts.find(p => p.id === postId && p.kind === 'question');
  if (!post) throw new Error('Question not found.');
  const session = findSession(db, post.sessionId);
  requireOwnSession(user, session);
  post.reply = requireText(reply, 'answer');
  post.answered = true;
  addNotification(db, post.authorId, `${user.name} answered your question in "${session.title}".`, `workspace.html?id=${session.id}`);
  saveDB(db);
  return post;
}

/* FR-10, FR-11 ------------------------------------------------------ */

// Returns the session plus everything in its workspace, newest first
function viewWorkspace(sessionId) {
  const user = requireRole(['learner', 'tutor', 'coordinator', 'admin']);
  const db = loadDB();
  const session = findSession(db, sessionId);
  if (!canSeeWorkspace(db, user, session)) {
    throw new Error('Only the tutor and learners who booked this session can open its workspace.');
  }
  const posts = db.posts
    .filter(p => p.sessionId === sessionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(p => ({ ...p, authorName: userName(db, p.authorId) }));
  return { session: decorateSession(db, session), posts };
}
