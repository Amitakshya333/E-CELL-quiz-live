# QuizStage MVP build plan

## Outcome
Build QuizStage as a presentation-first live quiz platform: organizers upload a PDF, configure quiz metadata without changing the PDF, start a room, and run synchronized host, projector, and participant experiences.

The selected visual direction is **Signal red editorial**: warm paper surfaces, rich ink control surfaces, Fraunces-style display typography, Inter body text, Space Mono telemetry, restrained red/blue/amber signals, compact controls, and clear 16:9 stage composition.

## Product surfaces and routes
- Public landing page at `/` focused on the presentation → upload → QR join → live quiz flow.
- Organizer auth at `/login` and `/register`.
- Protected organizer shell with `/dashboard`, `/quizzes`, `/quizzes/new`, `/quizzes/$quizId`, `/quizzes/$quizId/edit`, `/quizzes/$quizId/slides`, and `/rooms/$roomId/results`.
- Live host control at `/rooms/$roomId/host`.
- Control-free projector display at `/projector/$roomCode`.
- Mobile participant flow at `/join/$roomCode`.
- Each content route receives unique title, description, Open Graph title/description, and Twitter card metadata.

## Pass 1 — Foundation, presentation workflow, and live room foundation
1. Enable Lovable Cloud for organizer authentication, PostgreSQL, secure PDF storage, realtime subscriptions, and server-side functions.
2. Add the relational schema with explicit grants and RLS for organizers, quizzes, presentations, slides, question metadata, rooms, participants, answers, and event history. Keep the uploaded presentation and slide metadata separate.
3. Model a room as the authoritative live state, including `status`, `current_slide_id`, `question_state`, `question_started_at`, and `question_ends_at`. Keep room lifecycle status separate from the question state.
4. Implement the explicit state machine and server-side transition guards:
   `WAITING → PRESENTING → QUESTION_OPEN → QUESTION_CLOSED → ANSWER_REVEALED → LEADERBOARD → NEXT_SLIDE`.
   Room actions must validate the current state atomically and reject invalid transitions; the host browser never becomes the source of truth.
5. Create separate `slides` and `question_metadata` records. Slides hold `quiz_id`, `slide_number`, `page_number`, and `slide_type`; question metadata exists only for question slides and holds `correct_answer`, positive `points`, `timer_seconds`, and `scoring_mode`.
6. Add a unique answer identity constraint equivalent to `UNIQUE(room_id, participant_id, slide_id)`, with server-side duplicate rejection and answer locking.
7. Seed one realistic demo quiz, “CAN YOU CRACK THE STARTUP?”, with around eight slides representing intro, rules, join, questions, leaderboard, and final results, including configured question metadata.
8. Implement email/password registration, login, logout, protected organizer routes, and friendly loading/error states.
9. Implement create-quiz flow: name/description, PDF-only upload with a 50 MB guard, progress states, persisted original file, and one slide record per PDF page.
10. Add browser-compatible PDF rendering and thumbnail generation for the slide manager; preserve the original PDF as the visual source of truth and do not parse question text or use AI analysis.
11. Build the actual slide configuration UI: slide list, selected-slide PDF preview, slide type controls for NORMAL, QUIZ, JOIN, LEADERBOARD, and RESULTS, plus question-only fields for correct answer A/B/C/D, positive points, timer options, and fixed-point scoring.
12. Add save, edit, duplicate, archive/delete confirmation, live-room edit lock behavior, room creation, unique unambiguous room codes, QR join URL, and a recoverable initial room state.

