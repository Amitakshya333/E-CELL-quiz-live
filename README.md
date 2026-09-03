# Presentation Quiz Live

MASTER BUILD PROMPT — PRESENTATION-POWERED LIVE QUIZ PLATFORM

Build a production-quality web application for hosting live, projector-based interactive quizzes.

The core product concept is:

The organizer designs the quiz presentation externally (PowerPoint, Canva, Google Slides, etc.), exports it as a PDF, uploads that PDF to this platform, configures which slides are interactive quiz questions, starts a live quiz room, and participants join by scanning a QR code and answer A/B/C/D from their phones while the presentation is displayed on a projector. The host controls the entire experience and the platform calculates scores and displays live leaderboards in real time.

This is NOT a traditional quiz-building platform.

The presentation is the visual source of truth.

The website provides the interactive real-time layer on top of the uploaded presentation.

The product should feel like a polished combination of:

PowerPoint/Canva presentation workflow

Kahoot-style live participation

A professional event-control system

A real-time scoreboard

The application must be architected cleanly so it can later scale to college events, classrooms, workshops, corporate events, hackathons, E-Cell competitions, and public quiz competitions.

1. PRODUCT PRINCIPLE

The most important product principle is:

PRESENTATION FIRST

The organizer should NOT have to recreate their existing presentation inside the website.

They create their presentation however they want externally.

Example:

Slide 1 → Title
Slide 2 → Rules
Slide 3 → Round Introduction
Slide 4 → Question 1
Slide 5 → Question 2
Slide 6 → Leaderboard break
Slide 7 → Question 3
Slide 8 → Question 4
Slide 9 → Final Round
Slide 10 → Thank You


They export the presentation as PDF and upload it.

The platform then lets the organizer attach quiz functionality to selected slides.

The uploaded presentation must remain visually unchanged.

Do NOT redesign or reconstruct the user's presentation.

2. PRODUCT NAME

Use a temporary product name:

QuizStage

The branding must be easy to replace later.

Create a modern, premium, event-focused visual identity.

Possible positioning:

QuizStage
“Your presentation. Their phones. One live competition.”

Do not overuse the tagline inside the application.

3. PRIMARY USER ROLES

There are three interfaces.

A. HOST / ORGANIZER

Used on laptop or desktop.

The host creates and configures quizzes, starts rooms, controls the live event, reveals answers, and manages the leaderboard.

B. PROJECTOR / PRESENTATION DISPLAY

A separate full-screen presentation view intended for:

projector

TV

large display

conference screen

This view must contain NO administrative controls.

It should display only what participants should see.

C. PARTICIPANT

A mobile-first interface.

Participants scan a QR code, enter their name, join the room, and answer questions using large A/B/C/D buttons.

No app installation.

No participant account required for the MVP.

4. CORE USER JOURNEY

Implement this exact journey:

Organizer signs in
        ↓
Dashboard
        ↓
Create Quiz
        ↓
Upload PDF Presentation
        ↓
Presentation Processing
        ↓
Slide Manager
        ↓
Select Quiz Slides
        ↓
Configure Correct Answer
        ↓
Configure Points
        ↓
Configure Timer
        ↓
Save Quiz
        ↓
Start Live Quiz
        ↓
Generate Room Code + QR
        ↓
Open Projector Mode
        ↓
Participants Scan QR
        ↓
Participants Enter Name
        ↓
Participants Join Room
        ↓
Host Starts Question
        ↓
Participants Answer A/B/C/D
        ↓
Host Closes Answering
        ↓
Host Reveals Answer
        ↓
Server Calculates Scores
        ↓
Leaderboard
        ↓
Next Slide
        ↓
Next Question
        ↓
Final Results


5. AUTHENTICATION

For the MVP, implement organizer authentication.

Use email/password authentication.

The participant must NOT need an account.

Host:

/login
/register


Participant:

/join/:roomCode


Host dashboard routes should be protected.

Participants should only access the room they joined.

6. DASHBOARD

Create a professional dashboard.

Layout:

Sidebar

