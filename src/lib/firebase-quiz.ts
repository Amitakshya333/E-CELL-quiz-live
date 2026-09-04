import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
  increment,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../integrations/firebase/client";

export type FirebaseSlide = {
  id: string;
  slide_number: number;
  page_number: number;
  slide_type: "normal" | "quiz" | "join" | "leaderboard" | "results";
  slide_title?: string | null;
  question_text?: string | null;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  } | null;
  question_metadata?: {
    correct_answer: "A" | "B" | "C" | "D";
    points: number;
    timer_seconds: number | null;
  } | null;
};

export type FirebaseRoom = {
  id: string;
  room_code: string;
  quiz_id: string;
  quiz_title: string;
  status: "waiting" | "presenting" | "paused" | "finished" | "closed";
  current_slide_id: string | null;
  current_slide_number: number;
  question_state: "ready" | "question_open" | "question_closed" | "answer_revealed" | "leaderboard";
  question_started_at: string | null;
  question_ends_at: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
  slides: FirebaseSlide[];
};

export type FirebaseParticipant = {
  id: string;
  room_code: string;
  display_name: string;
  score: number;
  joined_at: string;
};

export type FirebaseAnswer = {
  id: string;
  room_code: string;
  participant_id: string;
  slide_id: string;
  selected_answer: "A" | "B" | "C" | "D";
  is_correct: boolean | null;
  points_awarded: number;
  submitted_at: string;
};

export type FirebaseQuiz = {
  id: string;
  title: string;
  description: string | null;
  status: "ready" | "draft";
  created_at: string;
  owner_id: string;
  slide_count: number;
  question_count: number;
  page_count: number;
  file_name?: string | null;
  slides: FirebaseSlide[];
};

export const CANONICAL_STARTUP_QUIZ_ID = "startup-quiz-2026";

export function getCanonicalStartupDeck(): FirebaseSlide[] {
  return [
    {
      id: "startup-slide-1",
      slide_number: 1,
      page_number: 1,
      slide_type: "normal",
      slide_title: "CAN YOU CRACK THE STARTUP?",
      question_text: "The High-Stakes Founder & Innovation Challenge. Prepare to test your venture instincts!",
    },
    {
      id: "startup-slide-2",
      slide_number: 2,
      page_number: 2,
      slide_type: "normal",
      slide_title: "ARENA RULES",
      question_text: "1. Scan the QR code or go to the join link.\n2. Lock in your answers before the timer runs out.\n3. Fastest correct answers earn the championship trophy!",
    },
    {
      id: "startup-slide-3",
      slide_number: 3,
      page_number: 3,
      slide_type: "join",
      slide_title: "SCAN QR TO ENTER",
      question_text: "Use your phone camera to scan the code or enter the 6-character room code.",
    },
    {
      id: "startup-slide-4",
      slide_number: 4,
      page_number: 4,
      slide_type: "quiz",
      slide_title: "ROUND 1 • THE STARTUP GRAVEYARD",
      question_text: "According to CB Insights, what is the #1 reason startups fail?",
      options: {
        A: "Co-founder disputes & team blowout",
        B: "Ran out of cash / Failed to raise capital",
        C: "No market need (Building what nobody wants)",
        D: "Got outcompeted by big tech",
      },
      question_metadata: {
        correct_answer: "C",
        points: 200,
        timer_seconds: 30,
      },
    },
    {
      id: "startup-slide-5",
      slide_number: 5,
      page_number: 5,
      slide_type: "quiz",
      slide_title: "ROUND 2 • RUNWAY MATH",
      question_text: "If your Net Burn is ₹1,00,000 per month and bank balance is ₹8,00,000, what is your runway?",
      options: {
        A: "6 Months",
        B: "12 Months",
        C: "15 Months",
        D: "8 Months",
      },
      question_metadata: {
        correct_answer: "D",
        points: 300,
        timer_seconds: 20,
      },
    },
    {
      id: "startup-slide-6",
      slide_number: 6,
      page_number: 6,
      slide_type: "leaderboard",
      slide_title: "MID-GAME STANDINGS",
      question_text: "Check out the top founders leading the arena leaderboard!",
    },
    {
      id: "startup-slide-7",
      slide_number: 7,
      page_number: 7,
      slide_type: "quiz",
      slide_title: "ROUND 3 • THE PIVOT LEGEND",
      question_text: "Which multi-billion dollar platform was originally an app called 'Burbn'?",
      options: {
        A: "Instagram",
        B: "Twitter / X",
        C: "Airbnb",
        D: "Slack",
      },
      question_metadata: {
        correct_answer: "A",
        points: 500,
        timer_seconds: 35,
      },
    },
    {
      id: "startup-slide-8",
      slide_number: 8,
      page_number: 8,
      slide_type: "results",
      slide_title: "THE CHAMPION PODIUM",
      question_text: "Congratulations to our top startup minds!",
    },
  ];
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createRoomInFirebase(
  quizId: string = CANONICAL_STARTUP_QUIZ_ID,
  ownerId: string = "host",
  quizTitle?: string,
  customSlides?: FirebaseSlide[]
): Promise<FirebaseRoom> {
  const slides = customSlides && customSlides.length > 0 ? customSlides : getCanonicalStartupDeck();
  const title = quizTitle || "CAN YOU CRACK THE STARTUP?";

  let code = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await getDoc(doc(db, "rooms", code));
    if (!existing.exists()) break;
    code = generateRoomCode();
    attempts++;
  }

  const firstSlide = slides[0];
  const roomData: FirebaseRoom = {
    id: code,
    room_code: code,
    quiz_id: quizId,
    quiz_title: title,
    status: "waiting",
    current_slide_id: firstSlide ? firstSlide.id : null,
    current_slide_number: firstSlide ? firstSlide.slide_number : 1,
    question_state: "ready",
    question_started_at: null,
    question_ends_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_id: ownerId,
    slides,
  };

  await setDoc(doc(db, "rooms", code), roomData);
  return roomData;
}

