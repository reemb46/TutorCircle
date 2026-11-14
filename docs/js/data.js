/* =====================================================================
   TutorCircle - data.js
   The "database" for this phase. Everything is saved in the browser's
   localStorage, so the site works without a server. Sample data is
   created the first time the site opens.
   ===================================================================== */

const DB_KEY = 'tutorcircle_db_v2';
const SESSION_KEY = 'tutorcircle_current_user';

// Subjects offered at the university (code -> name)
const SUBJECTS = {
  'SWEN 360': 'Software Design',
  'CSCI 210': 'Data Structures',
  'MATH 201': 'Discrete Mathematics',
};

// Weekly availability slots used on tutor profiles
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
const SLOTS = ['10-12', '12-2', '2-4', '4-6'];
const SLOT_HOURS = { '10-12': [10, 12], '12-2': [12, 14], '2-4': [14, 16], '4-6': [16, 18] };

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const db = createSeedData();
    saveDB(db);
    return db;
  }
  return JSON.parse(raw);
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Deletes everything and starts again with the sample data
function resetDB() {
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function newId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Simple hash so passwords are not stored as plain text.
// (Demo only - a real server would use bcrypt.)
function hashPassword(password) {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) + hash + password.charCodeAt(i)) | 0;
  }
  return 'h' + (hash >>> 0).toString(16);
}

/* ---------------------------------------------------------------------
   Sample data. Dates are relative to today so "upcoming" sessions are
   always in the future when you demo the site.
   --------------------------------------------------------------------- */
