# TutorCircle — Functional & Non-Functional Requirements

**Project:** TutorCircle — Peer Tutoring with Group Sessions and Learning Follow-Up
**Team:** SWEN 360 Group 4 | **Author:** Hashem Alzayer 

---

## 1. Scope

TutorCircle is a web application where learners find peer tutors and engage in individual
or group sessions, practice their knowledge and get feedback. It is created to be suitable for 
learners, tutors, coordinators, and administrators.

Requirements are listed with **MoSCoW** priorities (Must / Should / Could). The sprint tags represent 
 the sprint they are planned for. The team chose to implement **Demand and Session Insights** (Sprint 2) and
**Tutor Coordination and Service Quality** (Sprint 3) as the 2 advanced features.

---

## 2. Functional Requirements

### 2.1 Accounts and Roles
- **FR-01** *(Must, Sprint 1)* — Users can register as a learner, tutor, coordinator, or admin.
- **FR-02** *(Must, Sprint 1)* — Each role has access only to features relevant to it.

### 2.2 Tutor Profiles
- **FR-03** *(Must, Sprint 1)* — Tutors can create profiles with subjects, topic tags, experience, and availability.
- **FR-04** *(Should, Sprint 1)* — Coordinators can approve tutor applications and subject coverage.

### 2.3 Search
- **FR-05** *(Must, Sprint 1)* — Learners can search for tutors and sessions by both subject and topic.
- **FR-06** *(Must, Sprint 1)* — Learners can filter the results by session format, available time, and group size.

### 2.4 Sessions
- **FR-07** *(Must, Sprint 1)* — Tutors can make individual and group sessions mentioning objectives, duration, capacity, and location or external meeting link.
- **FR-08** *(Must, Sprint 1)* — Learners can book, cancel, and view details of session.
- **FR-09** *(Must, Sprint 1)* — Tutors can keep a record of attendance, and reminders are sent to learners who have booked.

### 2.5 Session Workspaces
- **FR-10** *(Should, Sprint 1)* — Tutors can upload materials and post announcements in a session workspace.
- **FR-11** *(Should, Sprint 1)* — Learners can post questions and preparation notes in the workspace.

### 2.6 Practice and Feedback
- **FR-12** *(Should, Sprint 1)* — Learners can submit practice work and receive tutor comments.
- **FR-13** *(Should, Sprint 1)* — Learners can view session history and leave feedback on attended sessions.

### 2.7 Tutor Coordination and Service Quality *(Advanced — Sprint 3)*
- **FR-14** *(Should, Sprint 3)* — Coordinators can review tutor applications, approve subject coverage, and see reports of repeated missed sessions.
- **FR-15** *(Should, Sprint 3)* — Feedback can be given only by learners who attended a session.
- **FR-16** *(Should, Sprint 3)* — Complaints and coordinator decisions are recorded and traceable.

### 2.8 Demand and Session Insights *(Advanced — Sprint 2)*
- **FR-17** *(Could, Sprint 2)* — Coordinators can see demands that are unmet, lengths of waiting list, attendance patterns, and tutor availability based on topic.
- **FR-18** *(Could, Sprint 2)* — The system suggests extra sessions when demand exceeds a configurable limit, and records if the coordinator acted on it.

---

## 3. Non-Functional Requirements

### 3.1 Performance
- **NFR-01** *(Must, Sprint 1)* — Search results return within 2 seconds for up to 1,000 tutor profiles.
- **NFR-02** *(Must, Sprint 1)* — Session pages load within 3 seconds on standard broadband.
- **NFR-03** *(Should, Sprint 2)* — The system supports at least 500 concurrent users during peak booking periods.

### 3.2 Concurrency and Reliability
- **NFR-04** *(Must, Sprint 1)* — The system prevents bookings when multiple learners register at once and capacity is full.
- **NFR-05** *(Must, Sprint 1)* — Booking confirmations are idempotent so that repeated requests don't result in duplicate bookings.
- **NFR-06** *(Should, Sprint 2)* — Schedules are checked before confirmation so an old invitation cannot create an overlapping booking, preventing conflicts.

### 3.3 Security and Privacy
- **NFR-07** *(Must, Sprint 1)* — Role based access control restricts private feedback and coordinator complaints to authorized users.
- **NFR-08** *(Should, Sprint 2)* — Public tutor profiles, session materials, and coordinator complaints have separate visibility rules based on role.
- **NFR-09** *(Should, Sprint 3)* — Feedback is only visible to the tutor and the learner who submitted it.

### 3.4 Usability
- **NFR-10** *(Must, Sprint 1)* — The web app is responsive and usable for both desktop and tablet browsers.
- **NFR-11** *(Must, Sprint 1)* — No native mobile app is required; all features are accessible via a modern web browser.
- **NFR-12** *(Could, Sprint 2)* — Tutor recommendations include an explanation of the ranking factors.

### 3.5 Maintainability and Testability
- **NFR-13** *(Must, Sprint 1)* — The system uses a modular architecture separating authentication, booking, matching, and reporting.
- **NFR-14** *(Must, Sprint 1)* — Core booking logic is covered by automated tests.
- **NFR-15** *(Must, Sprint 1)* — All requirements are traceable to user stories.

### 3.6 Availability
- **NFR-16** *(Should, Sprint 3)* — The system targets 99% uptime during the semester demonstration period.

---

## 5. Traceability

| User Story | Related FRs | Related NFRs |
|---|---|---|
| US-01 | FR-01 | NFR-07 |
| US-02 | FR-02 | NFR-07 |
| US-03 | FR-03 | — |
| US-04 | FR-04, FR-14 | NFR-08 |
| US-05 | FR-05 | NFR-01 |
| US-06 | FR-06 | NFR-01 |
| US-07 | FR-07 | NFR-04, NFR-05 |
| US-08 | FR-07 | — |
| US-09 | FR-08 | NFR-04, NFR-05 |
| US-10 | FR-09 | — |
| US-11 | FR-10 | — |
| US-12 | FR-11 | — |
| US-13 | FR-12 | — |
| US-14 | FR-13 | NFR-09 |
| US-15 | FR-14 | NFR-08 |
| US-16 | FR-15, FR-16 | NFR-09 |
| US-17 | FR-17 | NFR-03, NFR-08 |
| US-18 | FR-18 | NFR-12 |
