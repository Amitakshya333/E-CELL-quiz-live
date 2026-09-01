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

## Pass 1 — Cloud foundation, auth, quiz creation, PDF slides
1. Enable Lovable Cloud for organizer authentication, database, storage, and server-side functions.
2. Add the relational schema with explicit grants and RLS for organizers, quizzes, slides, question metadata, rooms, participants, answers, and event history. Keep presentation content and slide metadata separate.
3. Seed one realistic demo quiz, “CAN YOU CRACK THE STARTUP?”, with around eight slides and configured question metadata in the migration.
4. Implement email/password registration, login, logout, protected organizer routes, and friendly loading/error states.
5. Implement create-quiz flow: name/description, PDF-only upload with a 50 MB guard, progress states, persisted original file, and slide records.
6. Add browser-compatible PDF rendering and thumbnail generation for the slide manager; preserve the uploaded PDF as the visual source of truth.
7. Build slide manager with slide list, selected-slide preview, slide-type selector (NORMAL, QUIZ, JOIN, LEADERBOARD, RESULTS), and quiz fields for answer, positive points, timer, and fixed-point scoring.
8. Add save, edit, duplicate, archive/delete confirmation, and live-room edit lock behavior.

## Pass 2 — Authoritative rooms and participant joining
1. Create room service boundaries for room creation, status transitions, participant membership, and state recovery.
2. Generate short unambiguous room codes and `/join/$roomCode` links with QR support and copy-link action.
3. Implement the explicit state model for room status and quiz question state; reject invalid transitions server-side.
4. Implement participant join without an account, name validation, duplicate-name handling, reconnect identity where possible, and lobby state.
5. Add realtime synchronization using the Cloud-compatible realtime transport available to the project, with one normalized room-state model consumed by host, projector, and participant clients.
6. Persist important events only: joins, answers, transitions, score updates, and room lifecycle; derive countdowns from server timestamps instead of writing timer ticks.

## Pass 3 — Host console, projector, answering, scoring, leaderboard
1. Build the desktop host console in the selected editorial direction: compact navigation, dominant slide canvas, status rail, participant/answer counts, timer, connection status, and keyboard shortcuts.
2. Implement valid actions only for each state: start question, open answering, close answering, reveal, leaderboard, next slide, finish, and close room.
3. Enforce answer submission on the server: room membership, active slide/question, ANSWERING state, timer boundary, one answer per participant, and no client-supplied score/correctness.
4. Compute and persist authoritative points during reveal; expose correct answers only to authorized host/projector contexts and to participants after reveal.
5. Build responsive projector mode with original PDF slide rendering, minimal overlays, join QR/lobby, timer, response count, results, leaderboard, and final results; no admin controls.
6. Build mobile participant states: join, waiting, answer tiles, locked submission, reveal result, personal score/rank, reconnecting, and finished.
7. Build restrained leaderboard transitions and top-3/top-5/full display options.

## Pass 4 — Results, reliability, accessibility, verification
1. Add organizer results with participant summary, question-level answer counts/accuracy, and ranked participant results.
2. Add reconnect/recovery for host, projector, and participants by refetching authoritative room state; retain participants and scores after refresh/disconnect.
3. Cover upload, room, realtime, answer, timer, transition, and empty/error/disconnected states with retry affordances and quiet toasts.
4. Add keyboard accessibility, focus states, touch-safe participant controls, contrast checks, and responsive verification for host, projector, and mobile widths.
5. Add automated tests for scoring, answer locking, closed questions, state transitions, leaderboard ranking, and timer expiry.
6. Verify the complete flow with one host, one projector, and at least three participant browser sessions: create/upload/configure, room join, synchronized slide changes, answering, close/reveal, scoring, leaderboard, and final results.

## Technical decisions
- Use TanStack Start routes and `createServerFn` for app-internal server operations; use protected middleware for organizer operations and validate participant room membership server-side.
- Use Cloud storage for the original PDF and database metadata; never mutate or recreate uploaded slide content.
- Keep reusable domain logic in client-safe service modules plus server-only helpers; keep scoring and state-transition functions pure and independently testable.
- Use generated UI primitives where they fit, but preserve the selected direction’s tokens and composition in the app-level surfaces.
- Treat the realtime room state as the single source of truth; browsers render that state and never author scores, correct answers, or room transitions.
- Defer PPTX, OCR/AI slide parsing, teams, buzzer mode, chat, subscriptions, advanced anti-cheat, and export until after the MVP acceptance flow is stable.

## MVP acceptance gate
A host can register, create a quiz, upload a real PDF, see/configure its slides, start a room, show a QR code, open projector mode, receive multiple participant joins, open/close answering, accept one answer per participant, reveal and score on the server, synchronize a leaderboard across all three surfaces, advance through the deck, and finish with organizer and participant results.
