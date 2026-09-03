import test from "node:test";
import assert from "node:assert/strict";

// --- Pure Functions Under Test ---

export type ScoringResult = {
  isCorrect: boolean;
  pointsAwarded: number;
};

export function evaluateAnswer(
  selectedAnswer: string,
  correctAnswer: string,
  points: number
): ScoringResult {
  const isCorrect = selectedAnswer === correctAnswer;
  return {
    isCorrect,
    pointsAwarded: isCorrect ? points : 0,
  };
}

export function canSubmitAnswer(
  roomStatus: string,
  questionState: string,
  alreadySubmitted: boolean,
  currentTimeMs: number,
  questionEndsAtMs: number | null
): { allowed: boolean; reason?: string } {
  if (roomStatus !== "presenting") {
    return { allowed: false, reason: "Room is not active" };
  }
  if (questionState !== "question_open") {
    return { allowed: false, reason: "Answering is closed" };
  }
  if (alreadySubmitted) {
    return { allowed: false, reason: "Answer already locked" };
  }
  if (questionEndsAtMs !== null && currentTimeMs > questionEndsAtMs) {
    return { allowed: false, reason: "Time expired" };
  }
  return { allowed: true };
}

export function sortLeaderboard<T extends { score: number; display_name: string }>(
  participants: T[]
): T[] {
  return [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.display_name.localeCompare(b.display_name);
  });
}

// --- Test Suites as Specified in Section 69 ---

test("Scoring: Correct answer awards full points, wrong answer awards 0", () => {
  const correct = evaluateAnswer("B", "B", 200);
  assert.equal(correct.isCorrect, true);
  assert.equal(correct.pointsAwarded, 200);

  const wrong = evaluateAnswer("A", "B", 200);
  assert.equal(wrong.isCorrect, false);
  assert.equal(wrong.pointsAwarded, 0);

  const wrongOptionD = evaluateAnswer("D", "C", 500);
  assert.equal(wrongOptionD.isCorrect, false);
  assert.equal(wrongOptionD.pointsAwarded, 0);
});

test("Answer locking: Second answer attempt is rejected", () => {
  const now = Date.now();
  const endsAt = now + 30000;

  // First submission allowed
  const firstAttempt = canSubmitAnswer("presenting", "question_open", false, now, endsAt);
  assert.equal(firstAttempt.allowed, true);

  // Second submission blocked
  const secondAttempt = canSubmitAnswer("presenting", "question_open", true, now, endsAt);
  assert.equal(secondAttempt.allowed, false);
  assert.equal(secondAttempt.reason, "Answer already locked");
});

test("Closed question: Answer is rejected when question state is not question_open", () => {
  const now = Date.now();
  const endsAt = now + 30000;

  const attemptReady = canSubmitAnswer("presenting", "ready", false, now, endsAt);
  assert.equal(attemptReady.allowed, false);
  assert.equal(attemptReady.reason, "Answering is closed");

  const attemptClosed = canSubmitAnswer("presenting", "question_closed", false, now, endsAt);
  assert.equal(attemptClosed.allowed, false);
  assert.equal(attemptClosed.reason, "Answering is closed");

  const attemptRevealed = canSubmitAnswer("presenting", "answer_revealed", false, now, endsAt);
  assert.equal(attemptRevealed.allowed, false);
  assert.equal(attemptRevealed.reason, "Answering is closed");
});

test("Timer expiration: After end timestamp, answering is rejected", () => {
  const now = Date.now();
  const expiredEndsAt = now - 1000; // 1 second ago

  const expiredAttempt = canSubmitAnswer("presenting", "question_open", false, now, expiredEndsAt);
  assert.equal(expiredAttempt.allowed, false);
  assert.equal(expiredAttempt.reason, "Time expired");
});

test("Leaderboard: Higher score produces higher rank with deterministic tie-breaking", () => {
  const participants = [
    { display_name: "Sneha", score: 850 },
    { display_name: "Rahul", score: 1250 },
    { display_name: "Aman", score: 900 },
    { display_name: "Priya", score: 1100 },
    { display_name: "Aditya", score: 850 },
  ];

  const sorted = sortLeaderboard(participants);

  assert.equal(sorted[0]?.display_name, "Rahul");
  assert.equal(sorted[0]?.score, 1250);

  assert.equal(sorted[1]?.display_name, "Priya");
  assert.equal(sorted[1]?.score, 1100);

  assert.equal(sorted[2]?.display_name, "Aman");
  assert.equal(sorted[2]?.score, 900);

  // Tie break alphabetical
  assert.equal(sorted[3]?.display_name, "Aditya");
  assert.equal(sorted[4]?.display_name, "Sneha");
});