Dashboard
My Quizzes
Create Quiz
Results
Settings


Main dashboard

Header:

Good evening, [Host Name]


Primary CTA:

+ Create Quiz


Below it, show quiz cards.

Example:

CAN YOU CRACK THE STARTUP?
20 Questions
Created Aug 28, 2026
Last played Aug 30, 2026

[Edit] [Start Live Quiz]


Show:

quiz title

number of slides

number of configured questions

last modified

last event

status

Include search and filtering later, but keep MVP clean.

7. CREATE QUIZ

Create a dedicated creation flow.

Step 1:

Create New Quiz

Quiz Name
[________________________]

Description
[________________________]

[Continue]


Step 2:

Upload Presentation

Drag & drop PDF here

or

[Choose PDF]

Maximum reasonable file size:
50 MB for MVP


Support PDF first.

Do NOT implement PPTX yet.

After upload:

Processing presentation...

Uploading...
Reading pages...
Generating slide previews...
Preparing presentation...


Show a progress indicator.

8. PDF HANDLING

Store the original PDF securely.

Create slide/page representations for the slide manager and projector.

Each page becomes a slide.

Example:

presentation.pdf
    ↓
Slide 1
Slide 2
Slide 3
...
Slide 25


Use a proper PDF rendering solution.

Prefer PDF.js or another stable browser-compatible rendering mechanism.

Do not rasterize everything unnecessarily if the original PDF can be rendered directly.

Generate thumbnails for the slide manager.

The projector should prioritize visual fidelity.

9. SLIDE MANAGER

This is a critical screen.

Create a presentation-editor-like interface.

Layout:

┌──────────────┬─────────────────────────────┬──────────────┐
│ Slide List   │       Slide Preview        │ Slide Config │
│              │                             │              │
│ 1            │                             │ Type         │
│ 2            │       LARGE PDF            │              │
│ 3            │       PREVIEW               │ Normal       │
│ 4 ✓          │                             │ Quiz         │
│ 5            │                             │ Leaderboard  │
│ 6            │                             │              │
└──────────────┴─────────────────────────────┴──────────────┘


Each thumbnail should show:

slide number

miniature preview

slide type badge

Example badges:

NORMAL
QUIZ
LEADERBOARD
JOIN


10. SLIDE TYPES

Implement these slide types in MVP.

NORMAL

No interaction.

Display the uploaded slide exactly.

QUIZ

Interactive question.

Configuration:

Correct Answer
○ A
○ B
○ C
○ D

Points
[ 100 ]

Timer
[ 30 seconds ]


JOIN

Used for the participant waiting/join screen.

The system can display:

QR code

room code

participant count

LEADERBOARD

Displays live scoreboard.

The organizer can choose to show:

Top 3

Top 5

Top 10

Full leaderboard

RESULTS

Displays results for the current question.

Example:

Correct Answer: B

A — 4 answers
B — 18 answers
C — 2 answers
D — 1 answer


11. QUIZ SLIDE CONFIGURATION

When a slide is marked as QUIZ, show a configuration panel.

Fields:

Correct Answer

A / B / C / D

Points

Default 100.

Allow arbitrary positive integer.

Examples:
100
200
250
500
1000

Timer

Options:

No timer

10 sec

15 sec

20 sec

30 sec

45 sec

60 sec

Custom

Scoring Mode

MVP:

Fixed Points


Later:

Speed Based


Do NOT implement complex speed scoring yet unless architecture allows it cleanly.

12. IMPORTANT: PRESENTATION AND QUIZ METADATA MUST BE SEPARATE

Do NOT modify the uploaded PDF.

Create a metadata system.

Conceptually:

Presentation
    ↓
Slides
    ↓
Slide Metadata


Example:

{
  "slideNumber": 7,
  "type": "quiz",
  "correctAnswer": "B",
  "points": 200,
  "timerSeconds": 30
}


The presentation remains unchanged.

This separation is mandatory.

13. QUIZ ROOM SYSTEM

When the host clicks:

Start Live Quiz


create a new room.

Example:

