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
  BarChart2,
  Menu,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [slideTitle, setSlideTitle] = useState("");
  const [mobileTab, setMobileTab] = useState<"editor" | "track">("editor");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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

        // 1. Authoritative check in Firebase Firestore
        try {
          const { getQuizFromFirebase } = await import("@/lib/firebase-quiz");
          const fbQuiz = await getQuizFromFirebase(quizId);
          if (fbQuiz) {
            title = fbQuiz.title;
            if (fbQuiz.slides && fbQuiz.slides.length > 0) {
              mapped = fbQuiz.slides as SlideData[];
            }
          }
        } catch (err) {
          console.warn("Firebase quiz lookup error:", err);
        }

        // 2. Check local storage if not in Firebase
        if (mapped.length === 0) {
          const localSlides = getLocalSlides(quizId);
          const localQuiz = getLocalQuizById(quizId);
          if (localQuiz?.title) title = localQuiz.title;
          if (localSlides && localSlides.length > 0) {
            mapped = localSlides;
          }
        }

        if (mapped.length === 0 && quizId === DEMO_QUIZ_ID) {
          title = "CAN YOU CRACK THE STARTUP?";
          mapped = [
            { id: "30000000-0000-4000-8000-000000000001", slide_number: 1, page_number: 1, slide_type: "normal", slide_title: "CAN YOU CRACK THE STARTUP?" } as any,
            { id: "30000000-0000-4000-8000-000000000002", slide_number: 2, page_number: 2, slide_type: "normal", slide_title: "HOUSE RULES", question_text: "Scan QR → Answer fast → Top scorers win!" } as any,
            { id: "30000000-0000-4000-8000-000000000003", slide_number: 3, page_number: 3, slide_type: "join" },
            { id: "30000000-0000-4000-8000-000000000004", slide_number: 4, page_number: 4, slide_type: "quiz", question_text: "What is the #1 most cited reason seed-stage startups fail within 18 months?", options: { A: "Co-founder disputes", B: "Running out of cash", C: "Building something nobody wants", D: "Bad marketing" }, question_metadata: { correct_answer: "C", points: 200, timer_seconds: 30 } } as any,
            { id: "30000000-0000-4000-8000-000000000005", slide_number: 5, page_number: 5, slide_type: "quiz", question_text: "If Net Burn is ₹1L/month and bank balance is ₹8L, what is the runway?", options: { A: "6 Months", B: "12 Months", C: "15 Months", D: "8 Months" }, question_metadata: { correct_answer: "D", points: 300, timer_seconds: 20 } } as any,
            { id: "30000000-0000-4000-8000-000000000006", slide_number: 6, page_number: 6, slide_type: "leaderboard" },
            { id: "30000000-0000-4000-8000-000000000007", slide_number: 7, page_number: 7, slide_type: "quiz", question_text: "Which multi-billion dollar platform originally launched under the name 'Burbn' before pivoting?", options: { A: "Instagram", B: "Twitter / X", C: "Airbnb", D: "Slack" }, question_metadata: { correct_answer: "A", points: 500, timer_seconds: 45 } } as any,
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
          setSlideTitle((first as any).slide_title || "");
          setQuestionText((first as any).question_text || "");
          const opts = (first as any).options;
          setOptionA(opts?.A || "");
          setOptionB(opts?.B || "");
          setOptionC(opts?.C || "");
          setOptionD(opts?.D || "");
          if (first.question_metadata) {
            setCorrectAnswer(first.question_metadata.correct_answer as any);
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
      setSlideTitle((slide as any).slide_title || "");
      setQuestionText((slide as any).question_text || "");
      const opts = (slide as any).options;
      setOptionA(opts?.A || "");
      setOptionB(opts?.B || "");
      setOptionC(opts?.C || "");
      setOptionD(opts?.D || "");
      if (slide.question_metadata) {
        setCorrectAnswer(slide.question_metadata.correct_answer as any);
        setPoints(slide.question_metadata.points || 100);
        setTimerSeconds(slide.question_metadata.timer_seconds ?? 30);
      } else {
        setCorrectAnswer("A");
        setPoints(100);
        setTimerSeconds(30);
      }
    }
  }

  async function saveCurrentSlideConfig() {
    if (!selectedSlide) return;
    setSaving(true);
    try {
      // Build updated slide locally first
      const updatedSlides = [...slides];
      updatedSlides[selectedSlideIndex] = {
        ...selectedSlide,
        slide_type: currentType,
        slide_title: slideTitle || null,
        question_text: currentType === "quiz" ? (questionText || null) : null,
        options: currentType === "quiz" ? { A: optionA || "Option A", B: optionB || "Option B", C: optionC || "Option C", D: optionD || "Option D" } : null,
        question_metadata:
          currentType === "quiz"
            ? {
                correct_answer: correctAnswer,
                points,
                timer_seconds: timerSeconds,
              }
            : null,
      };

      // 1. Always save to localStorage (reliable)
      saveLocalSlides(quizId, updatedSlides);
      setSlides(updatedSlides);

      // 2. Authoritatively sync to Firebase Firestore
      try {
        const { saveQuizInFirebase } = await import("@/lib/firebase-quiz");
        await saveQuizInFirebase({
          id: quizId,
          title: quizTitle,
          owner_id: "host",
          slides: updatedSlides as any,
        });
      } catch (err) {
        console.warn("Firebase slide save error:", err);
      }

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
      <header className="border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-30 w-full">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground shrink-0">
              <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3 text-xs">
                <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <div className="h-5 w-px bg-border hidden sm:block shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-brand leading-none">Slide Manager</p>
              <h1 className="font-display text-sm sm:text-lg font-black uppercase truncate max-w-[130px] sm:max-w-md mt-0.5">
                {quizTitle}
              </h1>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
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

          {/* Mobile Actions & Sidebar Drawer */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => void saveCurrentSlideConfig()}
              disabled={saving}
              title="Save Slide Configuration"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-brand" />}
            </Button>

            <Button
              size="sm"
              className="h-8 px-2.5 text-xs bg-brand text-brand-foreground font-bold"
              onClick={() => void openLiveRoom()}
              disabled={starting}
            >
              {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              Launch
            </Button>

            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 touch-press" aria-label="Deck Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-5 flex flex-col justify-between">
                <div>
                  <SheetHeader className="text-left pb-4 border-b border-border">
                    <SheetTitle className="font-display text-base font-black uppercase">
                      Slide Manager
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {quizTitle}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>{slides.length} slides</span>
                      <span>•</span>
                      <span className="text-brand font-semibold">
                        {slides.filter((s) => s.slide_type === "quiz").length} questions
                      </span>
                    </div>
                  </SheetHeader>

                  <div className="mt-5 space-y-2.5">
                    <Button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        void saveCurrentSlideConfig();
                      }}
                      disabled={saving}
                      variant="outline"
                      className="w-full justify-start text-xs font-bold"
                    >
                      <Save className="h-4 w-4 mr-2 text-brand" />
                      Save Current Slide
                    </Button>

                    <Button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        void openLiveRoom();
                      }}
                      disabled={starting}
                      className="w-full justify-start text-xs font-bold bg-brand text-brand-foreground"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Launch Live Room
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setMobileTab(mobileTab === "editor" ? "track" : "editor");
                        setMobileDrawerOpen(false);
                      }}
                      className="w-full justify-start text-xs font-bold"
                    >
                      <Layers className="h-4 w-4 mr-2 text-brand" />
                      {mobileTab === "editor" ? "Switch to All Slides Track" : "Switch to Slide Editor"}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <Link to="/dashboard" onClick={() => setMobileDrawerOpen(false)}>
                    <Button variant="outline" className="w-full justify-start text-xs font-bold text-muted-foreground hover:text-foreground">
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

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden border-b border-border bg-card/60 px-4 py-2 w-full">
        <div className="flex rounded-lg bg-muted p-1 text-xs w-full max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setMobileTab("editor")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-bold transition-all ${
              mobileTab === "editor" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Slide {selectedSlide?.slide_number} (Edit)</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("track")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-bold transition-all ${
              mobileTab === "track" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Slides ({slides.length})</span>
          </button>
        </div>
      </div>

      {/* 3-Column Studio Layout */}
      <main className="mx-auto grid max-w-[1700px] w-full flex-1 gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[280px_1fr_340px] lg:px-8">
        {/* Left Column: Slide List Thumbnails */}
        <section className={`flex flex-col gap-3 overflow-hidden border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0 lg:pr-4 ${mobileTab === "track" ? "block" : "hidden lg:flex"}`}>
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
                  onClick={() => {
                    selectSlide(idx);
                    setMobileTab("editor");
                  }}
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
        <section className={`flex flex-col gap-4 min-w-0 ${mobileTab === "editor" ? "flex" : "hidden lg:flex"}`}>
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
                  slide_title: slideTitle || null,
                  question_text: currentType === "quiz" ? (questionText || null) : null,
                  options: currentType === "quiz" ? { A: optionA || "Option A", B: optionB || "Option B", C: optionC || "Option C", D: optionD || "Option D" } : null,
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
        <aside className={`border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-6 flex flex-col gap-6 ${mobileTab === "editor" ? "flex" : "hidden lg:flex"}`}>
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

          {/* Slide Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Slide Title
            </label>
            <Input
              value={slideTitle}
              onChange={(e) => setSlideTitle(e.target.value)}
              placeholder={currentType === "quiz" ? "e.g. Round 1" : "e.g. Welcome to E-Cell Quiz"}
              className="h-10"
            />
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

              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Question Text
                </label>
                <Input
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. What is the #1 reason startups fail?"
                  className="h-10"
                />
              </div>

              {/* Answer Options */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Answer Options
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(["A", "B", "C", "D"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`font-mono font-bold text-sm w-6 text-center ${correctAnswer === key ? "text-emerald-500" : "text-muted-foreground"}`}>{key}</span>
                      <Input
                        value={key === "A" ? optionA : key === "B" ? optionB : key === "C" ? optionC : optionD}
                        onChange={(e) => {
                          if (key === "A") setOptionA(e.target.value);
                          else if (key === "B") setOptionB(e.target.value);
                          else if (key === "C") setOptionC(e.target.value);
                          else setOptionD(e.target.value);
                        }}
                        placeholder={`Option ${key}`}
                        className="h-9 flex-1"
                      />
                    </div>
                  ))}
                </div>
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
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[100, 200, 250, 300, 500, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPoints(val)}
                      className={`h-9 flex items-center justify-center text-xs font-mono rounded border transition-colors ${
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
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
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
                      className={`h-8 flex items-center justify-center text-xs font-mono rounded border transition-colors ${
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