export async function getRoomFromFirebase(roomCode: string): Promise<FirebaseRoom | null> {
  if (!roomCode) return null;
  const normalized = roomCode.trim().toUpperCase();
  const snap = await getDoc(doc(db, "rooms", normalized));
  if (!snap.exists()) return null;
  return snap.data() as FirebaseRoom;
}

export function subscribeToRoomInFirebase(
  roomCode: string,
  onUpdate: (room: FirebaseRoom | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const normalized = roomCode.trim().toUpperCase();
  return onSnapshot(
    doc(db, "rooms", normalized),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
      } else {
        onUpdate(snap.data() as FirebaseRoom);
      }
    },
    (err) => {
      console.error("Firebase room subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function updateRoomInFirebase(
  roomCode: string,
  patch: Partial<FirebaseRoom>
): Promise<void> {
  const normalized = roomCode.trim().toUpperCase();
  await updateDoc(doc(db, "rooms", normalized), {
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

export async function joinRoomInFirebase(
  roomCode: string,
  displayName: string,
  existingParticipantId?: string
): Promise<FirebaseParticipant> {
  const normalized = roomCode.trim().toUpperCase();
  const partId = existingParticipantId || `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const participantRef = doc(db, "rooms", normalized, "participants", partId);
  const existing = await getDoc(participantRef);

  if (existing.exists()) {
    const data = existing.data() as FirebaseParticipant;
    return { ...data, display_name: displayName };
  }

  const participant: FirebaseParticipant = {
    id: partId,
    room_code: normalized,
    display_name: displayName.trim(),
    score: 0,
    joined_at: new Date().toISOString(),
  };

  await setDoc(participantRef, participant);
  return participant;
}

export function subscribeToParticipantsInFirebase(
  roomCode: string,
  onUpdate: (participants: FirebaseParticipant[]) => void
): Unsubscribe {
  const normalized = roomCode.trim().toUpperCase();
  const colRef = collection(db, "rooms", normalized, "participants");

  return onSnapshot(
    colRef,
    (snapshot) => {
      const parts: FirebaseParticipant[] = [];
      snapshot.forEach((docSnap) => {
        parts.push(docSnap.data() as FirebaseParticipant);
      });
      parts.sort((a, b) => (b.score || 0) - (a.score || 0));
      onUpdate(parts);
    },
    (err) => {
      console.error("Firebase participants subscription error:", err);
    }
  );
}

export async function submitAnswerInFirebase(
  roomCode: string,
  participantId: string,
  slideId: string,
  selectedAnswer: "A" | "B" | "C" | "D"
): Promise<FirebaseAnswer> {
  const normalized = roomCode.trim().toUpperCase();
  const answerId = `${participantId}_${slideId}`;
  const ansRef = doc(db, "rooms", normalized, "answers", answerId);

  const answer: FirebaseAnswer = {
    id: answerId,
    room_code: normalized,
    participant_id: participantId,
    slide_id: slideId,
    selected_answer: selectedAnswer,
    is_correct: null,
    points_awarded: 0,
    submitted_at: new Date().toISOString(),
  };

  await setDoc(ansRef, answer);
  return answer;
}

export function subscribeToAnswersInFirebase(
  roomCode: string,
  onUpdate: (answers: FirebaseAnswer[]) => void
): Unsubscribe {
  const normalized = roomCode.trim().toUpperCase();
  const colRef = collection(db, "rooms", normalized, "answers");

  return onSnapshot(
    colRef,
    (snapshot) => {
      const answers: FirebaseAnswer[] = [];
      snapshot.forEach((docSnap) => {
        answers.push(docSnap.data() as FirebaseAnswer);
      });
      onUpdate(answers);
    },
    (err) => {
      console.error("Firebase answers subscription error:", err);
    }
  );
}

export async function revealAndScoreAnswersInFirebase(
  roomCode: string,
  currentSlide: FirebaseSlide
): Promise<{ scoredCount: number; correctCount: number }> {
  const normalized = roomCode.trim().toUpperCase();
  const correctOption = currentSlide.question_metadata?.correct_answer;
  const pts = currentSlide.question_metadata?.points ?? 100;

  const answersCol = collection(db, "rooms", normalized, "answers");
  const snap = await getDocs(answersCol);

  const batch = writeBatch(db);
  let scoredCount = 0;
  let correctCount = 0;

  snap.forEach((docSnap) => {
    const ans = docSnap.data() as FirebaseAnswer;
    if (ans.slide_id === currentSlide.id) {
      scoredCount++;
      const isCorrect = Boolean(correctOption && ans.selected_answer === correctOption);
      const pointsAwarded = isCorrect ? pts : 0;
      if (isCorrect) correctCount++;

      batch.update(doc(db, "rooms", normalized, "answers", ans.id), {
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
      });

      if (isCorrect && pointsAwarded > 0) {
        const participantRef = doc(db, "rooms", normalized, "participants", ans.participant_id);
        batch.update(participantRef, {
          score: increment(pointsAwarded),
        });
      }
    }
  });

  batch.update(doc(db, "rooms", normalized), {
    question_state: "answer_revealed",
    updated_at: new Date().toISOString(),
  });

  await batch.commit();
  return { scoredCount, correctCount };
}

export async function saveQuizInFirebase(
  quiz: {
    id?: string;
    title: string;
    description?: string | null;
    owner_id: string;
    slides: FirebaseSlide[];
    file_name?: string | null;
  }
): Promise<string> {
  const quizId = quiz.id || `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const quizData: FirebaseQuiz = {
    id: quizId,
    title: quiz.title,
    description: quiz.description || null,
    status: "ready",
    created_at: new Date().toISOString(),
    owner_id: quiz.owner_id,
    slide_count: quiz.slides.length,
    question_count: quiz.slides.filter((s) => s.slide_type === "quiz").length,
    page_count: quiz.slides.length,
    file_name: quiz.file_name || null,
    slides: quiz.slides,
  };

  await setDoc(doc(db, "quizzes", quizId), quizData);
  return quizId;
}

export async function getQuizFromFirebase(quizId: string): Promise<FirebaseQuiz | null> {
  if (!quizId) return null;
  const snap = await getDoc(doc(db, "quizzes", quizId));
  if (!snap.exists()) return null;
  return snap.data() as FirebaseQuiz;
}

export async function getQuizzesFromFirebase(ownerId?: string): Promise<FirebaseQuiz[]> {
  try {
    const snap = await getDocs(collection(db, "quizzes"));
    const list: FirebaseQuiz[] = [];
    snap.forEach((d) => {
      const q = d.data() as FirebaseQuiz;
      if (!ownerId || q.owner_id === ownerId || !q.owner_id) {
        list.push(q);
      }
    });
    return list;
  } catch (err) {
    console.error("Error fetching quizzes from Firebase:", err);
    return [];
  }
}