## Pass 2 — Live quiz engine
1. Create service boundaries for authoritative room reads, state transitions, participant membership, answer submission, scoring, leaderboard calculation, and event recording.
2. Implement the host → room state → projector/participant synchronization path using the Cloud-compatible realtime transport, with one normalized room-state model consumed by every client.
3. Define and broadcast live events including `ROOM_STARTED`, `SLIDE_CHANGED`, `QUESTION_OPENED`, `ANSWER_SUBMITTED`, `QUESTION_CLOSED`, `ANSWER_REVEALED`, `SCORES_UPDATED`, `LEADERBOARD_SHOWN`, and `QUIZ_FINISHED`.
4. Implement participant join without an account, name validation, duplicate-name handling, reconnect identity where possible, and lobby state at `/join/$roomCode`.
5. Enforce answer submission on the server: room exists, participant belongs to the room, the slide/question is active, the state is `QUESTION_OPEN`, the server time is before `question_ends_at`, and no answer already exists for that participant/question.
6. Calculate correctness and points only on the server during reveal, persist the answer and score update transactionally, and never send the correct answer or scoring authority to participants before reveal.
7. Derive remaining time from server timestamps on every client; when the server time reaches `question_ends_at`, close answering and reject boundary-invalid submissions consistently.
8. Persist event history for room creation, joins, slide changes, question transitions, answer submissions, reveals, leaderboard display, score updates, and quiz completion without writing countdown ticks.

## Pass 3 — Host console, projector, participant experience, and results
1. Build the desktop host console in the selected editorial direction: compact navigation, dominant slide canvas, status rail, participant/answer counts, timer, connection status, and keyboard shortcuts.
2. Implement valid actions only for each state: start presenting, open question, close answering, reveal, show leaderboard, next slide, finish, and close room.
3. Build responsive projector mode with original PDF slide rendering, minimal overlays, join QR/lobby, server-derived timer, response count, results, leaderboard, and final results; no admin controls.
4. Build mobile participant states: join, waiting, answer tiles, immediate locked submission, reveal result, personal score/rank, reconnecting, and finished.
5. Build organizer results with participant summary, question-level answer counts/accuracy, and ranked participant results.
6. Build restrained leaderboard transitions and top-3/top-5/full display options.

## Pass 4 — Reliability, accessibility, and verification
1. Add reconnect/recovery for host, projector, and participants by refetching authoritative room state; retain participants and scores after refresh/disconnect.
2. Cover upload, room, realtime, answer, timer, transition, and empty/error/disconnected states with retry affordances and quiet toasts.
3. Add keyboard accessibility, focus states, touch-safe participant controls, contrast checks, and responsive verification for host, projector, and mobile widths.
4. Add automated tests for scoring, server-side answer locking, duplicate-answer constraints, closed-question rejection, invalid state transitions, leaderboard ranking, and timer expiry.
5. Verify the complete flow with one host, one projector, and at least three participant browser sessions: create/upload/configure, room join, synchronized slide changes, answering, close/reveal, scoring, leaderboard, and final results.

## Technical decisions
- Use TanStack Start routes and `createServerFn` for app-internal server operations; use protected middleware for organizer operations and validate participant room membership server-side.
- Use Cloud storage for the original PDF and database metadata; never mutate or recreate uploaded slide content.
- Keep reusable domain logic in client-safe service modules plus server-only helpers; keep scoring and state-transition functions pure and independently testable.
- Use generated UI primitives where they fit, but preserve the selected direction’s tokens and composition in the app-level surfaces.
- Treat the server-persisted room state as the single source of truth. The host is only an authorized command surface; projector and participant clients render synchronized state and never author scores, correctness, timers, answer validity, or room transitions.
- Keep scoring and state-transition logic pure and testable, but execute authoritative transitions and scoring in server functions/transactional database operations. Use server timestamps for timer boundaries and the unique answer constraint for idempotency.
- Defer PPTX, OCR/AI slide parsing, teams, buzzer mode, chat, subscriptions, advanced anti-cheat, and export until after the MVP acceptance flow is stable.

## MVP acceptance gate
A host can register, create a quiz, upload a real PDF, see/configure its slides, start a room, show a QR code, open projector mode, receive multiple participant joins, open/close answering, accept one answer per participant, reveal and score on the server, synchronize a leaderboard across all three surfaces, advance through the deck, and finish with organizer and participant results.