Room Code:
QZ7X4K


Generate a participant URL:

https://quizstage.com/join/QZ7X4K


Generate a QR code pointing to that URL.

Room should have statuses:

LOBBY
LIVE
PAUSED
FINISHED
CLOSED


Each active room must have a unique room code.

Room codes must be short and easy to read.

Avoid ambiguous characters such as O/0 and I/1 where practical.

14. HOST LIVE CONTROL PANEL

This is one of the most important screens.

Make it look like a professional event-control console.

Layout:

┌────────────────────────────────────────────────────────┐
│ CAN YOU CRACK THE STARTUP?                             │
│ Room: QZ7X4K              Participants: 28            │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Current Slide: 7                                       │
│ Current Question: 4                                    │
│                                                        │
│                 [Slide Preview]                        │
│                                                        │
├────────────────────────────────────────────────────────┤
│ Status: ANSWERING                                      │
│ Answers: 23 / 28                                      │
│ Time Remaining: 14s                                   │
│                                                        │
│ [ OPEN ANSWERING ]                                    │
│ [ CLOSE ANSWERING ]                                   │
│ [ REVEAL ANSWER ]                                     │
│ [ SHOW LEADERBOARD ]                                  │
│ [ NEXT SLIDE ]                                        │
└────────────────────────────────────────────────────────┘


Only relevant actions should be active depending on current state.

Do not allow invalid transitions.

15. LIVE QUIZ STATE MACHINE

Implement an explicit state machine.

For quiz slides:

READY
   ↓
QUESTION_DISPLAYED
   ↓
ANSWERING
   ↓
ANSWERING_CLOSED
   ↓
ANSWER_REVEALED
   ↓
SCORES_UPDATED
   ↓
NEXT


Host controls:

READY
→ Start Question

QUESTION_DISPLAYED
→ Open Answering

ANSWERING
→ Close Answering

ANSWERING_CLOSED
→ Reveal Answer

ANSWER_REVEALED
→ Show Leaderboard / Next Slide

SCORES_UPDATED
→ Next


Do not allow participants to answer unless the question state is ANSWERING.

Do not allow answers after answering is closed.

The server must enforce this, not just the frontend.

16. PROJECTOR MODE

Create a completely separate route:

/projector/:roomCode


This route must be optimized for:

16:9 displays

fullscreen

projectors

TVs

large monitors

No navigation.

No dashboard.

No admin buttons.

No unnecessary browser UI.

The host should be able to click:

Open Projector


and open a new browser tab.

17. PROJECTOR BEHAVIOR

The projector follows the active room state.

If the room is showing slide 4:

Projector → Slide 4


If the host moves to slide 5:

Projector → Slide 5


No page refresh.

Use real-time events.

The uploaded slide must preserve the original visual appearance.

18. PROJECTOR QUIZ OVERLAY

For quiz slides, do not redesign the user's slide.

Display the original slide.

Add only minimal live UI overlays where appropriate:

timer

answer status

participant response count

Example:

┌───────────────────────────────────────────────┐
│                                               │
│      ORIGINAL USER PRESENTATION SLIDE        │
│                                               │
│                                               │
│                              18s              │
└───────────────────────────────────────────────┘


Make overlays visually subtle.

Allow the host to configure whether overlays are shown later.

19. JOIN SCREEN

When the host starts a room, the projector can show the join experience.

Display:

JOIN THE QUIZ

[ LARGE QR CODE ]

Scan with your phone

Room Code: QZ7X4K

23 participants joined


QR code must be large enough for projector viewing.

Do not display the full participant URL unless useful.

20. PARTICIPANT JOIN FLOW

Participant opens:

/join/QZ7X4K


Mobile UI:

CAN YOU CRACK THE STARTUP?

Enter your name

[________________]

[ JOIN QUIZ ]


Validate:

name is required

reasonable character limit

prevent empty names

prevent duplicate names in the same room if configured

After joining:

You're in!

Waiting for the host...


Display participant name.

21. PARTICIPANT QUIZ SCREEN

This is a mobile-first interface.

