# TutorCircle — Functional & Non-Functional Requirement

**Project:** TutorCircle — Peer Tutoring with Group Sessions and Learning Follow-Up

**Platform:** Web application (desktop and tablet browsers; no native mobile app)

**Team:** SWEN 360 Group 4

**Author:** Hashem Alzayer

**Status:** Draft — Sprint 1

---

## 1. Scope

TutorCircle is a web based peer tutoring platform where learners find suitable peer
tutors, join individual or small group sessions, practice what they learn, and
receive follow-up feedback. The system serves four roles: learners, peer tutors,
coordinators, and administrators.
This document defines the functional and non-functional requirements for the full
product. Each requirement is tagged with the sprint in which it is planned:

- **Sprint 1** — All core foundation features
- **Sprint 2** — Demand and Session Insights (advanced)
- **Sprint 3** — Tutor Coordination and Service Quality (advanced)

Of the six advanced features described in the project brief, this team is
implementing **Demand and Session Insights** (Sprint 2) and **Tutor Coordination
and Service Quality** (Sprint 3).

---

## 2. Functional Requirements

### 2.1 Accounts and Roles
- **FR-01** — Users can register as a learner, tutor, coordinator, or admin, with role-based permissions. *(Sprint 1)*
- **FR-02** — Each role only sees the features relevant to it. *(Sprint 1)*

### 2.2 Tutor Profiles
- **FR-03** — Tutors can create profiles with subjects, topic tags, experience, coordinator approval status, and availability. *(Sprint 1)*
- **FR-04** — Coordinators can approve tutor applications and subject coverage. *(Sprint 3)*

### 2.3 Search and Discovery
- **FR-05** — Learners can search for tutors by subject, topic, session format, available time, and group size. *(Sprint 1)*
- **FR-06** — Search results show tutor name, subjects, availability, and remaining places. *(Sprint 1)*

### 2.4 Session Creation and Booking
- **FR-07** — Tutors can create individual and group sessions with objectives, duration, capacity, and location or external meeting link. *(Sprint 1)*
- **FR-08** — Learners can book, cancel, and view session details. *(Sprint 1)*
- **FR-09** — The system records attendance for each session. *(Sprint 1)*
- **FR-10** — Booked learners receive session reminders. *(Sprint 1)*

### 2.5 Session Workspaces
- **FR-11** — Each session has a workspace with materials, learner questions, preparation notes, and tutor announcements. *(Sprint 1)*
- **FR-12** — Learners can submit practice work and tutors can provide comments. *(Sprint 1)*

### 2.6 Demand and Session Insights *(Advanced — Sprint 2)*
- **FR-13** — Coordinators can view unmet demand by topic. *(Sprint 2)*
- **FR-14** — Coordinators can view waiting-list lengths per session. *(Sprint 2)*
- **FR-15** — Coordinators can view attendance patterns by topic and session. *(Sprint 2)*
- **FR-16** — Coordinators can view tutor availability by topic. *(Sprint 2)*
- **FR-17** — The system suggests additional sessions when demand exceeds a configurable threshold, and tracks whether the suggestion was acted on. *(Sprint 2)*

### 2.7 Tutor Coordination and Service Quality *(Advanced — Sprint 3)*
- **FR-18** — Coordinators can review tutor applications and approve subject coverage. *(Sprint 3)*
- **FR-19** — Coordinators can manage reports of repeated missed sessions. *(Sprint 3)*
- **FR-20** — Only recorded participants of a session can submit feedback. *(Sprint 3)*
- **FR-21** — Complaints and coordinator decisions remain traceable with timestamps and reasons. *(Sprint 3)*

---

## 3. Non-Functional Requirements

### 3.1 Performance
- **NFR-01** — Search results return within 2 seconds for up to 1,000 tutor profiles. *(Sprint 1)*
- **NFR-02** — Session pages load within 3 seconds on a standard broadband connection. *(Sprint 1)*
- **NFR-03** — The system supports at least 500 concurrent users during peak booking periods. *(Sprint 2)*

### 3.2 Concurrency and Reliability
- **NFR-04** — The system prevents over-capacity bookings when multiple learners register simultaneously. *(Sprint 1)*
- **NFR-05** — Booking confirmations are idempotent — repeated requests don't create duplicate bookings. *(Sprint 1)*
- **NFR-06** — Schedule conflicts are rechecked before confirmation so an old invitation cannot create an overlapping booking. *(Sprint 2)*

### 3.3 Security and Privacy
- **NFR-07** — Role-based access control restricts private feedback, individual quiz results, and coordinator complaints to authorized users only. *(Sprint 1)*
- **NFR-08** — Public tutor profiles, session materials, and coordinator complaints have separate visibility rules based on role. *(Sprint 2)*
- **NFR-09** — Feedback is only visible to the tutor and the learner who submitted it. *(Sprint 3)*

### 3.4 Usability
- **NFR-10** — The web app is responsive and usable on desktop and tablet browsers. *(Sprint 1)*
- **NFR-11** — No native mobile app is required; all features are accessible via a modern web browser. *(Sprint 1)*
- **NFR-12** — Tutor recommendations include an explanation of the ranking factors. *(Sprint 2)*

### 3.5 Maintainability and Testability
- **NFR-13** — The system uses a modular architecture separating authentication, booking, matching, and reporting. *(Sprint 1)*
- **NFR-14** — Core booking logic is covered by automated tests. *(Sprint 1)*
- **NFR-15** — All requirements are traceable to user stories. *(Sprint 1)*

### 3.6 Availability
- **NFR-16** — The system targets 99% uptime during the semester demonstration period. *(Sprint 3)*

---

## 4. Sprint Summary

| Sprint | Focus | FRs | NFRs |
|---|---|---|---|
| Sprint 1 | Core foundation features | FR-01 to FR-12 | NFR-01, 02, 04, 05, 07, 10, 11, 13, 14, 15 |
| Sprint 2 | Demand and Session Insights | FR-13 to FR-17 | NFR-03, 06, 08, 12 |
| Sprint 3 | Tutor Coordination and Service Quality | FR-18 to FR-21 | NFR-09, 16 |

---

## 5. Traceability

*To be completed once user stories are finalized*

| User Story | Related FRs | Related NFRs |
|---|---|---|
| US-XX | FR-XX | NFR-XX |
