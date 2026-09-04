import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Clock3,
  Loader2,
  Maximize2,
  Minimize2,
  Sparkles,
  Trophy,
  Users,
  CheckCircle2,
  Flame,
  Award
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { QrCodeDisplay } from "@/components/qr-code";
import { SlideRenderer, type SlideData } from "@/components/slides/slide-renderer";
import { getLocalRoomByCode, getLocalSlides, getLocalQuizById } from "@/lib/quizstage";
import {
  getRoomFromFirebase,
  subscribeToRoomInFirebase,
  subscribeToParticipantsInFirebase,
  subscribeToAnswersInFirebase,
  getCanonicalStartupDeck,
  type FirebaseRoom,
  type FirebaseParticipant,
  type FirebaseAnswer,
  type FirebaseSlide,
} from "@/lib/firebase-quiz";

export const Route = createFileRoute("/projector/$roomCode")({
  head: () => ({
    meta: [
      { title: "Projector Display — QuizStage" },
      { name: "description", content: "Fullscreen 16:9 live projector display for interactive quizzes." },
    ],
  }),
  component: ProjectorPage,
});

type Room = {
  id: string;
  room_code: string;
  quiz_id: string;
  status: "waiting" | "presenting" | "paused" | "finished" | "closed";
  current_slide_id: string | null;
  question_state: "ready" | "question_open" | "question_closed" | "answer_revealed" | "leaderboard";
  question_started_at: string | null;
  question_ends_at: string | null;
};

type Participant = {
  id: string;
  display_name: string;
  score: number;
};

type Answer = {
  id: string;
  participant_id: string;
  selected_answer: "A" | "B" | "C" | "D";
  is_correct: boolean | null;
};