When answering opens:

Question 4

Choose your answer

┌────────────┐
│     A      │
└────────────┘

┌────────────┐
│     B      │
└────────────┘

┌────────────┐
│     C      │
└────────────┘

┌────────────┐
│     D      │
└────────────┘


Buttons must be:

large

touch-friendly

visually distinct

impossible to accidentally press twice

After submission:

Answer submitted ✓

Waiting for the host...


Prevent changing the answer in the MVP unless the host explicitly enables answer changes.

22. PARTICIPANT MUST NOT RECEIVE THE CORRECT ANSWER PREMATURELY

Correct answers must NEVER be sent to the participant client before reveal.

Do not place correct answers in easily inspectable frontend state.

The server must retain the authoritative correct answer.

Before reveal:

Participant should only receive:

room state

question number

answer choices

timer information if needed

After reveal:

correct answer

points earned

updated personal rank if desired

Security matters even for a quiz platform.

23. ANSWER SUBMISSION

When the participant taps:

B


send:

participantId
roomId
questionId
answer: B
timestamp


The backend validates:

room exists

participant belongs to room

question is active

answering is open

participant hasn't already submitted

If valid:

answer accepted


Otherwise reject.

24. SCORING ENGINE

MVP scoring:

Correct = question points
Wrong = 0
No answer = 0


Example:

Question:

Points = 500
Correct = B


Participant answers B:

+500


Participant answers A:

+0


Never calculate authoritative scores solely on the client.

The server must calculate and persist scores.

25. LEADERBOARD

Create live leaderboard functionality.

Display:

🏆 LEADERBOARD

1. Rahul        1250
2. Priya        1100
3. Aman          900
4. Sneha         850
5. Aditya        800


Leaderboard updates immediately after scoring.

Sort by:

score descending

tie-breaker timestamp / rules-based tie handling

Create a clean animation when rankings change.

Do not make animations so dramatic that they interfere with an event.

26. QUESTION RESULTS

After reveal, optionally display:

CORRECT ANSWER

B

18 participants answered correctly

A     4
B    18
C     2
D     1


This is useful for the projector.

The host can then choose:

[SHOW LEADERBOARD]


or

[NEXT SLIDE]


27. PARTICIPANT PERSONAL RESULTS

After a question is revealed, participant may see:

Correct ✓

+200 points

Your total:
750 points

Current rank:
#4


Do not reveal everyone else's detailed answers.

28. FINAL RESULTS

When the host finishes the final question:

Display a final leaderboard.

Example:

🏆 FINAL RESULTS

🥇 Rahul       3250
🥈 Priya       3100
🥉 Aman        2950

4. Sneha       2800
5. Aditya      2650


Include a subtle celebration animation.

Do not make the final screen overly flashy.

29. REAL-TIME ARCHITECTURE

This system is fundamentally real-time.

Use a WebSocket-based architecture.

Recommended:

Socket.IO

Events should conceptually include:

room_created
participant_joined
participant_left
slide_changed
question_opened
answer_submitted
question_closed
answer_revealed
scores_updated
leaderboard_updated
quiz_finished
room_closed


Server must be authoritative.

The projector, host and participants should all subscribe to room events.

30. DATABASE DESIGN

Use PostgreSQL.

Suggested entities:

users

id
name
email
password/auth provider
created_at
updated_at


quizzes

id
owner_id
title
description
presentation_file_url
status
created_at
updated_at


slides

id
quiz_id
slide_number
slide_type
created_at
updated_at


quiz_questions

id
slide_id
correct_answer
points
timer_seconds
scoring_mode


rooms

id
quiz_id
room_code
status
current_slide_id
created_at
started_at
ended_at


participants

id
room_id
display_name
score
joined_at
last_seen_at


answers

id
room_id
participant_id
slide_id
selected_answer
submitted_at
is_correct
points_awarded


room_events

Optional but strongly recommended.

id
room_id
event_type
payload
created_at


Use event history carefully so that debugging and future analytics are easier.

31. SERVER AUTHORITY

The backend must be authoritative for:

room state

active slide

question state

correct answer

participant membership

answer validity

scoring

leaderboard order

Never trust the browser for scoring.

32. REAL-TIME ROOM SYNCHRONIZATION

Every connected client should have a room state similar to:

{
  "roomCode": "QZ7X4K",
  "status": "LIVE",
  "currentSlide": 7,
  "currentQuestion": 4,
  "questionState": "ANSWERING",
  "participantsCount": 28,
  "answersReceived": 23,
  "serverTime": 172...
}


Clients derive their UI from this state.

Avoid scattered independent states that can drift.

Use a centralized state model.

33. TIMER

Timer must be server-authoritative.

Do not rely solely on:

setInterval(...)


on the participant browser.

Server should record:

questionOpenedAt
questionEndsAt


Clients calculate remaining time based on synchronized server time.

When time reaches zero:

server closes answering


Participants cannot answer after that.

34. NETWORK INTERRUPTION HANDLING

This is an event product, so network issues are important.

Implement reasonable recovery behavior.

If host connection briefly drops:

reconnect automatically

restore current room state

retain participants

preserve scores

If participant disconnects:

keep their score

allow reconnecting from the same browser/session where possible

Do not lose the quiz because of one temporary connection issue.

35. HOST REFRESH / RECONNECT

If the host accidentally refreshes the page:

The active room must not disappear.

After reconnecting:

Restore live room
Current slide
Current question
Current state
Participant count
Scores


This is extremely important.

36. SESSION SECURITY

Use secure room access.

Participant join links should only allow joining the specified room.

Prevent arbitrary manipulation of:

participant score

answer

room state

correct answer

room ownership

Validate all server actions.

37. UI DESIGN DIRECTION

The UI should feel:

premium

modern

minimal

event-ready

professional

responsive

Avoid:

excessive gradients

childish cartoon styling

excessive glassmorphism

huge shadows

unnecessary decorative elements

generic SaaS-dashboard appearance everywhere

This is a live event platform.

The projector experience should look polished and exciting.

38. HOST DASHBOARD VISUAL LANGUAGE

Use:

clean dark/light neutral interface

strong hierarchy

compact controls

clear status badges

obvious primary buttons

Example status:

● LOBBY
● LIVE
● ANSWERING
● CLOSED
● REVEALED
● FINISHED


Use consistent visual semantics.

39. PARTICIPANT UI DESIGN

Participant UI should prioritize:

Speed > decoration

The participant should be able to join and answer with almost no learning curve.

Large buttons.

Large touch targets.

Minimal text.

No sidebar.

No unnecessary navigation.

40. PROJECTOR DESIGN

Projector mode should prioritize:

Readability from distance

Use:

large typography for overlays

strong contrast

minimal UI

16:9 design

smooth transitions

Do not put small text on the projector.

41. RESPONSIVE BEHAVIOR

Host:

desktop-first.

Projector:

16:9-first.

Participant:

mobile-first.

The three views should not simply be one responsive page.

They are different products/views sharing the same backend.

42. PROJECT STRUCTURE

Use a clean code structure.

Recommended conceptual structure:

app/
  dashboard/
  quizzes/
  rooms/
  join/
  projector/

components/
  host/
  participant/
  projector/
  slides/
  leaderboard/
  ui/

lib/
  auth/
  db/
  quiz/
  rooms/
  scoring/
  realtime/
  pdf/
  qr/

server/
  socket/
  room/
  scoring/


Keep business logic separate from UI.

43. API / SERVER SERVICES

Create clean service boundaries.

Examples:

QuizService
PresentationService
RoomService
ParticipantService
AnswerService
ScoringService
LeaderboardService


The scoring logic should be testable independently.

44. ERROR HANDLING

Every major async operation needs proper states:

loading
success
error
retry


Examples:

Upload fails:

Upload failed

[Retry]


Room cannot start:

Unable to start room

[Try Again]


WebSocket disconnected:

Reconnecting...


Do not leave users staring at a broken page.

45. EMPTY STATES

Create polished empty states.

Example:

No quizzes yet

Create your first live quiz from your presentation.

[Create Quiz]


46. TOAST / NOTIFICATION SYSTEM

Use subtle notifications for events such as:

Quiz saved
Presentation uploaded
Question updated
Participant joined
Answer submitted
Room started


Do not spam notifications during live play.

47. ACCESSIBILITY

Implement:

keyboard accessibility for host controls

clear focus states

sufficient contrast

semantic buttons

accessible labels

large participant touch targets

48. ANALYTICS / RESULTS PAGE

After a quiz ends, show a results page for the organizer.

Include:

Participants: 28
Questions: 20
Average Score: 1430
Highest Score: 3250


Question-level analytics:

Question 7

A — 4
B — 18
C — 2
D — 1

Correct: B
Accuracy: 72%


Participant results:

Rank
Name
Score
Correct
Wrong
Accuracy


Allow export later.

For MVP, a clean web-based results screen is enough.

49. QUIZ EDITING

After creation, the organizer must be able to reopen a quiz.

They can modify:

title

slide types

correct answers

points

timers

Do not allow editing a quiz's configuration while a live room is actively using it unless you explicitly implement versioning.

For MVP:

Lock quiz editing while live.

50. QUIZ DUPLICATION

Add:

Duplicate Quiz


This creates a copy of:

presentation

slide metadata

question configuration

Useful for repeated college events.

51. DELETE / ARCHIVE

Support:

delete quiz

archive quiz

Use confirmation dialogs.

Never delete immediately with one accidental click.

52. QR CODE

Use a stable QR code library.

QR code must point to:

/join/:roomCode


Host can enlarge it.

Provide:

[Copy Join Link]
[Download QR]


Later, PDF/PNG download can be added.

53. ROOM LOBBY

Before quiz starts:

Projector:

GET READY!

Scan the QR code to join

[ QR ]

Room Code: QZ7X4K

Participants: 28

Waiting for host...


Host:

28 participants connected

[ START QUIZ ]


Participant:

You're in!

Waiting for the quiz to start...


54. PARTICIPANT COUNT

Live update:

Participants: 28


Host and projector should update instantly when users join or leave.

55. CHEATING / FAIR PLAY BASICS

For MVP:

one answer per participant per question

server-side answer locking

server-side scoring

correct answer hidden until reveal

participant cannot access host routes

participant cannot manipulate score

Later:

prevent duplicate browser sessions

suspicious behavior detection

network/IP controls

anti-collusion features

Do not overengineer anti-cheat in MVP.

56. PERFORMANCE TARGET

The system should comfortably support at least:

100 concurrent participants per live room

Architect it so it can later scale to:

500+ participants per room

Do not create database writes for every visual UI update.

Use real-time events efficiently.

57. DATABASE WRITE STRATEGY

Persist important state:

participant join

answer submission

score update

room state transitions

Do not constantly write countdown timer updates to the database.

Timer should be derived from timestamps.

58. IMPORTANT LIVE EVENT REQUIREMENT

The application must remain usable if:

participant count increases

many users answer simultaneously

host changes slides rapidly

timer expires while answers are arriving

Use transactional server-side logic where appropriate.

The system should guarantee that an answer arriving at the exact boundary is accepted or rejected consistently according to the server's timing rules.

59. MVP LIMITATIONS

Do NOT build these yet unless absolutely necessary:

team mode

buzzer mode

AI question generation

PPTX import

direct Canva integration

chat

social features

complex animations

marketplace

subscriptions

advanced anti-cheat

video hosting

complicated presentation editor

Keep the first version focused.

60. FUTURE ARCHITECTURE SHOULD ALLOW

Later we should be able to add:

PPTX upload

Organizer uploads PowerPoint directly.

Speaker Notes Metadata

Potential future convention:

#QUIZ
ANSWER=B
POINTS=200
TIME=30


The system could automatically configure questions.

AI slide detection

AI can analyze an uploaded presentation and suggest:

likely question slides

answer choices

question metadata

But require organizer review.

Canva Integration

Import presentations directly from Canva.

