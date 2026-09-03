import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Copy,
  FilePlus2,
  FolderOpen,
  Loader2,
  Play,
  Plus,
  Radio,
  Sliders,
  Trash2,
  UploadCloud,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/quizstage-shell";
import {
  createRoom,
  deleteQuiz,
  duplicateQuiz,
  getCurrentUser,
  getQuizSummaries,
  type QuizSummary,
} from "@/lib/quizstage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Host Dashboard — QuizStage" },
      { name: "description", content: "Manage your QuizStage decks, configure questions, and open live rooms." },
      { property: "og:title", content: "Host Dashboard — QuizStage" },
      { property: "og:description", content: "Manage decks and open live QuizStage rooms." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  async function loadData() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        void navigate({ to: "/auth" });
        return;
      }
      setUserId(user.id);
      const list = await getQuizSummaries(user.id);
      setQuizzes(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function signOut() {
    await import("@/integrations/supabase/client").then(({ supabase }) => supabase.auth.signOut());
    void navigate({ to: "/" });
  }

  async function openRoom(quiz: QuizSummary) {
    if (!userId) return;
    setStarting(quiz.id);
    try {
      const room = await createRoom(quiz.id, userId);
      toast.success(`Room ${room.room_code} launched!`);
      void navigate({
        to: "/live/$roomCode",
        params: { roomCode: room.room_code },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open a room.");
    } finally {
      setStarting(null);
    }
  }

  async function handleDuplicate(quiz: QuizSummary) {
    if (!userId) return;
    setActionBusy(quiz.id);
    try {
      await duplicateQuiz(quiz.id, userId);
      toast.success("Quiz duplicated.");
      await loadData();
    } catch (err) {
      toast.error("Failed to duplicate quiz.");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleDelete(quiz: QuizSummary) {
    if (!confirm(`Are you sure you want to delete "${quiz.title}"?`)) return;
    setActionBusy(quiz.id);
    try {
      await deleteQuiz(quiz.id);
      toast.success("Quiz deleted.");
      await loadData();
    } catch (err) {
      toast.error("Failed to delete quiz.");
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onSignOut={() => void signOut()} />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        {/* Header Ribbon */}
        <div className="flex flex-col justify-between gap-6 border-b border-border pb-9 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Host Console / Overview</p>
            <h1 className="mt-3 font-display text-5xl font-black uppercase leading-none sm:text-6xl">Your stage.</h1>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Prepare the deck, configure the interactive quiz moments, then open a room when the crowd is ready.
            </p>
          </div>
          <Link to="/quizzes/new">
            <Button size="lg" className="bg-brand text-brand-foreground font-bold">
              <Plus className="mr-1.5 h-4 w-4" /> New Quiz
            </Button>
          </Link>
        </div>

        {/* Metrics */}
        <section className="grid gap-4 py-8 sm:grid-cols-3">
          <Metric label="Decks" value={loading ? "—" : String(quizzes.length).padStart(2, "0")} icon={<FolderOpen />} />
          <Metric
            label="Configured Questions"
            value={loading ? "—" : String(quizzes.reduce((sum, quiz) => sum + quiz.questionCount, 0)).padStart(2, "0")}
            icon={<FilePlus2 />}
          />
          <Metric label="Event Status" value="Ready" icon={<Radio className="text-brand animate-pulse" />} />
        </section>

        {/* Decks List */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="font-display text-2xl font-bold uppercase">Your Presentations</h2>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {quizzes.length ? `${quizzes.length} Available` : "Start with a PDF"}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="animate-spin text-brand h-8 w-8" />
          </div>
        ) : quizzes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border">
            {quizzes.map((quiz) => (
              <QuizRow
                key={quiz.id}
                quiz={quiz}
                busy={starting === quiz.id || actionBusy === quiz.id}
                onStart={() => void openRoom(quiz)}
                onDuplicate={() => void handleDuplicate(quiz)}
                onDelete={() => void handleDelete(quiz)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-border bg-card p-5 rounded-lg">
      <div className="flex items-center justify-between text-brand">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="mt-5 font-display text-4xl font-black">{value}</p>
    </div>
  );
}

function QuizRow({
  quiz,
  busy,
  onStart,
  onDuplicate,
  onDelete,
}: {
  quiz: QuizSummary;
  busy: boolean;
  onStart: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="grid gap-5 py-6 md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex gap-4">
        <div className="hidden h-16 w-16 shrink-0 place-items-center bg-ink font-display text-2xl font-black text-brand rounded-lg border border-border sm:grid">
          {String(quiz.slideCount).padStart(2, "0")}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-bold uppercase">{quiz.title}</h3>
            <Badge variant={quiz.status === "ready" ? "default" : "secondary"}>{quiz.status}</Badge>
            {quiz.title.includes("CAN YOU CRACK") && (
              <Badge variant="outline" className="text-[10px] border-brand/50 text-brand">
                <Sparkles className="h-3 w-3 mr-1" /> DEMO DECK
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {quiz.fileName ?? "Presentation deck"} · {quiz.pageCount || quiz.slideCount} slides ·{" "}
            <span className="text-brand font-semibold">{quiz.questionCount} questions configured</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="bg-brand text-brand-foreground font-bold" onClick={onStart} disabled={busy}>
          {busy ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
          Open Room
        </Button>

        <Link
          to="/quizzes/$quizId/slides"
          params={{ quizId: quiz.id }}
        >
          <Button variant="outline" size="sm">
            <Sliders className="h-3.5 w-3.5 mr-1" /> Configure Slides
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          title="Duplicate quiz"
          onClick={onDuplicate}
          disabled={busy}
        >
          <Copy className="h-4 w-4 text-muted-foreground" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          title="Delete quiz"
          onClick={onDelete}
          disabled={busy}
        >
          <Trash2 className="h-4 w-4 text-destructive/80" />
        </Button>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 border border-dashed border-border bg-muted/30 px-6 py-16 text-center rounded-xl">
      <UploadCloud className="mx-auto text-brand h-12 w-12" />
      <h3 className="mt-5 font-display text-2xl font-bold uppercase">Your first deck goes here.</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Upload a presentation PDF and QuizStage will create the slide track. You can mark question slides and set scoring before you go live.
      </p>
      <Link to="/quizzes/new" className="mt-7 inline-block">
        <Button className="bg-brand text-brand-foreground font-bold">
          <UploadCloud className="mr-2 h-4 w-4" /> Upload a PDF
        </Button>
      </Link>
    </div>
  );
}