function ProjectorPage() {
  const { roomCode } = Route.useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [quizTitle, setQuizTitle] = useState("Live Presentation Quiz");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Synchronized clock
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  // Fullscreen toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }

  // Fetch initial room state
  useEffect(() => {
    void (async () => {
      try {
        const normalized = roomCode.toUpperCase();
        let targetRoom: Room | null = null;
        let mappedSlides: SlideData[] = [];

        // 1. Authoritative check in Firebase Firestore
        try {
          const cloudRoom = await getRoomFromFirebase(normalized);
          if (cloudRoom) {
            targetRoom = cloudRoom as any;
            if (cloudRoom.slides && cloudRoom.slides.length > 0) {
              mappedSlides = cloudRoom.slides as SlideData[];
            }
            if (cloudRoom.quiz_title) {
              setQuizTitle(cloudRoom.quiz_title);
            }
          }
        } catch (err) {
          console.warn("Firebase room lookup error:", err);
        }

        // 2. Fall back to local room if offline
        if (!targetRoom) {
          const local = getLocalRoomByCode(normalized);
          if (local) targetRoom = local as Room;
        }

        if (!targetRoom) {
          toast.error("Room not found.");
          void navigate({ to: "/" });
          return;
        }

        setRoom(targetRoom);

        if (mappedSlides.length === 0) {
          const localSlides = getLocalSlides(targetRoom.quiz_id);
          if (localSlides && localSlides.length > 0) {
            mappedSlides = localSlides as SlideData[];
          }
        }

        if (mappedSlides.length === 0) {
          mappedSlides = getCanonicalStartupDeck() as SlideData[];
        }
        setSlides(mappedSlides);
      } catch (err) {
        console.error(err);
        toast.error("Error loading projector display.");
      } finally {
        setLoading(false);
      }
    })();
  }, [roomCode, navigate]);

  // Real-time updates subscription via Firebase Firestore + BroadcastChannel
  useEffect(() => {
    const normalized = roomCode.toUpperCase();

    // 1. Firebase Firestore Room Listener
    const unsubRoom = subscribeToRoomInFirebase(normalized, (cloudRoom) => {
      if (cloudRoom) {
        setRoom(cloudRoom as any);
        if (cloudRoom.slides && cloudRoom.slides.length > 0) {
          setSlides(cloudRoom.slides as SlideData[]);
        }
      }
    });

    // 2. Firebase Firestore Participants Listener (Live leaderboard & podium)
    const unsubParts = subscribeToParticipantsInFirebase(normalized, (parts) => {
      setParticipants(parts as any);
    });

    // 3. Firebase Firestore Answers Listener
    const unsubAnswers = subscribeToAnswersInFirebase(normalized, (ansList) => {
      setAnswers(ansList as any);
    });

    // 4. BroadcastChannel for instant local cross-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`quizstage-room-${normalized}`);
      bc.onmessage = (event) => {
        if (event.data?.type === "ROOM_UPDATE") {
          setRoom(event.data.room);
        } else if (event.data?.type === "PARTICIPANT_JOINED") {
          setParticipants((prev) => {
            if (prev.some((p) => p.id === event.data.participant.id)) return prev;
            return [...prev, event.data.participant];
          });
        } else if (event.data?.type === "PARTICIPANT_UPDATE") {
          setParticipants((prev) => {
            const updated = prev.map((p) => p.id === event.data.participant.id ? event.data.participant : p);
            return updated.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
          });
        }
      };
    } catch {}

    return () => {
      unsubRoom();
      unsubParts();
      unsubAnswers();
      if (bc) bc.close();
    };
  }, [roomCode]);

  const currentSlide = useMemo(() => {
    return slides.find((s) => s.id === room?.current_slide_id) || slides[0];
  }, [slides, room?.current_slide_id]);

  const secondsLeft = useMemo(() => {
    if (!room?.question_ends_at) return null;
    const diff = Math.ceil((new Date(room.question_ends_at).getTime() - now) / 1000);
    return Math.max(0, diff);
  }, [room?.question_ends_at, now]);

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${roomCode}` : `/join/${roomCode}`;

  // Count answers breakdown
  const answerBreakdown = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    answers.forEach((ans) => {
      if (ans.selected_answer in counts) {
        counts[ans.selected_answer] += 1;
      }
    });
    return counts;
  }, [answers]);

  const totalAnswerCount = answers.length;
  const totalParticipants = participants.length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="relative min-h-screen w-screen bg-black text-white overflow-hidden flex flex-col justify-center items-center select-none font-sans">
      {/* Subtle fullscreen toggle button (top right) */}
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label="Toggle Fullscreen"
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md"
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      {/* VIEW 1: LOBBY / JOIN EXPERIENCE */}
      {room.status === "waiting" && (
        <div className="w-full max-w-6xl mx-auto px-8 py-12 flex flex-col items-center justify-between min-h-[85vh] text-center animate-in fade-in duration-700">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 font-mono text-xs uppercase tracking-widest font-bold">
              <Sparkles className="h-3.5 w-3.5" /> LIVE COMPETITION LOBBY
            </div>
            <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight text-white leading-none">
              JOIN THE QUIZ
            </h1>
            <p className="text-white/60 text-lg sm:text-xl font-medium max-w-xl mx-auto">
              Scan the QR code with your smartphone camera to join!
            </p>
          </div>

          {/* Central QR Code & Room Code Card */}
          <div className="my-8 flex flex-col sm:flex-row items-center gap-8 bg-white/5 border border-white/15 p-8 sm:p-12 rounded-3xl backdrop-blur-xl shadow-2xl">
            <div className="p-3 bg-white rounded-2xl shadow-xl">
              <QrCodeDisplay value={joinUrl} size={280} darkColor="#0d0e12" lightColor="#ffffff" />
            </div>

            <div className="text-left space-y-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-white/50 block">ROOM CODE</span>
                <span className="font-display text-6xl sm:text-7xl font-black tracking-widest text-orange-400 block mt-1">
                  {room.room_code}
                </span>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-1">
                <span className="font-mono text-xs uppercase tracking-widest text-white/50 block">WEB ADDRESS</span>
                <span className="font-mono text-xl sm:text-2xl text-white font-bold tracking-wider block">
                  {typeof window !== "undefined" ? window.location.host : "quizstage.com"}/join
                </span>
              </div>

              <div className="flex items-center gap-2.5 pt-2 text-sm text-emerald-400 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Open for players</span>
              </div>
            </div>
          </div>

          {/* Live Participant Count */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 border border-white/20">
              <Users className="h-6 w-6 text-orange-400" />
              <span className="font-display text-2xl sm:text-3xl font-black text-white">
                {totalParticipants} {totalParticipants === 1 ? "PARTICIPANT" : "PARTICIPANTS"} JOINED
              </span>
            </div>

            {/* Scrolling list of names */}
            {participants.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
                {participants.slice(0, 16).map((p) => (
                  <span
                    key={p.id}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80 animate-in zoom-in-95"
                  >
                    {p.display_name}
                  </span>
                ))}
                {participants.length > 16 && (
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-orange-400">
                    +{participants.length - 16} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: PRESENTATION / QUIZ MODE */}
      {room.status === "presenting" && currentSlide && (
        <div className="relative w-full max-w-[1700px] h-[95vh] aspect-[16/9] flex items-center justify-center p-4 sm:p-8">
          {/* Main Slide Content Rendered With Full Visual Fidelity */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <SlideRenderer
              slide={currentSlide}
              quizTitle={quizTitle}
              isThumbnail={false}
              showCorrectAnswer={room.question_state === "answer_revealed" || room.question_state === "leaderboard"}
              className="w-full h-full"
            />

            {/* Floating Minimal Overlays for Projector (Section 18) */}
            {currentSlide.slide_type === "quiz" && (
              <div className="absolute top-6 right-8 z-30 flex items-center gap-4">
                {/* Timer ring / countdown */}
                {secondsLeft !== null && room.question_state === "question_open" && (
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600/90 text-white font-mono text-2xl font-black shadow-2xl border border-red-400/50 backdrop-blur-md animate-pulse">
                    <Clock3 className="h-6 w-6" />
                    <span>{secondsLeft}s</span>
                  </div>
                )}

                {/* Live Answer Submissions Pill */}
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/70 border border-white/20 text-white font-mono text-sm font-bold backdrop-blur-md shadow-xl">
                  <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  <span>{totalAnswerCount} / {totalParticipants} Answered</span>
                </div>
              </div>
            )}

            {/* OVERLAY: Question Results Breakdown (Section 26) */}
            {currentSlide.slide_type === "quiz" && room.question_state === "answer_revealed" && (
              <div className="absolute inset-x-8 bottom-12 z-40 bg-black/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-6 duration-500">
                <div className="flex items-center justify-between mb-4 border-b border-white/15 pb-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <span className="font-display text-xl font-bold uppercase text-white">
                      CORRECT ANSWER:{" "}
                      <span className="text-emerald-400 font-mono text-2xl">
                        {currentSlide.question_metadata?.correct_answer}
                      </span>
                    </span>
                  </div>
                  <span className="font-mono text-xs text-white/50 uppercase">
                    {totalAnswerCount} Total Answers Submitted
                  </span>
                </div>

                {/* Horizontal distribution bars */}
                <div className="grid grid-cols-4 gap-4">
                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const count = answerBreakdown[opt] || 0;
                    const pct = totalAnswerCount > 0 ? Math.round((count / totalAnswerCount) * 100) : 0;
                    const isCorrect = currentSlide.question_metadata?.correct_answer === opt;

                    return (
                      <div
                        key={opt}
                        className={`p-4 rounded-xl border transition-all ${
                          isCorrect
                            ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500"
                            : "bg-white/5 border-white/10 text-white/80"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-mono text-2xl font-black">{opt}</span>
                          <span className="font-mono text-sm font-bold">{count} votes</span>
                        </div>
                        <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-700 ${
                              isCorrect ? "bg-emerald-400" : "bg-orange-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-white/50 mt-1.5 block text-right">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OVERLAY: Live Leaderboard Screen (Section 25) */}
            {room.question_state === "leaderboard" && (
              <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-10 animate-in fade-in duration-500">
                <div className="text-center space-y-2">
                  <Trophy className="h-14 w-14 text-yellow-400 mx-auto animate-bounce" />
                  <div className="font-mono text-xs uppercase tracking-widest text-orange-400 font-bold">
                    LIVE STANDINGS
                  </div>
                  <h2 className="font-display text-4xl sm:text-6xl font-black uppercase text-white tracking-tight">
                    LEADERBOARD
                  </h2>
                </div>

                {/* Scoreboard List */}
                <div className="max-w-3xl mx-auto w-full space-y-2.5 my-auto">
                  {participants.slice(0, 7).map((p, idx) => {
                    const isTop3 = idx < 3;
                    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between px-6 py-3.5 rounded-xl border transition-all ${
                          idx === 0
                            ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/60 ring-2 ring-yellow-500/40"
                            : isTop3
                            ? "bg-white/10 border-white/20"
                            : "bg-white/5 border-white/10 text-white/80"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-xl sm:text-2xl font-black text-orange-400 w-8">
                            {medal}
                          </span>
                          <span className="font-display text-xl sm:text-2xl font-bold uppercase text-white truncate max-w-md">
                            {p.display_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-2xl sm:text-3xl font-black text-orange-400">
                            {p.score}
                          </span>
                          <span className="font-mono text-xs text-white/50 uppercase">PTS</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center font-mono text-xs text-white/40 uppercase tracking-widest">
                  QUIZSTAGE LIVE COMPETITION ARENA
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: FINAL RESULTS & WINNERS PODIUM (Section 28) */}
      {room.status === "finished" && (
        <div className="w-full max-w-5xl mx-auto px-6 py-12 flex flex-col items-center justify-between min-h-[90vh] text-center animate-in zoom-in-95 duration-700">
          <div className="space-y-3">
            <Trophy className="h-16 w-16 text-yellow-400 mx-auto" />
            <div className="font-mono text-xs uppercase tracking-widest text-orange-400 font-bold">
              CHAMPIONSHIP FINALE
            </div>
            <h1 className="font-display text-5xl sm:text-7xl font-black uppercase text-white tracking-tight">
              FINAL RESULTS
            </h1>
            <p className="text-white/60 text-lg">
              Congratulations to our winners and all participants!
            </p>
          </div>

          {/* 3-Tier Podium (1st, 2nd, 3rd) */}
          <div className="my-10 flex items-end justify-center gap-4 sm:gap-8 w-full max-w-3xl">
            {/* 2nd Place */}
            {participants[1] && (
              <div className="flex-1 flex flex-col items-center">
                <span className="text-3xl sm:text-4xl mb-2">🥈</span>
                <span className="font-display text-lg sm:text-xl font-bold uppercase text-white truncate max-w-[180px]">
                  {participants[1].display_name}
                </span>
                <span className="font-mono text-base sm:text-lg font-black text-orange-400 mb-3">
                  {participants[1].score} pts
                </span>
                <div className="w-full h-44 sm:h-56 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-2xl border-t-2 border-slate-300 flex items-center justify-center font-display text-4xl sm:text-6xl font-black text-white/40">
                  2
                </div>
              </div>
            )}

            {/* 1st Place (Champion) */}
            {participants[0] && (
              <div className="flex-1 flex flex-col items-center -mt-6">
                <span className="text-5xl sm:text-6xl mb-2 animate-bounce">👑</span>
                <span className="font-display text-2xl sm:text-3xl font-black uppercase text-yellow-400 truncate max-w-[220px]">
                  {participants[0].display_name}
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-white mb-3">
                  {participants[0].score} pts
                </span>
                <div className="w-full h-56 sm:h-72 bg-gradient-to-t from-amber-600 via-yellow-500 to-amber-400 rounded-t-2xl border-t-4 border-yellow-200 flex items-center justify-center font-display text-5xl sm:text-7xl font-black text-black/30 shadow-2xl">
                  1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {participants[2] && (
              <div className="flex-1 flex flex-col items-center">
                <span className="text-3xl sm:text-4xl mb-2">🥉</span>
                <span className="font-display text-lg sm:text-xl font-bold uppercase text-white truncate max-w-[180px]">
                  {participants[2].display_name}
                </span>
                <span className="font-mono text-base sm:text-lg font-black text-orange-400 mb-3">
                  {participants[2].score} pts
                </span>
                <div className="w-full h-32 sm:h-40 bg-gradient-to-t from-amber-800 to-amber-700 rounded-t-2xl border-t-2 border-amber-500 flex items-center justify-center font-display text-4xl sm:text-6xl font-black text-white/40">
                  3
                </div>
              </div>
            )}
          </div>

          <div className="font-mono text-xs text-white/40 uppercase tracking-widest">
            QUIZSTAGE • PRESENTATION-POWERED LIVE INTERACTION
          </div>
        </div>
      )}
    </div>
  );
}