Team Mode

Teams join as:

Team A

Team B

Team C

Buzzer Mode

Fastest participant/team gets the chance to answer.

Advanced scoring

Speed-based points.

Certificates

Automatically generate certificates for winners.

These are future features, not MVP requirements.

61. IMPORTANT PRODUCT DECISION

The platform should NOT attempt to parse the question text from the PDF in the MVP.

The PDF is primarily a visual presentation.

For a quiz slide, the organizer manually configures:

Correct answer
Points
Timer


This avoids unreliable OCR or AI assumptions.

Later, intelligence can be added.

62. HOST SHORTCUTS

For live events, keyboard shortcuts would be extremely useful.

Implement:

Space       → Next / primary action
R           → Reveal answer
L           → Show leaderboard
N           → Next slide
O           → Open answering
C           → Close answering


Avoid shortcuts that could accidentally trigger dangerous actions without confirmation.

63. FULLSCREEN

Projector mode:

[Enter Fullscreen]


Host should be able to open projector in a new tab.

Participant stays on mobile.

64. LIVE EVENT RECOVERY

If the projector refreshes:

It reconnects and asks the server:

What is the current room state?


Server responds with:

current slide

question state

timer endpoints

participant count

leaderboard if appropriate

Projector reconstructs the current state.

Same for host.

65. DATA CONSISTENCY

There must be one authoritative state:

Server


Not:

Host browser


Not:

Projector browser


Not:

Participant browser


The server is the source of truth.

66. SECURITY RULE

Never expose:

correct answer

scoring authority

room administrative secrets

to participants before appropriate reveal.

Do not trust any score supplied by frontend code.

67. DEMO DATA

After building the application, create one example quiz:

CAN YOU CRACK THE STARTUP?

Use around 8 sample slides/questions.

Example structure:

1. Intro
2. Rules
3. Join
4. Question
5. Question
6. Leaderboard
7. Question
8. Final Results


Use realistic placeholder content.

The demo should make the whole product understandable immediately.

68. POLISHED PRODUCT STATES

Every screen must account for:

loading

empty

error

disconnected

reconnecting

success

live

finished

Do not leave unhandled UI states.

69. TESTING REQUIREMENTS

Implement basic automated tests for:

Scoring

Correct answer:

+points


Wrong:

0


Answer locking

Second answer attempt:

rejected


Closed question

Answer:

rejected


Room state

Invalid state transition:

rejected


Leaderboard

Higher score:

higher rank


Timer

After end timestamp:

answering closes


70. BUILD QUALITY

Do not generate a superficial prototype.

Build this like a real product MVP.

Prioritize:

clean architecture

reusable components

type safety

server-side validation

real-time correctness

responsive interfaces

error handling

maintainability

Avoid hardcoded fake interactions.

The quiz should actually work end-to-end.

71. REQUIRED END-TO-END DEMO

When development is complete, I should be able to perform this entire scenario:

HOST

Register

Create quiz

Upload PDF

See all slides

Mark slides as quiz slides

Set:

correct answer

points

timer

Save quiz

Start live room

See QR code

Open projector

Participants join

See participant count

Navigate to question

Open answering

Watch answer count increase

Close answering

Reveal answer

See scores update

Show leaderboard

Continue through remaining questions

Finish quiz

See final results

PARTICIPANT

Scan QR

Enter name

Join

Wait

Receive question state

Select A/B/C/D

See answer submitted

Receive result after reveal

See updated score/rank

See final result

PROJECTOR

Open projector URL

Show join screen

Update participant count live

Follow host slide changes

Show timer

Show answer/reveal state

Show leaderboard

Show final winner

All three views must remain synchronized.

72. FINAL UI STRUCTURE

The application should ultimately have these main routes:

/
        Landing page

/login
/register

/dashboard

/quizzes
/quizzes/new
/quizzes/:quizId
/quizzes/:quizId/edit

/quizzes/:quizId/slides

/rooms/:roomId/host

/projector/:roomCode

/join/:roomCode

/rooms/:roomId/results


