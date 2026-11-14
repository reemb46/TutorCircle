# TutorCircle

Peer tutoring web app for SWEN 360 (Group 4) – core implementation phase.

Implements **every function in *TutorCircle – Functions to Implement*** (sections 1.1–1.8,
FR-01 to FR-18), based on the mid-fidelity wireframes and the TutorCircle Style Guide.

Built with plain **HTML, CSS and JavaScript** (no frameworks, no server).
Data is saved in the browser's `localStorage`, so it runs on GitHub Pages.

## Demo accounts

All passwords: `password123`

| Role        | Email                     | Try this |
|-------------|---------------------------|----------|
| Learner     | learner@aubh.edu.bh       | Search, book, workspace, My learning, waiting list |
| Tutor       | tutor@aubh.edu.bh         | Create session, workspace, attendance, comments, profile |
| Coordinator | coordinator@aubh.edu.bh   | Approvals, missed sessions, complaints, demand |
| Admin       | admin@aubh.edu.bh         | Create coordinator/admin accounts |

Use **Reset demo data** on the log-in page to start fresh.

## Screens

| Page                  | Wireframe / purpose | Who |
|-----------------------|---------------------|-----|
| `index.html`          | Fig 1 Log in / Sign up | everyone |
| `find-sessions.html`  | Fig 2 Find sessions | learner |
| `tutor-profile.html`  | Fig 3 Tutor profile | learner |
| `create-session.html` | Fig 4 Create a session | tutor |
| `session.html`        | Fig 5 Session details, booking, waiting list | learner |
| `workspace.html`      | Fig 6 Session workspace | tutor + booked learners |
| `my-learning.html`    | Fig 7 Practice, feedback, history, complaints | learner |
| `my-profile.html`     | Tutor profile editor (FR-03) | tutor |
| `coordinator.html`    | Applications, missed sessions, complaints, demand, decision log | coordinator, admin |
| `admin.html`          | Accounts (FR-01) | admin |
| `my-bookings.html`, `my-sessions.html`, `notifications.html` | supporting pages | |
| `tests.html`          | Automated tests (NFR-14) | developers |

## Where each function lives (modular – NFR-13)

| File | Section | Functions |
|------|---------|-----------|
| `js/auth.js`      | 1.1 Accounts and Roles | registerUser, logIn, logOut, getUserRole, canAccess, requireRole |
| `js/profiles.js`  | 1.2 Tutor Profiles | saveTutorProfile, getTutorProfile, listTutorApplications, approveTutor, rejectTutor, approveSubjectCoverage |
| `js/search.js`    | 1.3 Search | searchTutors, searchSessions, filterByFormat, filterByTime, filterByGroupSize, applyFilters |
| `js/sessions.js`  | 1.4 Sessions | createSession, viewSessionDetails, getRemainingSeats, bookSession, cancelBooking, getBookedLearners, recordAttendance, getAttendance, sendReminders |
| `js/workspace.js` | 1.5 Session Workspaces | uploadMaterial, postAnnouncement, postQuestion, postPreparationNote, viewWorkspace |
| `js/learning.js`  | 1.6 Practice and Feedback | submitPractice, addTutorComment, viewSubmissions, viewSessionHistory, leaveFeedback |
| `js/quality.js`   | 1.7 Coordination and Quality | reviewTutorApplication, getMissedSessionsReport, canGiveFeedback, recordComplaint, recordDecision, listComplaints, viewComplaintHistory |
| `js/insights.js`  | 1.8 Demand and Insights | joinWaitingList, getUnmetDemand, getWaitingListLength, getAttendancePattern, getTutorAvailability, getDemandSummary, setDemandLimit, checkDemand, listSuggestions, recordSuggestionDecision |
| `js/data.js`      | – | localStorage "database" + sample data |
| `js/layout.js`    | – | sidebar per role + shared helpers |
| `js/pages/*.js`   | – | one script per page that connects the screen to the functions |
| `js/tests.js`     | – | automated tests |

Every function that changes data calls `requireRole()` first (FR-02).

## Non-functional requirements covered

- **NFR-04 / NFR-05** – full sessions refuse bookings; booking twice never creates a duplicate.
- **NFR-06** – a learner cannot book two sessions that overlap in time.
- **NFR-07 / NFR-08** – role checks on every action and page; complaints only visible to coordinators and the person who made them.
- **NFR-09** – feedback is only visible to the session's tutor and the learner who wrote it.
- **NFR-10** – responsive layout for desktop, tablet and phone.
- **NFR-13** – one file per module (auth, profiles, search, sessions, workspace, learning, quality, insights).
- **NFR-14** – open `tests.html` to run the automated tests on the booking logic.

## Run it locally

Open the folder in VS Code, install the **Live Server** extension,
right-click `index.html` → **Open with Live Server**.

## Known limits of this phase

- No server yet: data lives in each browser's localStorage.
- Uploaded files: only the file name and size are saved, not the file itself.
- Reminders and coordinator alerts show up in Notifications. No real emails are sent.