function createSeedData() {
  const now = new Date();
  const at = (days, hour, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const pw = hashPassword('password123');

  const users = [
    { id: 'u_learner1', name: 'Maryam Hasan', email: 'learner@aubh.edu.bh', role: 'learner' },
    { id: 'u_tutor1', name: 'Ali Mansoor', email: 'tutor@aubh.edu.bh', role: 'tutor' },
    { id: 'u_tutor2', name: 'Huda Saleh', email: 'huda@aubh.edu.bh', role: 'tutor' },
    { id: 'u_tutor3', name: 'Yusuf Kamal', email: 'yusuf@aubh.edu.bh', role: 'tutor' },
    { id: 'u_tutor4', name: 'Mona Ebrahim', email: 'mona@aubh.edu.bh', role: 'tutor' },
    { id: 'u_coord', name: 'Sara Khalil', email: 'coordinator@aubh.edu.bh', role: 'coordinator' },
    { id: 'u_admin', name: 'Faisal Rashid', email: 'admin@aubh.edu.bh', role: 'admin' },
    { id: 'u_learner2', name: 'Hamad Isa', email: 'hamad@aubh.edu.bh', role: 'learner' },
    { id: 'u_learner3', name: 'Layla Faisal', email: 'layla@aubh.edu.bh', role: 'learner' },
    { id: 'u_learner4', name: 'Reem Jassim', email: 'reem@aubh.edu.bh', role: 'learner' },
    { id: 'u_learner5', name: 'Omar Yousif', email: 'omar@aubh.edu.bh', role: 'learner' },
  ].map(u => ({ ...u, passwordHash: pw, createdAt: at(-60, 9) }));

  // Tutor profiles (1.2)
  const tutorProfiles = [
    {
      tutorId: 'u_tutor1', programme: 'Computer Science', year: 3, since: at(-60, 9), status: 'approved',
      submittedAt: at(-60, 9), updatedAt: at(-5, 9),
      formats: ['group', 'individual', 'in-person', 'online'],
      subjects: [
        { code: 'SWEN 360', topics: ['UML diagrams', 'Use cases', 'Agile and Scrum'], status: 'approved' },
        { code: 'CSCI 210', topics: ['Linked lists', 'Recursion'], status: 'pending' },
      ],
      experience: 'Teaching assistant for SWEN 360 last semester. Ran weekly revision sessions for 20+ students.',
      availability: { Sun: ['2-4', '4-6'], Mon: ['10-12', '2-4'], Tue: [], Wed: ['10-12', '12-2'], Thu: ['2-4', '4-6'] },
    },
    {
      tutorId: 'u_tutor2', programme: 'Software Engineering', year: 4, since: at(-120, 9), status: 'approved',
      submittedAt: at(-120, 9), updatedAt: at(-120, 9),
      formats: ['group', 'in-person', 'online'],
      subjects: [{ code: 'SWEN 360', topics: ['Use cases', 'Testing', 'UML diagrams'], status: 'approved' }],
      experience: 'Peer tutor for two semesters. Interned as a QA engineer and loves teaching testing.',
      availability: { Sun: ['10-12'], Mon: ['12-2', '2-4'], Tue: ['2-4'], Wed: [], Thu: ['4-6'] },
    },
    {
      tutorId: 'u_tutor3', programme: 'Computer Science', year: 2, since: at(-40, 9), status: 'approved',
      submittedAt: at(-40, 9), updatedAt: at(-40, 9),
      formats: ['individual', 'online'],
      subjects: [{ code: 'CSCI 210', topics: ['Recursion', 'Linked lists', 'Trees'], status: 'approved' }],
      experience: 'Got A+ in CSCI 210 and helped classmates prepare for the midterm.',
      availability: { Sun: [], Mon: ['4-6'], Tue: ['4-6'], Wed: ['4-6'], Thu: [] },
    },
    {
      tutorId: 'u_tutor4', programme: 'Mathematics', year: 3, since: at(-2, 9), status: 'pending',
      submittedAt: at(-2, 11), updatedAt: at(-2, 11),
      formats: ['group', 'in-person'],
      subjects: [
        { code: 'MATH 201', topics: ['Logic', 'Proofs', 'Sets'], status: 'pending' },
        { code: 'CSCI 210', topics: ['Trees'], status: 'pending' },
      ],
      experience: 'Scored A in MATH 201 and CSCI 210. Volunteer math tutor at high school for one year.',
      availability: { Sun: ['10-12', '12-2'], Mon: [], Tue: ['10-12'], Wed: ['2-4'], Thu: ['10-12'] },
    },
  ];

  const S = o => ({ status: 'published', prepNotes: '', createdAt: at(-30, 9), format: 'in-person', type: 'group', duration: 60, ...o });
  const sessions = [
    S({ id: 's_uml', tutorId: 'u_tutor1', title: 'UML Sequence Diagrams: practice', subject: 'SWEN 360', topics: ['UML diagrams'],
        dateTime: at(4, 16), capacity: 6, locationOrLink: 'Room S-204',
        objectives: ['Read and draw a sequence diagram', 'Use loops and alt fragments'],
        prepNotes: 'Review the lecture slides on interaction diagrams and bring a laptop with draw.io open.' }),
    S({ id: 's_usecase', tutorId: 'u_tutor2', title: 'Use-case diagrams from scratch', subject: 'SWEN 360', topics: ['Use cases'],
        dateTime: at(5, 14), capacity: 5, format: 'online', locationOrLink: 'https://meet.google.com/abc-defg-hij',
        objectives: ['Identify actors and use cases', 'Use include and extend correctly'] }),
    S({ id: 's_agile', tutorId: 'u_tutor1', title: '1-to-1 help: Agile and Scrum', subject: 'SWEN 360', topics: ['Agile and Scrum'],
        type: 'individual', dateTime: at(7, 13), duration: 45, capacity: 1, locationOrLink: 'Library L-3',
        objectives: ['Plan a sprint backlog', 'Write good user stories'] }),
    S({ id: 's_testing', tutorId: 'u_tutor2', title: 'Testing basics: unit tests', subject: 'SWEN 360', topics: ['Testing'],
        dateTime: at(8, 17), capacity: 3, locationOrLink: 'Room S-110',
        objectives: ['Write unit tests with assertions', 'Choose good test cases'] }),
    S({ id: 's_recursion', tutorId: 'u_tutor3', title: 'Recursion step by step', subject: 'CSCI 210', topics: ['Recursion'],
        type: 'individual', dateTime: at(6, 16, 30), capacity: 1, format: 'online', locationOrLink: 'https://teams.microsoft.com/l/meetup-join/demo',
        objectives: ['Trace recursive calls', 'Write a base case and recursive case'] }),
    // Past sessions (history, attendance, feedback, missed-sessions report)
    S({ id: 's_past_class', tutorId: 'u_tutor1', title: 'UML class diagrams: warm-up', subject: 'SWEN 360', topics: ['UML diagrams'],
        dateTime: at(-3, 16), capacity: 6, locationOrLink: 'Room S-204', objectives: ['Draw classes and associations'] }),
    S({ id: 's_past_usecase', tutorId: 'u_tutor2', title: 'Use-case diagrams: review', subject: 'SWEN 360', topics: ['Use cases'],
        dateTime: at(-9, 14), capacity: 5, format: 'online', locationOrLink: 'https://meet.google.com/xyz-review', objectives: ['Review include and extend'] }),
    S({ id: 's_past_agile', tutorId: 'u_tutor1', title: 'Agile and Scrum (1-to-1)', subject: 'SWEN 360', topics: ['Agile and Scrum'],
        type: 'individual', dateTime: at(-14, 13), duration: 45, capacity: 1, locationOrLink: 'Library L-3', objectives: ['Understand sprints'] }),
    S({ id: 's_past_testing', tutorId: 'u_tutor2', title: 'Testing: intro to JUnit', subject: 'SWEN 360', topics: ['Testing'],
        dateTime: at(-20, 17), capacity: 4, locationOrLink: 'Room S-110', objectives: ['Write a first JUnit test'] }),
  ];

  const B = (sessionId, learnerId, daysAgo, status = 'booked') => ({
    id: newId('b'), sessionId, learnerId, status, bookedAt: at(-daysAgo, 10),
    reminders: { oneDay: true, oneHour: true, email: false }, remindersSent: [],
  });
  const bookings = [
    B('s_uml', 'u_learner1', 3), B('s_uml', 'u_learner2', 4), B('s_uml', 'u_learner3', 4), B('s_uml', 'u_learner4', 2),
    B('s_usecase', 'u_learner2', 1),
    B('s_testing', 'u_learner2', 5), B('s_testing', 'u_learner3', 5), B('s_testing', 'u_learner4', 4),
    B('s_past_class', 'u_learner1', 8), B('s_past_class', 'u_learner2', 8), B('s_past_class', 'u_learner3', 7),
    B('s_past_usecase', 'u_learner1', 12), B('s_past_usecase', 'u_learner3', 12),
    B('s_past_agile', 'u_learner1', 18, 'cancelled'),
    B('s_past_testing', 'u_learner2', 25), B('s_past_testing', 'u_learner3', 25), B('s_past_testing', 'u_learner4', 24),
  ];

  const A = (sessionId, learnerId, attended, tutorId, daysAgo) =>
    ({ sessionId, learnerId, attended, recordedAt: at(-daysAgo, 18), recordedBy: tutorId });
  const attendance = [
    A('s_past_class', 'u_learner1', true, 'u_tutor1', 3), A('s_past_class', 'u_learner2', true, 'u_tutor1', 3),
    A('s_past_class', 'u_learner3', false, 'u_tutor1', 3),
    A('s_past_usecase', 'u_learner1', true, 'u_tutor2', 9), A('s_past_usecase', 'u_learner3', false, 'u_tutor2', 9),
    A('s_past_testing', 'u_learner2', true, 'u_tutor2', 20), A('s_past_testing', 'u_learner3', false, 'u_tutor2', 20),
    A('s_past_testing', 'u_learner4', true, 'u_tutor2', 20),
  ];

  const posts = [
    { id: 'p1', sessionId: 's_uml', kind: 'announcement', authorId: 'u_tutor1', text: 'Bring your laptops - we will draw diagrams live in draw.io.', createdAt: at(-1, 10) },
    { id: 'p2', sessionId: 's_uml', kind: 'material', authorId: 'u_tutor1', file: { name: 'Sequence-diagram-cheatsheet.pdf', size: 1258291, type: 'application/pdf' }, createdAt: at(-2, 9) },
    { id: 'p3', sessionId: 's_uml', kind: 'material', authorId: 'u_tutor1', file: { name: 'Practice-exercise-1.docx', size: 348160, type: '' }, createdAt: at(-2, 9, 5) },
    { id: 'p4', sessionId: 's_uml', kind: 'question', authorId: 'u_learner2', text: 'When do we use an alt fragment instead of opt?', answered: false, createdAt: at(-1, 18) },
    { id: 'p5', sessionId: 's_uml', kind: 'question', authorId: 'u_learner3', text: 'Can we go over return messages?', answered: true, reply: 'Yes - we will start with them.', createdAt: at(-2, 20) },
    { id: 'p6', sessionId: 's_uml', kind: 'note', authorId: 'u_learner1', text: 'I re-read chapter 7 and drew the ATM example. Will bring questions on it.', createdAt: at(-1, 21) },
    { id: 'p7', sessionId: 's_past_class', kind: 'material', authorId: 'u_tutor1', file: { name: 'Class-diagram-exercise.pdf', size: 512000, type: 'application/pdf' }, createdAt: at(-4, 9) },
  ];

  // Practice work with tutor comments (1.6)
  const submissions = [
    { id: 'sub_1', sessionId: 's_past_class', learnerId: 'u_learner1', title: 'Library system class diagram',
      file: { name: 'class-diagram-v1.png', size: 245000, type: 'image/png' }, submittedAt: at(-2, 20),
      comments: [{ tutorId: 'u_tutor1', comment: 'Good start! The association between Member and Loan should be one-to-many, and add multiplicities on both ends.', at: at(-1, 11) }] },
    { id: 'sub_2', sessionId: 's_past_class', learnerId: 'u_learner2', title: 'Class diagram attempt',
      file: { name: 'hamad-classes.pdf', size: 180000, type: 'application/pdf' }, submittedAt: at(-1, 22), comments: [] },
  ];

  const feedback = [
    { id: 'f_1', sessionId: 's_past_usecase', learnerId: 'u_learner1', rating: 4, comment: 'Clear examples, would like more practice time.', at: at(-8, 19) },
    { id: 'f_2', sessionId: 's_past_testing', learnerId: 'u_learner2', rating: 5, comment: 'Very helpful!', at: at(-19, 20) },
  ];

  // Complaints and coordinator decisions (1.7)
  const complaints = [
    { id: 'c_1', fromUserId: 'u_learner4', sessionId: 's_past_testing', description: 'The session started 20 minutes late, so we missed the last exercise.', date: at(-19, 10), status: 'Open' },
  ];

  // Demand data (1.8): two learners waiting for the full testing session,
  // and four learners searched for "Trees" but found no session.
  const waitingList = [
    { id: 'w_1', sessionId: 's_testing', learnerId: 'u_learner5', at: at(-2, 12) },
    { id: 'w_2', sessionId: 's_testing', learnerId: 'u_learner1', at: at(-1, 15) },
  ];
  const searchLog = ['u_learner1', 'u_learner2', 'u_learner4', 'u_learner5'].map((learnerId, i) =>
    ({ topic: 'Trees', learnerId, at: at(-(i + 1), 13) }));

  const notifications = [
    { id: 'n1', userId: 'u_learner1', text: 'You\'re booked on "UML Sequence Diagrams: practice".', link: 'session.html?id=s_uml', at: at(-3, 10), read: true },
    { id: 'n2', userId: 'u_learner1', text: 'New announcement in "UML Sequence Diagrams: practice": Bring your laptops - we will draw diagrams live in draw.io.', link: 'workspace.html?id=s_uml', at: at(-1, 10), read: false },
    { id: 'n3', userId: 'u_coord', text: 'Mona Ebrahim submitted a tutor application.', link: 'coordinator.html', at: at(-2, 11), read: false },
  ];

  return {
    users, tutorProfiles, sessions, bookings, attendance, posts, notifications,
    submissions, feedback, complaints, decisions: [], auditLog: [],
    waitingList, searchLog, suggestions: [], settings: { demandLimit: 3 },
  };
}
