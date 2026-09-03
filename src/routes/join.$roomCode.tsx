import { FormEvent, useEffect, useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Lock,
  Smartphone,
  Trophy,
  XCircle,
  Zap,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuizStageMark } from "@/components/quizstage-shell";
import { supabase } from "@/integrations/supabase/client";
import { getLocalRoomByCode, getLocalSlides, getLocalQuizById } from "@/lib/quizstage";

export const Route = createFileRoute("/join/$roomCode")({
  head: () => ({
    meta: [
      { title: "Play Live Quiz — QuizStage" },
      { name: "description", content: "Mobile player interface for live interactive QuizStage quizzes." },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" },
    ],
  }),
  component: ParticipantLivePage,
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
  is_local?: boolean;
};

type Slide = {
  id: string;
  slide_number: number;
  slide_type: "normal" | "quiz" | "join" | "leaderboard" | "results";
  question_metadata?: {
    points: number;
    timer_seconds: number | null;
  } | null;
};

type Participant = {
  id: string;
  display_name: string;
  score: number;
  room_id: string;
};

export function ParticipantLivePage() {
  const { roomCode } = Route.useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [quizTitle, setQuizTitle] = useState("QuizStage Live");
  const [loading, setLoading] = useState(true);

  // Participant session
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);

  // Answering state
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [submittedOption, setSubmittedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastScoredSlideId, setLastScoredSlideId] = useState<string | null>(null);
  const [myAnswerResult, setMyAnswerResult] = useState<{ is_correct: boolean | null; points_awarded: number } | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  // Clock
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  // 1. Load Room & Check Existing Participant in Storage
  useEffect(() => {
    void (async () => {
      try {
        const normalizedCode = roomCode.toUpperCase();
        let targetRoom: Room | null = null;

        try {
          const { data: roomData } = await supabase
            .from("rooms")
            .select("id,room_code,quiz_id,status,current_slide_id,question_state,question_started_at,question_ends_at")
            .eq("room_code", normalizedCode)
            .maybeSingle();

          if (roomData) targetRoom = roomData as Room;
        } catch {
          // Cloud error
        }

        if (!targetRoom) {
          const local = getLocalRoomByCode(normalizedCode);
          if (local) targetRoom = local as Room;
        }

        if (!targetRoom) {
          toast.error("Room not found.");
          void navigate({ to: "/join" });
          return;
        }

        setRoom(targetRoom);

        // Load slides
        let slideList: Slide[] = [];
        try {
          const [{ data: quiz }, { data: slideRows }] = await Promise.all([
            supabase.from("quizzes").select("title").eq("id", targetRoom.quiz_id).maybeSingle(),
            supabase
              .from("slides")
              .select("id,slide_number,slide_type,question_metadata(points,timer_seconds)")
              .eq("quiz_id", targetRoom.quiz_id)
              .order("slide_number"),
          ]);

          if (quiz?.title) setQuizTitle(quiz.title);
          if (slideRows && slideRows.length > 0) slideList = slideRows as Slide[];
        } catch {
          // Ignore
        }

        if (slideList.length === 0) {
          // Try loading from localStorage (user-created quizzes)
          const localQuiz = getLocalQuizById(targetRoom.quiz_id);
          if (localQuiz) setQuizTitle(localQuiz.title);
          const localSlides = getLocalSlides(targetRoom.quiz_id);
          if (localSlides && localSlides.length > 0) {
            slideList = localSlides as Slide[];
          }
        }

        if (slideList.length === 0) {
          // Fallback slides
          slideList = [
            { id: "30000000-0000-4000-8000-000000000001", slide_number: 1, slide_type: "normal" },
            { id: "30000000-0000-4000-8000-000000000002", slide_number: 2, slide_type: "normal" },
            { id: "30000000-0000-4000-8000-000000000003", slide_number: 3, slide_type: "join" },
            { id: "30000000-0000-4000-8000-000000000004", slide_number: 4, slide_type: "quiz", question_metadata: { points: 200, timer_seconds: 30 } },
            { id: "30000000-0000-4000-8000-000000000005", slide_number: 5, slide_type: "quiz", question_metadata: { points: 300, timer_seconds: 20 } },
            { id: "30000000-0000-4000-8000-000000000006", slide_number: 6, slide_type: "leaderboard" },
            { id: "30000000-0000-4000-8000-000000000007", slide_number: 7, slide_type: "quiz", question_metadata: { points: 500, timer_seconds: 45 } },
            { id: "30000000-0000-4000-8000-000000000008", slide_number: 8, slide_type: "results" },
          ];
        }
        setSlides(slideList);

        // Check stored participant session
        const storedParticipantId = sessionStorage.getItem(`quizstage-participant-${normalizedCode}`);
        if (storedParticipantId) {
          try {
            const { data: partData } = await supabase
              .from("participants")
              .select("id,display_name,score,room_id")
              .eq("id", storedParticipantId)
              .maybeSingle();

            if (partData) {
              setParticipant(partData as Participant);
            }
          } catch {
            // Ignore
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Error connecting to room.");
      } finally {
        setLoading(false);
      }
    })();
  }, [roomCode, navigate]);

  // 2. Real-time Subscription to Room & BroadcastChannel
  useEffect(() => {
    if (!room?.id) return;
    const normalizedCode = roomCode.toUpperCase();

    // Supabase Channel
    const channel = supabase
      .channel(`participant-room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "participants", filter: `id=eq.${participant?.id}` },
        (payload) => {
          setParticipant(payload.new as Participant);
        }
      )
      .subscribe();

    // BroadcastChannel for instant local cross-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`quizstage-room-${normalizedCode}`);
      bc.onmessage = (event) => {
        if (event.data?.type === "ROOM_UPDATE") {
          setRoom(event.data.room);
        } else if (event.data?.type === "PARTICIPANT_UPDATE" && event.data.participant?.id === participant?.id) {
          setParticipant(event.data.participant);
        }
      };
    } catch {
      // BroadcastChannel unavailable
    }

    return () => {
      void supabase.removeChannel(channel);
      if (bc) bc.close();
    };
  }, [room?.id, participant?.id, roomCode]);

  // Reset selected option when slide changes
  useEffect(() => {
    setSelectedOption(null);
    setSubmittedOption(null);
    setMyAnswerResult(null);
  }, [room?.current_slide_id]);

  // Calculate remaining seconds
  const secondsLeft = useMemo(() => {
    if (!room?.question_ends_at) return null;
    const diff = Math.ceil((new Date(room.question_ends_at).getTime() - now) / 1000);
    return Math.max(0, diff);
  }, [room?.question_ends_at, now]);

  const currentSlide = useMemo(() => {
    if (!slides.length) return null;
    return slides.find((s) => s.id === room?.current_slide_id) ?? slides[0];
  }, [slides, room?.current_slide_id]);

  // Check personal answer score when answer is revealed
  useEffect(() => {
    if (room?.question_state === "answer_revealed" && participant && currentSlide) {
      void (async () => {
        try {
          const [{ data: ans }, { data: allParts }] = await Promise.all([
            supabase
              .from("answers")
              .select("is_correct,points_awarded")
              .eq("room_id", room.id)
              .eq("participant_id", participant.id)
              .eq("slide_id", currentSlide.id)
              .maybeSingle(),
            supabase
              .from("participants")
              .select("id,score")
              .eq("room_id", room.id)
              .order("score", { ascending: false }),
          ]);

          if (ans) {
            setMyAnswerResult({
              is_correct: ans.is_correct,
              points_awarded: ans.points_awarded ?? 0,
            });
            if (ans.is_correct && typeof navigator !== "undefined" && "vibrate" in navigator) {
              try { navigator.vibrate([80, 50, 80]); } catch {}
            }
          }

          if (allParts) {
            const idx = allParts.findIndex((p) => p.id === participant.id);
            if (idx >= 0) setMyRank(idx + 1);
          }
        } catch {
          // Ignore
        }
      })();
    }
  }, [room?.question_state, room?.id, participant, currentSlide]);

  // Handle Joining
  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!room) return;
    const cleanName = nameInput.trim();
    if (!cleanName) {
      toast.error("Please enter a valid display name.");
      return;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(30); } catch {}
    }

    setJoining(true);
    try {
      let newPart: Participant | null = null;
      try {
        const { data, error: insertError } = await supabase
          .from("participants")
          .insert({
            room_id: room.id,
            display_name: cleanName,
            score: 0,
          })
          .select("id,display_name,score,room_id")
          .single();

        if (!insertError && data) newPart = data as Participant;
      } catch {
        // Fallback
      }

      if (!newPart) {
        newPart = {
          id: crypto.randomUUID(),
          display_name: cleanName,
          score: 0,
          room_id: room.id,
        };
      }

      sessionStorage.setItem(`quizstage-participant-${room.room_code}`, newPart.id);
      setParticipant(newPart);

      // Broadcast join event
      try {
        const bc = new BroadcastChannel(`quizstage-room-${room.room_code.toUpperCase()}`);
        bc.postMessage({ type: "PARTICIPANT_JOINED", participant: newPart });
        bc.close();
      } catch {}

      toast.success(`Welcome aboard, ${cleanName}!`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not join room.");
    } finally {
      setJoining(false);
    }
  }

  // Handle Submitting Answer
  async function submitAnswer(option: "A" | "B" | "C" | "D") {
    if (!room || !participant || !currentSlide) return;
    if (room.question_state !== "question_open") {
      toast.error("Answering is closed!");
      return;
    }
    if (submittedOption) return; // Locked

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(40); } catch {}
    }

    setSubmitting(true);
    setSelectedOption(option);

    try {
      try {
        await supabase.from("answers").insert({
          room_id: room.id,
          participant_id: participant.id,
          slide_id: currentSlide.id,
          selected_answer: option,
        });
      } catch {
        // Local fallback
      }

      // Broadcast answer to host & projector
      try {
        const bc = new BroadcastChannel(`quizstage-room-${room.room_code.toUpperCase()}`);
        bc.postMessage({
          type: "ANSWER_SUBMITTED",
          answer: {
            id: crypto.randomUUID(),
            room_id: room.id,
            participant_id: participant.id,
            selected_answer: option,
            slide_id: currentSlide.id,
          },
        });
        bc.close();
      } catch {}

      setSubmittedOption(option);
      toast.success(`Selected option ${option}! Locked in.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit answer. Try again.");
      setSelectedOption(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink text-paper">
        <Loader2 className="h-10 w-10 animate-spin text-brand" />
      </div>
    );
  }

  if (!room) return null;

  // View 1: Participant Not Joined Yet -> Enter Name Screen
  if (!participant) {
    return (
      <main className="min-h-dvh bg-ink text-paper flex flex-col justify-between p-5 sm:p-8 pt-safe pb-safe">
        <div className="max-w-md mx-auto w-full pt-4">
          <QuizStageMark />

          <div className="mt-8 space-y-2">
            <Badge className="bg-brand text-brand-foreground font-mono text-xs uppercase tracking-widest font-bold">
              Room Code: {room.room_code}
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl font-black uppercase leading-tight">
              Enter the <span className="text-brand">Arena.</span>
            </h1>
            <p className="text-paper/60 text-sm font-medium">{quizTitle}</p>
          </div>

          <form onSubmit={handleJoin} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-paper/70 mb-2">
                Your Player / Founder Name
              </label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value.slice(0, 35))}
                placeholder="e.g. Sam Altman"
                required
                maxLength={35}
                className="h-14 border-paper/20 bg-paper/10 text-paper text-lg placeholder:text-paper/30 font-semibold focus:border-brand"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={joining || !nameInput.trim()}
              className="w-full h-14 bg-brand text-brand-foreground font-bold text-base uppercase tracking-wider touch-press shadow-lg"
            >
              {joining ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
              {joining ? "Entering..." : "Join Quiz"}
            </Button>
          </form>
        </div>

        <div className="text-center text-[11px] font-mono text-paper/40 py-4">
          No app download required • Instant live tactile answers
        </div>
      </main>
    );
  }

  // View 2: Participant Joined -> Live Phone Controller
  const isQuestion = currentSlide?.slide_type === "quiz";
  const isOpen = room.question_state === "question_open";
  const isRevealed = room.question_state === "answer_revealed";
  const isLeaderboard = room.question_state === "leaderboard";

  return (
    <div className="min-h-dvh h-dvh bg-ink text-paper flex flex-col justify-between p-4 sm:p-6 select-none pt-safe pb-safe overflow-hidden">
      {/* Top Mobile Bar */}
      <header className="flex items-center justify-between border-b border-paper/10 pb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-brand uppercase">{participant.display_name}</span>
            {myRank !== null && (
              <Badge variant="outline" className="text-[10px] border-brand/50 text-brand">
                Rank #{myRank}
              </Badge>
            )}
          </div>
          <p className="font-mono text-[10px] text-paper/50 uppercase">Room / {room.room_code}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-paper/50 block">Score</span>
            <span className="font-mono text-base font-black text-brand">{participant.score} pts</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="my-auto py-3 flex flex-col items-center justify-center w-full max-w-lg mx-auto flex-1">
        {/* State A: Room is in waiting lobby */}
        {room.status === "waiting" && (
          <div className="text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-brand/20 border-2 border-brand flex items-center justify-center mx-auto text-brand animate-pulse">
              <Smartphone className="h-10 w-10" />
            </div>
            <h2 className="font-display text-3xl font-black uppercase text-paper">You're in!</h2>
            <p className="text-paper/60 text-sm max-w-xs mx-auto">
              Look at the big screen. The quiz will begin when the host starts the presentation!
            </p>
          </div>
        )}

        {/* State B: Normal Presentation Slide */}
        {room.status === "presenting" && !isQuestion && (
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-paper/60 border-paper/20 uppercase font-mono text-xs">
              Slide {currentSlide?.slide_number}
            </Badge>
            <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-paper">
              Eyes on the Projector
            </h2>
            <p className="text-paper/60 text-sm max-w-xs mx-auto">
              Follow along with the deck. Tactile answer buttons will appear when the next question is launched!
            </p>
          </div>
        )}

        {/* State C: Question is Ready (Not Open Yet) */}
        {room.status === "presenting" && isQuestion && room.question_state === "ready" && (
          <div className="text-center space-y-3">
            <Badge className="bg-brand text-brand-foreground font-mono text-xs uppercase font-bold">
              Get Ready!
            </Badge>
            <h2 className="font-display text-3xl font-black uppercase text-paper">
              Question {currentSlide?.slide_number}
            </h2>
            <p className="text-paper/60 text-sm max-w-xs mx-auto">
              Read the question on the projector. Answering will open shortly!
            </p>
          </div>
        )}

        {/* State D: Question OPEN -> Show Large Tactile A/B/C/D Buttons */}
        {room.status === "presenting" && isQuestion && isOpen && (
          <div className="w-full h-full flex flex-col justify-between py-2">
            {/* Countdown timer */}
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="font-mono text-xs font-bold uppercase text-paper/60">
                Question {currentSlide?.slide_number}
              </span>
              {secondsLeft !== null && (
                <div className="flex items-center gap-1 font-mono text-xl font-bold text-orange-400 animate-pulse">
                  <Clock3 className="h-4 w-4" />
                  {secondsLeft}s
                </div>
              )}
            </div>

            {submittedOption ? (
              /* Locked in state */
              <div className="my-auto bg-paper/10 border border-brand/50 rounded-2xl p-6 text-center space-y-3 animate-in fade-in">
                <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="font-display text-3xl font-black uppercase text-paper">
                  Answer {submittedOption} Locked!
                </h3>
                <p className="text-paper/60 text-sm">
                  Your choice is registered. Waiting for the host to reveal the results...
                </p>
              </div>
            ) : (
              /* Tactile Kahoot-style buttons with shapes */
              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full flex-1 max-h-[68vh]">
                {[
                  { key: "A", shape: "▲", color: "bg-red-600 active:bg-red-800 border-red-500 shadow-red-950/40" },
                  { key: "B", shape: "◆", color: "bg-blue-600 active:bg-blue-800 border-blue-500 shadow-blue-950/40" },
                  { key: "C", shape: "●", color: "bg-amber-600 active:bg-amber-800 border-amber-500 shadow-amber-950/40" },
                  { key: "D", shape: "■", color: "bg-emerald-600 active:bg-emerald-800 border-emerald-500 shadow-emerald-950/40" },
                ].map((btn) => (
                  <button
                    key={btn.key}
                    type="button"
                    disabled={submitting || Boolean(submittedOption)}
                    onClick={() => void submitAnswer(btn.key as any)}
                    className={`touch-press flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border-b-4 sm:border-b-8 shadow-xl text-white select-none transition-all active:scale-[0.94] ${btn.color} ${
                      submitting ? "opacity-75" : ""
                    } h-full min-h-[120px]`}
                  >
                    {submitting && selectedOption === btn.key ? (
                      <Loader2 className="h-10 w-10 animate-spin" />
                    ) : (
                      <>
                        <span className="text-2xl sm:text-3xl opacity-80 mb-1">{btn.shape}</span>
                        <span className="font-display text-5xl sm:text-6xl font-black">{btn.key}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* State E: Question Closed */}
        {room.status === "presenting" && isQuestion && room.question_state === "question_closed" && (
          <div className="text-center space-y-4">
            <Lock className="h-12 w-12 text-amber-400 mx-auto" />
            <h2 className="font-display text-3xl font-black uppercase text-paper">
              Answering Closed
            </h2>
            <p className="text-paper/60 text-sm max-w-xs mx-auto">
              Time is up! Host is about to reveal the correct answer.
            </p>
          </div>
        )}

        {/* State F: Answer Revealed -> Personal Result */}
        {room.status === "presenting" && isQuestion && isRevealed && (
          <div className="text-center space-y-4 animate-in zoom-in-95">
            {myAnswerResult ? (
              myAnswerResult.is_correct ? (
                <div className="space-y-3">
                  <div className="h-20 w-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h2 className="font-display text-4xl font-black uppercase text-emerald-400">Correct!</h2>
                  <p className="font-mono text-2xl font-black text-brand">+{myAnswerResult.points_awarded} PTS</p>
                  <p className="text-paper/60 text-xs">Nice job! Check the big screen for the scoreboard.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-20 w-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto text-red-400">
                    <XCircle className="h-10 w-10" />
                  </div>
                  <h2 className="font-display text-4xl font-black uppercase text-red-400">Missed It!</h2>
                  <p className="font-mono text-base text-paper/60">+0 PTS</p>
                  <p className="text-paper/60 text-xs">Better luck on the next question!</p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <Lock className="h-12 w-12 text-paper/40 mx-auto" />
                <h2 className="font-display text-2xl font-black uppercase text-paper">Answer Revealed</h2>
                <p className="text-paper/60 text-xs">Look at the projector to see the correct answer breakdown!</p>
              </div>
            )}
          </div>
        )}

        {/* State G: Leaderboard Displayed */}
        {room.status === "presenting" && isLeaderboard && (
          <div className="text-center space-y-4">
            <Trophy className="h-14 w-14 text-yellow-400 mx-auto animate-bounce" />
            <h2 className="font-display text-3xl font-black uppercase text-paper">
              Leaderboard Time!
            </h2>
            <div className="bg-paper/10 border border-paper/20 rounded-xl p-4 max-w-xs mx-auto">
              <span className="text-xs uppercase font-bold text-paper/60 block">Your Current Standing</span>
              <p className="font-display text-3xl font-black text-brand mt-1">
                {myRank ? `Rank #${myRank}` : "Competing..."}
              </p>
              <span className="font-mono text-sm text-paper/80 font-bold">{participant.score} points</span>
            </div>
            <p className="text-paper/60 text-xs">Top leaders are highlighted on the projector screen.</p>
          </div>
        )}

        {/* State H: Quiz Finished */}
        {room.status === "finished" && (
          <div className="text-center space-y-5 animate-in zoom-in">
            <Sparkles className="h-16 w-16 text-yellow-400 mx-auto animate-spin" />
            <h2 className="font-display text-4xl font-black uppercase text-paper">
              Game Over!
            </h2>
            <div className="bg-paper/10 border border-brand/40 rounded-xl p-5 max-w-xs mx-auto space-y-2">
              <span className="text-xs uppercase font-bold text-brand">Final Result</span>
              <p className="font-display text-4xl font-black text-paper">
                {myRank ? `#${myRank}` : "—"}
              </p>
              <p className="font-mono text-lg font-black text-brand">{participant.score} total pts</p>
            </div>
            <p className="text-paper/60 text-xs">
              Thank you for playing QuizStage! Look at the podium for the winners.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="text-center py-2 border-t border-paper/10 text-[10px] font-mono text-paper/40 shrink-0">
        QuizStage Mobile Client • Connected
      </footer>
    </div>
  );
}
