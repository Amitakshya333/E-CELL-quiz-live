import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Layers,
  Loader2,
  Play,
  Save,
  Trophy,
  Users,
  BarChart2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/quizstage-shell";
import { SlideRenderer, type SlideData } from "@/components/slides/slide-renderer";
import { createRoom, getCurrentUser, DEMO_QUIZ_ID, getLocalQuizById, getLocalSlides, saveLocalSlides } from "@/lib/quizstage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/quizzes/$quizId/slides")({
  head: () => ({
    meta: [
      { title: "Slide Manager — QuizStage" },
      { name: "description", content: "Configure interactive quiz questions, answers, points, and timers on your presentation slides." },
    ],
  }),
  component: SlideManagerPage,
});

type SlideType = "normal" | "quiz" | "join" | "leaderboard" | "results";
type CorrectAnswer = "A" | "B" | "C" | "D";

function SlideManagerPage() {
  const { quizId } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [quizTitle, setQuizTitle] = useState("Presentation Deck");
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  // Config state for current selected slide
  const [currentType, setCurrentType] = useState<SlideType>("normal");
  const [correctAnswer, setCorrectAnswer] = useState<CorrectAnswer>("B");
  const [points, setPoints] = useState<number>(100);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(30);

  useEffect(() => {
    void (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          void navigate({ to: "/auth" });
          return;
        }

        let title = "Quiz Presentation";
        let mapped: SlideData[] = [];

        try {
          const { data: quiz } = await supabase
            .from("quizzes")
            .select("id,title,owner_id")
            .eq("id", quizId)
            .maybeSingle();

          if (quiz?.title) title = quiz.title;

          const { data: slideRows } = await supabase
            .from("slides")
            .select("id,slide_number,page_number,slide_type,question_metadata(correct_answer,points,timer_seconds)")
            .eq("quiz_id", quizId)
            .order("slide_number");

          if (slideRows && slideRows.length > 0) {
            mapped = slideRows.map((s: any) => ({
              id: s.id,
              slide_number: s.slide_number,
              page_number: s.page_number,
              slide_type: s.slide_type,
              question_metadata: s.question_metadata?.[0] || s.question_metadata || null,
            }));
          }
        } catch {
          // Cloud error fallback
        }

        if (mapped.length === 0) {
          const localQuiz = getLocalQuizById(quizId);
          if (localQuiz) {
            title = localQuiz.title;
            const localSlides = getLocalSlides(quizId);
            if (localSlides) mapped = localSlides;
          }
        }

        if (mapped.length === 0 && quizId === DEMO_QUIZ_ID) {
          title = "CAN YOU CRACK THE STARTUP?";
          mapped = [
            { id: "30000000-0000-4000-8000-000000000001", slide_number: 1, page_number: 1, slide_type: "normal" },
            { id: "30000000-0000-4000-8000-000000000002", slide_number: 2, page_number: 2, slide_type: "normal" },
            { id: "30000000-0000-4000-8000-000000000003", slide_number: 3, page_number: 3, slide_type: "join" },
            { id: "30000000-0000-4000-8000-000000000004", slide_number: 4, page_number: 4, slide_type: "quiz", question_metadata: { correct_answer: "C", points: 200, timer_seconds: 30 } },
            { id: "30000000-0000-4000-8000-000000000005", slide_number: 5, page_number: 5, slide_type: "quiz", question_metadata: { correct_answer: "B", points: 300, timer_seconds: 20 } },
            { id: "30000000-0000-4000-8000-000000000006", slide_number: 6, page_number: 6, slide_type: "leaderboard" },
            { id: "30000000-0000-4000-8000-000000000007", slide_number: 7, page_number: 7, slide_type: "quiz", question_metadata: { correct_answer: "D", points: 500, timer_seconds: 45 } },
            { id: "30000000-0000-4000-8000-000000000008", slide_number: 8, page_number: 8, slide_type: "results" },
          ];
        }

        if (mapped.length === 0) {
          toast.error("Quiz not found.");
          void navigate({ to: "/dashboard" });
          return;
        }

        setQuizTitle(title);
        setSlides(mapped);

        if (mapped.length > 0 && mapped[0]) {
          const first = mapped[0];
          setCurrentType(first.slide_type);
          if (first.question_metadata) {
            setCorrectAnswer(first.question_metadata.correct_answer as CorrectAnswer);
            setPoints(first.question_metadata.points || 100);
            setTimerSeconds(first.question_metadata.timer_seconds ?? 30);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load slide deck.");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, navigate]);

  const selectedSlide = slides[selectedSlideIndex];

  // When selected slide index changes, sync form
  function selectSlide(index: number) {
    setSelectedSlideIndex(index);
    const slide = slides[index];
    if (slide) {
      setCurrentType(slide.slide_type);
      if (slide.question_metadata) {
        setCorrectAnswer(slide.question_metadata.correct_answer as CorrectAnswer);
        setPoints(slide.question_metadata.points || 100);
        setTimerSeconds(slide.question_metadata.timer_seconds ?? 30);
      } else {
        setCorrectAnswer("A");
        setPoints(100);
        setTimerSeconds(30);
      }
    }
  }

  // Save current slide config to local state & database
  async function saveCurrentSlideConfig() {
    if (!selectedSlide) return;
    setSaving(true);
    try {
      // 1. Update slide type
      const { error: slideUpdateErr } = await supabase
        .from("slides")
        .update({ slide_type: currentType })
        .eq("id", selectedSlide.id);

      if (slideUpdateErr) throw slideUpdateErr;

      // 2. If quiz type, upsert question metadata
      if (currentType === "quiz") {
        const { error: metaErr } = await supabase
          .from("question_metadata")
          .upsert({
            slide_id: selectedSlide.id,
            correct_answer: correctAnswer,
            points: Math.max(1, points),
            timer_seconds: timerSeconds,
            scoring_mode: "fixed_points",
          });

        if (metaErr) throw metaErr;
      } else {
        // If not quiz, remove from question_metadata if exists
        await supabase
          .from("question_metadata")
          .delete()
          .eq("slide_id", selectedSlide.id);
      }

      // Update local slide list
      const updatedSlides = [...slides];
      updatedSlides[selectedSlideIndex] = {
        ...selectedSlide,
        slide_type: currentType,
        question_metadata:
          currentType === "quiz"
            ? {
                correct_answer: correctAnswer,
                points,
                timer_seconds: timerSeconds,
              }
            : null,
      };
      saveLocalSlides(quizId, updatedSlides);
      setSlides(updatedSlides);

      toast.success(`Slide ${selectedSlide.slide_number} configuration saved.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save slide.");
    } finally {
      setSaving(false);
    }
  }

  async function openLiveRoom() {
    setStarting(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const room = await createRoom(quizId, user.id);
      toast.success(`Live room ${room.room_code} created!`);
      void navigate({
        to: "/live/$roomCode",
        params: { roomCode: room.room_code },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open room.");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card/70 sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between px-5 py-3 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
              </Button>
            </Link>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">Slide Manager</p>
              <h1 className="font-display text-lg font-black uppercase truncate max-w-sm sm:max-w-md">
                {quizTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void saveCurrentSlideConfig()}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save Slide
            </Button>

            <Button
              size="sm"
              className="bg-brand text-brand-foreground font-bold"
              onClick={() => void openLiveRoom()}
              disabled={starting}
            >
              {starting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
              Launch Live Room
            </Button>
          </div>
        </div>
      </header>

      {/* 3-Column Studio Layout */}
      <main className="mx-auto grid max-w-[1700px] w-full flex-1 gap-6 px-5 py-6 lg:grid-cols-[280px_1fr_340px] lg:px-8">
        {/* Left Column: Slide List Thumbnails */}
        <section className="flex flex-col gap-3 overflow-hidden border-r border-border pr-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Slide Track ({slides.length})
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">16:9 Widescreen</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            {slides.map((slide, idx) => {
              const isSelected = idx === selectedSlideIndex;
              return (
                <div
                  key={slide.id}
                  onClick={() => selectSlide(idx)}
                  className={`group cursor-pointer rounded-lg border p-2 transition-all ${
                    isSelected
                      ? "border-brand bg-brand/10 ring-2 ring-brand"
                      : "border-border hover:border-brand/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-mono font-bold text-foreground">
                      Slide {String(slide.slide_number).padStart(2, "0")}
                    </span>
                    <Badge
                      variant={slide.slide_type === "quiz" ? "default" : "outline"}
                      className={`text-[9px] uppercase font-mono px-1.5 py-0 ${
                        slide.slide_type === "quiz" ? "bg-brand text-brand-foreground" : ""
                      }`}
                    >
                      {slide.slide_type}
                    </Badge>
                  </div>

                  {/* Scaled-down miniature slide preview */}
                  <SlideRenderer
                    slide={slide}
                    quizTitle={quizTitle}
                    isThumbnail={true}
                    showCorrectAnswer={true}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Center Column: Large Slide Preview */}
        <section className="flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground uppercase">
                Previewing Slide {selectedSlide?.slide_number}
              </span>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {currentType}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Visual Source of Truth
            </span>
          </div>

          <div className="relative w-full aspect-[16/9] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl">
            {selectedSlide ? (
              <SlideRenderer
                slide={{
                  ...selectedSlide,
                  slide_type: currentType,
                  question_metadata:
                    currentType === "quiz"
                      ? {
                          correct_answer: correctAnswer,
                          points,
                          timer_seconds: timerSeconds,
                        }
                      : null,
                }}
                quizTitle={quizTitle}
                isThumbnail={false}
                showCorrectAnswer={true}
              />
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            The presentation is displayed exactly as designed. Interactive quiz metadata is attached without altering your slide graphics.
          </p>
        </section>

        {/* Right Column: Slide Configuration Panel */}
        <aside className="border-l border-border pl-6 flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Slide Configuration
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Slide {selectedSlide?.slide_number} of {slides.length}
            </p>
          </div>

          {/* Slide Type Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Slide Role / Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "normal", label: "Normal", icon: Layers },
                { id: "quiz", label: "Quiz Question", icon: HelpCircle },
                { id: "join", label: "Join Screen", icon: Users },
                { id: "leaderboard", label: "Leaderboard", icon: Trophy },
                { id: "results", label: "Results", icon: BarChart2 },
              ].map((t) => {
                const Icon = t.icon;
                const isCurrent = currentType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCurrentType(t.id as SlideType)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                      isCurrent
                        ? "border-brand bg-brand/10 text-brand ring-1 ring-brand"
                        : "border-border hover:border-brand/40 text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quiz Configuration Panel (Only visible when QUIZ) */}
          {currentType === "quiz" ? (
            <div className="space-y-5 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand">
                  Quiz Mechanics
                </span>
                <Badge className="bg-brand text-brand-foreground text-[10px]">A / B / C / D</Badge>
              </div>

              {/* Correct Answer */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Correct Answer
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["A", "B", "C", "D"] as CorrectAnswer[]).map((letter) => {
                    const isPicked = correctAnswer === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => setCorrectAnswer(letter)}
                        className={`h-12 rounded-lg border font-mono text-base font-black transition-all ${
                          isPicked
                            ? "border-emerald-500 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400"
                            : "border-border hover:border-emerald-500/50 bg-muted/40 text-foreground"
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Points */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Points Awarded
                  </label>
                  <span className="font-mono text-xs font-bold text-brand">{points} pts</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[100, 200, 250, 300, 500, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPoints(val)}
                      className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                        points === val
                          ? "bg-brand text-brand-foreground border-brand font-bold"
                          : "bg-muted/40 border-border hover:border-border/80"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={10}
                  step={10}
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 100)}
                  className="mt-2 h-9 text-xs font-mono"
                  placeholder="Custom points..."
                />
              </div>

              {/* Timer Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Timer Limit
                  </label>
                  <span className="font-mono text-xs font-bold text-brand">
                    {timerSeconds ? `${timerSeconds}s` : "No limit"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { val: null, label: "None" },
                    { val: 10, label: "10s" },
                    { val: 15, label: "15s" },
                    { val: 20, label: "20s" },
                    { val: 30, label: "30s" },
                    { val: 45, label: "45s" },
                    { val: 60, label: "60s" },
                  ].map((item) => (
                    <button
                      key={String(item.val)}
                      type="button"
                      onClick={() => setTimerSeconds(item.val)}
                      className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                        timerSeconds === item.val
                          ? "bg-brand text-brand-foreground border-brand font-bold"
                          : "bg-muted/40 border-border hover:border-border/80"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scoring Mode */}
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] font-mono text-muted-foreground">
                  Scoring: <strong>Fixed Points</strong> (+{points} for correct, 0 for wrong)
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-center text-muted-foreground space-y-2">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="text-xs">
                This slide is set to <strong>{currentType.toUpperCase()}</strong>.
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                Switch type to <strong>Quiz Question</strong> above to configure answer keys and scoring timers.
              </p>
            </div>
          )}

          {/* Action button */}
          <Button
            className="w-full font-bold"
            onClick={() => void saveCurrentSlideConfig()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Apply & Save Slide
          </Button>
        </aside>
      </main>
    </div>
  );
}
