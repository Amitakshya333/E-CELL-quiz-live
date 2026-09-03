import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Radio,
  Users,
  Trophy,
  CheckCircle2,
  MonitorPlay,
  BarChart2,
  Flag,
  Menu,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { QuizStageMark } from "@/components/quizstage-shell";
import { SlideRenderer, type SlideData } from "@/components/slides/slide-renderer";
import { supabase } from "@/integrations/supabase/client";
import { getLocalRoomByCode, saveLocalRoom, getCurrentUser, getLocalSlides, getLocalQuizById } from "@/lib/quizstage";

export const Route = createFileRoute("/live/$roomCode")({
  head: () => ({
    meta: [
      { title: "Host Console — QuizStage" },
      { name: "description", content: "Live QuizStage host console with synchronized projector and participant controls." },
      { property: "og:title", content: "Host Console — QuizStage" },
      { property: "og:description", content: "Host and run your live presentation quiz." },
    ],
  }),
  component: LiveRoomPage,
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
  points_awarded: number;
};

function LiveRoomPage() {
  const { roomCode } = Route.useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [title, setTitle] = useState("Live Room");
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scoringBusy, setScoringBusy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);

  // Sync clock every 500ms
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  // Fetch initial room data
  const loadRoom = useCallback(async () => {
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
        // Cloud query error
      }

      if (!targetRoom) {
        const local = getLocalRoomByCode(normalizedCode);
        if (local) targetRoom = local as Room;
      }

      if (!targetRoom) {
        toast.error("Room not found.");
        void navigate({ to: "/dashboard" });
        return;
      }

      setRoom(targetRoom);

      let mappedSlides: SlideData[] = [];
      try {
        const [
          { data: quiz },
          { data: slideRows },
          currentUser,
          { data: participantRows },
          { data: answerRows },
        ] = await Promise.all([
          supabase.from("quizzes").select("title,owner_id").eq("id", targetRoom.quiz_id).maybeSingle(),
          supabase
            .from("slides")
            .select("id,slide_number,page_number,slide_type,question_metadata(correct_answer,points,timer_seconds)")
            .eq("quiz_id", targetRoom.quiz_id)
            .order("slide_number"),
          getCurrentUser(),
          supabase.from("participants").select("id,display_name,score").eq("room_id", targetRoom.id).order("score", { ascending: false }),
          supabase.from("answers").select("id,participant_id,selected_answer,is_correct,points_awarded").eq("room_id", targetRoom.id),
        ]);

        // Check local storage first (contains user-customized question text, options, and slide titles)
        const localQuiz = getLocalQuizById(targetRoom.quiz_id);
        if (localQuiz?.title) setTitle(localQuiz.title);
        else if (quiz?.title) setTitle(quiz.title);

        const localSlides = getLocalSlides(targetRoom.quiz_id);
        if (localSlides && localSlides.length > 0) {
          mappedSlides = localSlides as SlideData[];
        } else if (slideRows && slideRows.length > 0) {
          mappedSlides = (slideRows ?? []).map((s: any) => ({
            id: s.id,
            slide_number: s.slide_number,
            page_number: s.page_number,
            slide_type: s.slide_type,
            question_metadata: s.question_metadata?.[0] || s.question_metadata || null,
          }));
        }

        if (participantRows) setParticipants(participantRows as Participant[]);
        if (answerRows) setAnswers(answerRows as Answer[]);
      } catch {
        // Local fallback
      }

      // Load local participants from localStorage
      try {
        const localParts = JSON.parse(localStorage.getItem(`quizstage-participants-${normalizedCode}`) || "[]");
        if (localParts.length > 0) {
          setParticipants((prev) => {
            const map = new Map<string, Participant>();
            prev.forEach((p) => map.set(p.id, p));
            localParts.forEach((p: Participant) => map.set(p.id, p));
            return Array.from(map.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
          });
        }
      } catch {}

      if (mappedSlides.length === 0) {
        mappedSlides = [
          { id: "30000000-0000-4000-8000-000000000001", slide_number: 1, page_number: 1, slide_type: "normal", slide_title: "CAN YOU CRACK THE STARTUP?" } as SlideData,
          { id: "30000000-0000-4000-8000-000000000002", slide_number: 2, page_number: 2, slide_type: "normal", slide_title: "HOUSE RULES", question_text: "Scan QR → Answer fast → Top scorers win!" } as SlideData,
          { id: "30000000-0000-4000-8000-000000000003", slide_number: 3, page_number: 3, slide_type: "join" },
          { id: "30000000-0000-4000-8000-000000000004", slide_number: 4, page_number: 4, slide_type: "quiz", question_text: "What is the #1 reason startups fail?", options: { A: "Co-founder disputes", B: "Running out of cash", C: "Building something nobody wants", D: "Bad marketing" }, question_metadata: { correct_answer: "C", points: 200, timer_seconds: 30 } } as SlideData,
          { id: "30000000-0000-4000-8000-000000000005", slide_number: 5, page_number: 5, slide_type: "quiz", question_text: "If Net Burn is ₹1L/month and bank balance is ₹8L, what is the runway?", options: { A: "6 Months", B: "12 Months", C: "15 Months", D: "8 Months" }, question_metadata: { correct_answer: "D", points: 300, timer_seconds: 20 } } as SlideData,
          { id: "30000000-0000-4000-8000-000000000006", slide_number: 6, page_number: 6, slide_type: "leaderboard" },
          { id: "30000000-0000-4000-8000-000000000007", slide_number: 7, page_number: 7, slide_type: "quiz", question_text: "Which platform was originally called 'Burbn'?", options: { A: "Instagram", B: "Twitter / X", C: "Airbnb", D: "Slack" }, question_metadata: { correct_answer: "A", points: 500, timer_seconds: 45 } } as SlideData,
          { id: "30000000-0000-4000-8000-000000000008", slide_number: 8, page_number: 8, slide_type: "results" },
        ];
      }
      setSlides(mappedSlides);
      setIsHost(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load room data.");
    } finally {
      setLoading(false);
    }
  }, [roomCode, navigate]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  // Real-time subscriptions for Room, Participants, Answers + BroadcastChannel
  useEffect(() => {
    if (!room?.id) return;
    const normalized = roomCode.toUpperCase();

    const channel = supabase
      .channel(`room-host-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase
            .from("participants")
            .select("id,display_name,score")
            .eq("room_id", room.id)
            .order("score", { ascending: false });
          if (data) setParticipants(data as Participant[]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answers", filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase
            .from("answers")
            .select("id,participant_id,selected_answer,is_correct,points_awarded")
            .eq("room_id", room.id);
          if (data) setAnswers(data as Answer[]);
        }
      )
      .subscribe();

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`quizstage-room-${normalized}`);
      bc.onmessage = (event) => {
        if (event.data?.type === "PARTICIPANT_JOINED") {
          setParticipants((prev) => {
            if (prev.some((p) => p.id === event.data.participant.id)) return prev;
            const updated = [...prev, event.data.participant];
            try {
              localStorage.setItem(`quizstage-participants-${normalized}`, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        } else if (event.data?.type === "ANSWER_SUBMITTED") {
          setAnswers((prev) => {
            if (prev.some((a) => a.id === event.data.answer.id)) return prev;
            return [...prev, event.data.answer];
          });
        }
      };
    } catch {}

    return () => {
      void supabase.removeChannel(channel);
      if (bc) bc.close();
    };
  }, [room?.id, roomCode]);

  const currentIndex = useMemo(() => {
    if (!slides.length) return 0;
    const idx = slides.findIndex((s) => s.id === room?.current_slide_id);
    return idx >= 0 ? idx : 0;
  }, [room?.current_slide_id, slides]);

  const currentSlide = slides[currentIndex];

  const secondsLeft = useMemo(() => {
    if (!room?.question_ends_at) return null;
    const diff = Math.ceil((new Date(room.question_ends_at).getTime() - now) / 1000);
    return Math.max(0, diff);
  }, [room?.question_ends_at, now]);

  // Automatically close answering if timer runs out
  useEffect(() => {
    if (secondsLeft === 0 && room?.question_state === "question_open" && isHost) {
      void closeQuestion();
    }
  }, [secondsLeft, room?.question_state, isHost]);

  async function updateRoom(patch: Partial<Room>) {
    if (!room) return;
    const updated = { ...room, ...patch, updated_at: new Date().toISOString() };
    setRoom(updated as Room);

    saveLocalRoom(updated);

    try {
      const bc = new BroadcastChannel(`quizstage-room-${room.room_code.toUpperCase()}`);
      bc.postMessage({ type: "ROOM_UPDATE", room: updated });
      bc.close();
    } catch {}

    try {
      await supabase
        .from("rooms")
        .update(patch)
        .eq("id", room.id);
    } catch {
      // Local fallback
    }
  }

  async function startShow() {
    const first = slides[0];
    if (!first) return;
    await updateRoom({
      status: "presenting",
      current_slide_id: first.id,
      question_state: first.slide_type === "quiz" ? "ready" : "ready",
    });
  }

  async function goToSlide(targetSlide: SlideData) {
    await updateRoom({
      current_slide_id: targetSlide.id,
      question_state: "ready",
      question_ends_at: null,
      question_started_at: null,
    });
  }

  async function moveSlide(delta: number) {
    const next = slides[currentIndex + delta];
    if (!next) return;
    await goToSlide(next);
  }

  async function openQuestion() {
    if (!currentSlide || currentSlide.slide_type !== "quiz") {
      toast.info("This is not a quiz question slide.");
      return;
    }
    const timerSeconds = currentSlide.question_metadata?.timer_seconds ?? 30;
    const nowIso = new Date().toISOString();
    const endsIso = timerSeconds
      ? new Date(Date.now() + timerSeconds * 1000).toISOString()
      : null;

    await updateRoom({
      question_state: "question_open",
      question_started_at: nowIso,
      question_ends_at: endsIso,
    });
    toast.success("Question opened! Participants can answer now.");
  }

  async function closeQuestion() {
    await updateRoom({
      question_state: "question_closed",
      question_ends_at: null,
    });
    toast.info("Answering closed.");
  }

  async function revealAnswer() {
    if (!room || !currentSlide) return;
    setScoringBusy(true);
    try {
      const correctOption = currentSlide.question_metadata?.correct_answer;
      const pts = currentSlide.question_metadata?.points ?? 100;

      // Use local answers state (populated via BroadcastChannel or Supabase realtime)
      const slideAnswers = answers.filter(
        (a) => a.selected_answer && (a as any).slide_id === currentSlide.id
      );

      // Also try Supabase as best-effort
      let latestAnswers = slideAnswers;
      try {
        const { data } = await supabase
          .from("answers")
          .select("id,participant_id,selected_answer")
          .eq("room_id", room.id)
          .eq("slide_id", currentSlide.id);
        if (data && data.length > 0) latestAnswers = data as any;
      } catch {
        // Use local answers
      }

      if (correctOption) {
        const updatedParticipants = [...participants];
        for (const ans of latestAnswers) {
          const isCorrect = ans.selected_answer === correctOption;
          const awarded = isCorrect ? pts : 0;

          // Best-effort Supabase update
          try {
            await supabase
              .from("answers")
              .update({ is_correct: isCorrect, points_awarded: awarded })
              .eq("id", ans.id);
          } catch {}

          if (isCorrect) {
            const partIdx = updatedParticipants.findIndex((p) => p.id === (ans as any).participant_id);
            if (partIdx >= 0) {
              const newScore = (updatedParticipants[partIdx]!.score || 0) + pts;
              updatedParticipants[partIdx] = { ...updatedParticipants[partIdx]!, score: newScore };

              // Best-effort Supabase update
              try {
                await supabase
                  .from("participants")
                  .update({ score: newScore })
                  .eq("id", (ans as any).participant_id);
              } catch {}
            }
          }
        }
        // Update local state with new scores
        const sortedParts = [...updatedParticipants].sort((a, b) => b.score - a.score);
        setParticipants(sortedParts);
        try {
          localStorage.setItem(`quizstage-participants-${room.room_code.toUpperCase()}`, JSON.stringify(sortedParts));
        } catch {}

        // Broadcast score updates to participant tabs
        try {
          const bc = new BroadcastChannel(`quizstage-room-${room.room_code.toUpperCase()}`);
          for (const p of sortedParts) {
            bc.postMessage({ type: "PARTICIPANT_UPDATE", participant: { ...p, room_id: room.id } });
          }
          bc.close();
        } catch {}
      }

      await updateRoom({
        question_state: "answer_revealed",
      });
      toast.success("Answer revealed and scores updated!");
    } catch (err) {
      console.error(err);
      toast.error("Error scoring answers.");
    } finally {
      setScoringBusy(false);
    }
  }

  async function showLeaderboard() {
    await updateRoom({
      question_state: "leaderboard",
    });
  }

  async function finishQuiz() {
    await updateRoom({
      status: "finished",
      question_state: "leaderboard",
    });
    toast.success("Quiz complete! Projector showing final winner podium.");
  }

  // Answer distribution counts
  const answerBreakdown = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    answers.forEach((ans) => {
      if (ans.selected_answer in counts) {
        counts[ans.selected_answer] += 1;
      }
    });
    return counts;
  }, [answers]);

  // Keyboard shortcuts (Space, O, C, R, L, N, P)
  useEffect(() => {
    if (!isHost) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (room?.status === "waiting") {
          void startShow();
        } else if (currentSlide?.slide_type === "quiz") {
          if (room?.question_state === "ready") void openQuestion();
          else if (room?.question_state === "question_open") void closeQuestion();
          else if (room?.question_state === "question_closed") void revealAnswer();
          else if (room?.question_state === "answer_revealed") void showLeaderboard();
          else if (room?.question_state === "leaderboard") void moveSlide(1);
        } else {
          void moveSlide(1);
        }
      } else if (e.key === "o" || e.key === "O") {
        if (room?.question_state === "ready" && currentSlide?.slide_type === "quiz") {
          void openQuestion();
        }
      } else if (e.key === "c" || e.key === "C") {
        if (room?.question_state === "question_open") {
          void closeQuestion();
        }
      } else if (e.key === "r" || e.key === "R") {
        if (room?.question_state === "question_closed") {
          void revealAnswer();
        }
      } else if (e.key === "l" || e.key === "L") {
        void showLeaderboard();
      } else if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") {
        void moveSlide(1);
      } else if (e.key === "p" || e.key === "P" || e.key === "ArrowLeft") {
        void moveSlide(-1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHost, room?.status, room?.question_state, currentSlide, currentIndex, slides]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-brand" />
      </div>
    );
  }

  if (!room) return null;

  const totalParticipants = participants.length;
  const answerCount = answers.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation Header */}
      <header className="border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-30 w-full">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <QuizStageMark />
            <div className="hidden sm:block h-6 w-px bg-border" />
            <div className="hidden sm:block min-w-0">
              <p className="font-display text-sm font-bold uppercase tracking-wide truncate max-w-xs">{title}</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-brand font-semibold">ROOM: {room.room_code}</span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {totalParticipants} joined
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Toolbar */}
          <div className="hidden md:flex items-center gap-2.5">
            <a
              href={`/projector/${room.room_code}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="font-semibold text-xs border-brand/40 hover:bg-brand/10">
                <MonitorPlay className="mr-1.5 h-3.5 w-3.5 text-brand" />
                Open Projector
                <ExternalLink className="ml-1.5 h-3 w-3 opacity-60" />
              </Button>
            </a>

            <Link to="/rooms/$roomId/results" params={{ roomId: room.id }}>
              <Button variant="outline" size="sm" className="text-xs">
                <BarChart2 className="mr-1.5 h-3.5 w-3.5 text-brand" /> Analytics
              </Button>
            </Link>

            <Badge variant={room.status === "presenting" ? "default" : "secondary"} className="uppercase font-mono text-xs">
              <Radio className="mr-1.5 h-3 w-3 animate-pulse text-brand" />
              {room.status}
            </Badge>

            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Exit
              </Button>
            </Link>
          </div>

          {/* Mobile Actions & Sidebar Drawer */}
          <div className="flex md:hidden items-center gap-2">
            <a
              href={`/projector/${room.room_code}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-[11px] font-bold border-brand/40 text-brand">
                <MonitorPlay className="h-3.5 w-3.5 mr-1" />
                Projector
              </Button>
            </a>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 touch-press" aria-label="Room Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-5 flex flex-col justify-between">
                <div>
                  <SheetHeader className="text-left pb-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="font-display text-base font-black uppercase">
                        Host Console
                      </SheetTitle>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {room.status}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs font-bold text-brand mt-1">
                      ROOM CODE: {room.room_code}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {title}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-brand" />
                      <span>{totalParticipants} participants connected</span>
                    </div>
                  </SheetHeader>

                  <div className="mt-5 space-y-2.5">
                    <a
                      href={`/projector/${room.room_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full block"
                    >
                      <Button className="w-full justify-start text-xs font-bold bg-brand text-brand-foreground">
                        <MonitorPlay className="h-4 w-4 mr-2" />
                        Open Projector Screen
                        <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-70" />
                      </Button>
                    </a>

                    <Link
                      to="/rooms/$roomId/results"
                      params={{ roomId: room.id }}
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full block"
                    >
                      <Button variant="outline" className="w-full justify-start text-xs font-bold">
                        <BarChart2 className="h-4 w-4 mr-2 text-brand" />
                        Live Room Analytics
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      className="w-full justify-start text-xs font-bold"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `Join Quiz: ${title}`,
                            text: `Join room code ${room.room_code} on E-Cell Quiz!`,
                            url: `${window.location.origin}/join?code=${room.room_code}`,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(`${window.location.origin}/join?code=${room.room_code}`);
                          toast.success("Join link copied to clipboard!");
                        }
                      }}
                    >
                      <Smartphone className="h-4 w-4 mr-2 text-brand" />
                      Share Join Link
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start text-xs font-bold text-destructive hover:text-destructive">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Exit to Dashboard
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Host Console Body */}
      <main className="mx-auto grid max-w-[1700px] w-full flex-1 gap-6 px-5 py-6 lg:grid-cols-[1fr_360px] lg:px-8">
        {/* Left: Broadcast Screen Preview & Controls */}
        <section className="flex flex-col gap-5 min-w-0">
          {/* Status Ribbon */}
          <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-brand">Live Control Console</p>
                <Badge variant="outline" className="text-[10px] font-mono uppercase bg-accent">
                  {room.question_state.replace("_", " ")}
                </Badge>
              </div>
              <h1 className="mt-1 font-display text-2xl font-black uppercase sm:text-3xl">
                {currentSlide
                  ? `Slide ${String(currentSlide.slide_number).padStart(2, "0")}: ${currentSlide.slide_type.toUpperCase()}`
                  : "Waiting Room Lobby"}
              </h1>
            </div>

            {/* Timer & Response Counters */}
            <div className="flex items-center gap-4">
              {currentSlide?.slide_type === "quiz" && (
                <div className="flex items-center gap-4 bg-muted/60 px-4 py-2 rounded-lg border border-border">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Answers</p>
                    <p className="font-mono text-xl font-black text-brand">
                      {answerCount} / {totalParticipants}
                    </p>
                  </div>
                  {secondsLeft !== null && room.question_state === "question_open" && (
                    <div className="flex items-center gap-1.5 font-mono text-2xl font-bold text-destructive animate-pulse pl-3 border-l border-border">
                      <Clock3 className="h-5 w-5" />
                      {secondsLeft}s
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Stage Preview Screen (16:9) */}
          <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden shadow-2xl border border-border">
            {currentSlide ? (
              <SlideRenderer
                slide={currentSlide}
                quizTitle={title}
                isThumbnail={false}
                showCorrectAnswer={room.question_state === "answer_revealed" || room.question_state === "leaderboard"}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-ink flex items-center justify-center text-paper">
                <p className="font-mono text-lg text-brand">Waiting Room</p>
              </div>
            )}
          </div>

          {/* Answer Breakdown Widget (Visible when answers received) */}
          {currentSlide?.slide_type === "quiz" && (room.question_state === "question_open" || room.question_state === "question_closed" || room.question_state === "answer_revealed") && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between text-xs mb-3 border-b border-border pb-2">
                <span className="font-mono uppercase font-bold text-muted-foreground">
                  Live Response Breakdown ({answerCount} answers)
                </span>
                {room.question_state === "answer_revealed" && (
                  <span className="text-emerald-500 font-bold font-mono">
                    Correct Answer: {currentSlide.question_metadata?.correct_answer}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const count = answerBreakdown[opt] || 0;
                  const isCorrect = currentSlide.question_metadata?.correct_answer === opt;
                  const isRevealed = room.question_state === "answer_revealed";
                  return (
                    <div
                      key={opt}
                      className={`p-2.5 rounded-lg border text-center font-mono ${
                        isRevealed && isCorrect
                          ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold"
                          : "bg-muted/30 border-border"
                      }`}
                    >
                      <span className="text-base font-black">{opt}</span>
                      <span className="text-xs block text-muted-foreground">{count} responses</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Professional Event Control Switcher Console */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void moveSlide(-1)}
                  disabled={currentIndex === 0 || room.status === "waiting"}
                  title="Previous Slide (P or Left Arrow)"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void moveSlide(1)}
                  disabled={currentIndex >= slides.length - 1 || room.status === "waiting"}
                  title="Next Slide (N or Right Arrow)"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* State Machine Main Control Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {room.status === "waiting" ? (
                  <Button size="lg" className="bg-brand text-brand-foreground font-bold uppercase tracking-wider" onClick={() => void startShow()}>
                    <Play className="h-4 w-4 mr-2" /> Start Quiz (Space)
                  </Button>
                ) : currentSlide?.slide_type === "quiz" ? (
                  <>
                    {room.question_state === "ready" && (
                      <Button
                        size="default"
                        className="bg-brand text-brand-foreground font-bold"
                        onClick={() => void openQuestion()}
                        title="Open Question (O)"
                      >
                        <Clock3 className="h-4 w-4 mr-2" /> Open Answering
                      </Button>
                    )}

                    {room.question_state === "question_open" && (
                      <Button
                        size="default"
                        variant="destructive"
                        className="font-bold"
                        onClick={() => void closeQuestion()}
                        title="Close Answering (C)"
                      >
                        <Pause className="h-4 w-4 mr-2" /> Close Answering
                      </Button>
                    )}

                    {room.question_state === "question_closed" && (
                      <Button
                        size="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        onClick={() => void revealAnswer()}
                        disabled={scoringBusy}
                        title="Reveal Answer & Calculate Scores (R)"
                      >
                        {scoringBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Reveal Answer
                      </Button>
                    )}

                    {(room.question_state === "answer_revealed" || room.question_state === "leaderboard") && (
                      <Button
                        size="default"
                        variant="secondary"
                        className="font-bold"
                        onClick={() => void showLeaderboard()}
                        title="Show Leaderboard (L)"
                      >
                        <Trophy className="h-4 w-4 mr-2 text-brand" /> Show Leaderboard
                      </Button>
                    )}
                  </>
                ) : (
                  <Button size="default" onClick={() => void moveSlide(1)}>
                    Next Slide (Space) <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}

                {/* Final End Quiz Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => void finishQuiz()}
                  title="Finish Quiz and display final winner podium"
                >
                  <Flag className="h-3.5 w-3.5 mr-1 text-yellow-500" /> Finish Quiz
                </Button>
              </div>
            </div>

            {/* Keyboard shortcuts hints (Desktop only) */}
            <div className="hidden md:flex flex-wrap items-center gap-3 pt-3 border-t border-border text-[11px] text-muted-foreground font-mono">
              <span className="font-bold text-foreground">SHORTCUTS:</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Space</kbd> Action</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">O</kbd> Open</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">C</kbd> Close</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">R</kbd> Reveal</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">L</kbd> Leaderboard</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">N</kbd> Next</span>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Run of Show Slide Track */}
        <aside className="border-l-0 border-border lg:border-l lg:pl-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">Run of Show</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {currentIndex + 1} / {slides.length} slides
            </span>
          </div>

          {/* Slide list */}
          <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1">
            {slides.map((slide, index) => {
              const isSelected = index === currentIndex;
              return (
                <button
                  key={slide.id}
                  onClick={() => isHost && void goToSlide(slide)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                    isSelected
                      ? "border-brand bg-brand/10 ring-1 ring-brand text-foreground"
                      : "border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-7 w-7 rounded font-mono text-xs font-bold flex items-center justify-center ${
                      isSelected ? "bg-brand text-brand-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {String(slide.slide_number).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-foreground">
                      Slide {slide.slide_number}
                    </p>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono px-1 py-0 mt-0.5">
                      {slide.slide_type}
                    </Badge>
                  </div>
                  {isSelected && <span className="h-2 w-2 rounded-full bg-brand" />}
                </button>
              );
            })}
          </div>

          {/* Leaderboard snapshot */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-brand" /> Top Scores
              </h3>
              <span className="font-mono text-xs text-muted-foreground">{totalParticipants} players</span>
            </div>

            <div className="space-y-1.5">
              {participants.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No participants yet.</p>
              ) : (
                participants.slice(0, 6).map((p, i) => (
                  <div key={p.id} className="flex justify-between items-center text-xs py-1 border-b border-border/40">
                    <span className="truncate max-w-[160px]">
                      {i + 1}. {p.display_name}
                    </span>
                    <span className="font-mono font-bold text-brand">{p.score}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Mobile Phone Native Sticky Action Bar (Visible < 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-xl border-t border-border z-50 flex items-center justify-between gap-2 pb-safe shadow-2xl">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void moveSlide(-1)}
          disabled={currentIndex === 0 || room.status === "waiting"}
          className="h-11 px-3 touch-press"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {room.status === "waiting" ? (
          <Button
            className="flex-1 h-11 bg-brand text-brand-foreground font-bold touch-press"
            onClick={() => void startShow()}
          >
            <Play className="h-4 w-4 mr-2" /> Start Quiz
          </Button>
        ) : currentSlide?.slide_type === "quiz" ? (
          <>
            {room.question_state === "ready" && (
              <Button
                className="flex-1 h-11 bg-brand text-brand-foreground font-bold touch-press"
                onClick={() => void openQuestion()}
              >
                <Clock3 className="h-4 w-4 mr-2" /> Open ({currentSlide.question_metadata?.timer_seconds ?? 30}s)
              </Button>
            )}
            {room.question_state === "question_open" && (
              <Button
                variant="destructive"
                className="flex-1 h-11 font-bold touch-press"
                onClick={() => void closeQuestion()}
              >
                <Pause className="h-4 w-4 mr-2" /> Close Answering
              </Button>
            )}
            {room.question_state === "question_closed" && (
              <Button
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold touch-press"
                onClick={() => void revealAnswer()}
                disabled={scoringBusy}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Reveal Answer
              </Button>
            )}
            {(room.question_state === "answer_revealed" || room.question_state === "leaderboard") && (
              <Button
                className="flex-1 h-11 bg-brand text-brand-foreground font-bold touch-press"
                onClick={() => void showLeaderboard()}
              >
                <Trophy className="h-4 w-4 mr-2" /> Leaderboard
              </Button>
            )}
          </>
        ) : (
          <Button
            className="flex-1 h-11 bg-brand text-brand-foreground font-bold touch-press"
            onClick={() => void moveSlide(1)}
            disabled={currentIndex >= slides.length - 1}
          >
            Next Slide <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => void moveSlide(1)}
          disabled={currentIndex >= slides.length - 1 || room.status === "waiting"}
          className="h-11 px-3 touch-press"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}