73. LANDING PAGE

Create a polished landing page explaining the concept immediately.

Hero:

Turn Your Presentation
Into a Live Quiz.

Design your quiz anywhere.
Upload your presentation.
Let participants play from their phones.

[Create a Quiz]
[See How It Works]


Visual flow:

Presentation
     ↓
Upload
     ↓
QR Join
     ↓
Live Quiz
     ↓
Leaderboard


Explain the three-screen experience:

HOST
Controls everything

PROJECTOR
Shows the presentation

PARTICIPANTS
Answer from phones


Keep this page clean and product-oriented.

74. DO NOT MAKE THESE PRODUCT MISTAKES

Do NOT build:

a traditional Google Forms clone

a normal quiz form

a question bank as the primary experience

a generic LMS

a PowerPoint editor

a chat application

a generic SaaS dashboard with a quiz attached

The product's identity is:

PRESENTATION-POWERED LIVE INTERACTION.

75. IMPLEMENTATION PRIORITY

Build in this order:

Priority 1

Authentication

Priority 2

Quiz creation

Priority 3

PDF upload and slide rendering

Priority 4

Slide metadata/configuration

Priority 5

Room creation

Priority 6

Participant joining

Priority 7

Real-time communication

Priority 8

Question answering

Priority 9

Server-side scoring

Priority 10

Leaderboard

Priority 11

Projector mode

Priority 12

Results

Priority 13

Polish and reliability

76. FINAL ACCEPTANCE CRITERIA

Consider the MVP complete only when this works:

A host uploads a real PDF presentation.

↓
The presentation appears as slides.

↓
The host marks selected slides as quiz slides.

↓
The host selects A/B/C/D as the correct answer.

↓
The host assigns different points to different questions.

↓
The host starts a live room.

↓
A QR code appears.

↓
Multiple real browser sessions can join from phones.

↓
The projector displays the original presentation.

↓
The host advances to a quiz slide.

↓
Participants receive A/B/C/D controls.

↓
Participants submit answers.

↓
The host can close answering.

↓
The host reveals the answer.

↓
The server evaluates every answer.

↓
Scores update.

↓
Leaderboard updates in real time.

↓
The host continues to the next question.

↓
The final leaderboard appears.

↓
The entire event can run without manual spreadsheet scorekeeping.


77. DEVELOPMENT APPROACH

Start by implementing the actual functional backbone first.

Do not spend the majority of development effort on visual decoration before the real-time architecture works.

Build:

Database
   ↓
Server
   ↓
Room State
   ↓
WebSocket Events
   ↓
Host
Projector
Participant


Then add visual polish.

The final application should feel extremely smooth during a live event because reliability and synchronization are more important than fancy visuals.

78. IMPORTANT LOVABLE INSTRUCTION

You have permission to make reasonable implementation decisions where this specification does not dictate an exact technical detail.

However:

Do not remove core functionality.

Do not replace the presentation-first concept with a normal quiz builder.

Do not fake real-time functionality.

Do not use hardcoded participant data in the live room.

Do not create fake leaderboards.

Do not reveal correct answers to participants before the server reveals them.

Do not calculate authoritative scores solely on the frontend.

Do not redesign uploaded presentation slides.

Do not require participants to create accounts.

Do not make participants install an application.

Build the first version as a real working end-to-end product, not merely a visual mockup.

After implementing the MVP, verify the complete three-client flow using multiple browser sessions:

Host

Projector

At least 3 simulated participants

Verify that slide changes, question state, answer submission, answer locking, reveal, scoring, and leaderboard updates synchronize correctly across all clients.

The final result should be a polished, production-oriented MVP of a presentation-powered live quiz platform. The prompt above is the master specification; after the initial generation, build in controlled passes:

Pass 1: database + auth + quiz + PDF/slides
Pass 2: room + Socket.IO/realtime + participant joining
Pass 3: host control + projector + scoring + leaderboard
Pass 4: reliability, reconnects, edge cases, responsive polish

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c07a2e1e-08e9-4a20-8125-58702c210ab3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
