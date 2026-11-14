/* =====================================================================
   TutorCircle - auth.js  (section 1.1 Accounts and Roles)
   FR-01 Users can register as a learner, tutor, coordinator or admin.
   FR-02 Each role has access only to features relevant to it.
   ===================================================================== */

const ROLES = ['learner', 'tutor', 'coordinator', 'admin'];

// Which features each role may use (FR-02)
const PERMISSIONS = {
  learner: ['findSessions', 'viewTutorProfile', 'viewSession', 'bookSession', 'myBookings', 'myLearning', 'workspace', 'notifications'],
  tutor: ['mySessions', 'createSession', 'myProfile', 'viewTutorProfile', 'viewSession', 'workspace', 'manageWorkspace', 'notifications'],
  coordinator: ['coordinator', 'findSessions', 'viewTutorProfile', 'viewSession', 'workspace', 'notifications'],
  admin: ['admin', 'coordinator', 'findSessions', 'viewTutorProfile', 'viewSession', 'workspace', 'notifications'],
};

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function registerUser(name, email, password, role) {
  name = (name || '').trim();
  email = (email || '').trim().toLowerCase();
  if (!name || !email || !password) throw new Error('Please fill in your name, email and password.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (!ROLES.includes(role)) throw new Error('Choose a valid role.');
  // Learners and tutors sign up themselves. Coordinator and admin
  // accounts can only be created by an admin who is logged in.
  if (role === 'coordinator' || role === 'admin') {
    const current = getCurrentUser();
    if (!current || current.role !== 'admin') {
      throw new Error('Coordinator and admin accounts are created by an admin.');
    }
  }
  const db = loadDB();
  if (db.users.some(u => u.email === email)) throw new Error('An account with this email already exists.');

  const user = { id: newId('u'), name, email, passwordHash: hashPassword(password), role, createdAt: new Date().toISOString() };
  db.users.push(user);
  // A new tutor gets an empty profile. It goes to the coordinator once filled in (FR-03, FR-04).
  if (role === 'tutor') db.tutorProfiles.push(emptyProfile(user.id));
  saveDB(db);
  return publicUser(user);
}

// Helper (admin accounts page): every user without their password hash
function listUsers() {
  requireRole(['admin']);
  return loadDB().users.map(publicUser).sort((a, b) => a.name.localeCompare(b.name));
}

function logIn(email, password) {
  email = (email || '').trim().toLowerCase();
  const db = loadDB();
  const user = db.users.find(u => u.email === email);
  if (!user || user.passwordHash !== hashPassword(password || '')) {
    throw new Error('Wrong email or password.');
  }
  localStorage.setItem(SESSION_KEY, user.id);
  return publicUser(user);
}

function logOut() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const user = loadDB().users.find(u => u.id === id);
  return user ? publicUser(user) : null;
}

function getUserRole(userId) {
  const user = loadDB().users.find(u => u.id === userId);
  return user ? user.role : null;
}

function canAccess(role, feature) {
  return (PERMISSIONS[role] || []).includes(feature);
}

// Throws an error if the logged-in user's role is not allowed.
// Returns the current user so the caller can use it.
function requireRole(allowedRoles) {
  const user = getCurrentUser();
  if (!user) throw new Error('Please log in first.');
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Only ' + allowedRoles.join(' or ') + ' accounts can do this.');
  }
  return user;
}

// Helper: stops a user acting on behalf of someone else
function requireSelf(user, id) {
  if (user.id !== id) throw new Error('You can only do this for your own account.');
}

// Helper: finds a user's name
function userName(db, id) {
  const user = db.users.find(u => u.id === id);
  return user ? user.name : 'Unknown user';
}

// Helper: adds a notification for a user
function addNotification(db, userId, text, link = '') {
  db.notifications.push({ id: newId('n'), userId, text, link, at: new Date().toISOString(), read: false });
}

// Helper: notifies every coordinator
function notifyCoordinators(db, text, link = 'coordinator.html') {
  db.users.filter(u => u.role === 'coordinator').forEach(u => addNotification(db, u.id, text, link));
}

// Helper: records a coordinator decision so it can be traced later (FR-16)
function addAudit(db, actorId, action, details) {
  db.auditLog.push({ id: newId('a'), actorId, action, details, at: new Date().toISOString() });
}

function listNotifications(userId) {
  return loadDB().notifications.filter(n => n.userId === userId).sort((a, b) => b.at.localeCompare(a.at));
}

function countUnread(userId) {
  return loadDB().notifications.filter(n => n.userId === userId && !n.read).length;
}

function markNotificationsRead(userId) {
  const db = loadDB();
  db.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
  saveDB(db);
}
