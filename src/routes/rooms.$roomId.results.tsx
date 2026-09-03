import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  BarChart2,
  CheckCircle2,
  Download,
  HelpCircle,
  Loader2,
  Trophy,
  Users,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/quizstage-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/rooms/$roomId/results")({
  head: () => ({
    meta: [
      { title: "Quiz Results & Analytics — QuizStage" },
      { name: "description", content: "Post-event leaderboard, participant rankings, and question accuracy metrics." },
    ],
  }),
  component: RoomResultsPage,
});

type Room = {
  id: string;
  room_code: string;
  quiz_id: string;
  status: string;
};

type Participant = {
  id: string;
  display_name: string;
  score: number;
};

type QuestionStats = {
  slide_number: number;
  correct_answer: string;
  points: number;
  total_answers: number;
  correct_count: number;
  accuracy: number;
  breakdown: { A: number; B: number; C: number; D: number };
};

function RoomResultsPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [quizTitle, setQuizTitle] = useState("Live Quiz");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<QuestionStats[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const { data: roomData, error: roomErr } = await supabase
          .from("rooms")
          .select("id,room_code,quiz_id,status")
          .eq("id", roomId)
          .maybeSingle();

        if (roomErr || !roomData) {
          toast.error("Room not found.");
          void navigate({ to: "/dashboard" });
          return;
        }

        setRoom(roomData as Room);

        const [
          { data: quiz },
          { data: participantRows },
          { data: slideRows },
          { data: answerRows },
        ] = await Promise.all([
          supabase.from("quizzes").select("title").eq("id", roomData.quiz_id).maybeSingle(),
          supabase.from("participants").select("id,display_name,score").eq("room_id", roomData.id).order("score", { ascending: false }),
          supabase
            .from("slides")
            .select("id,slide_number,slide_type,question_metadata(correct_answer,points)")
            .eq("quiz_id", roomData.quiz_id)
            .eq("slide_type", "quiz")
            .order("slide_number"),
          supabase.from("answers").select("slide_id,selected_answer,is_correct").eq("room_id", roomData.id),
        ]);

        setQuizTitle(quiz?.title ?? "Live Quiz");
        setParticipants((participantRows ?? []) as Participant[]);

        // Compute question statistics
        const stats: QuestionStats[] = (slideRows ?? []).map((s: any) => {
          const meta = Array.isArray(s.question_metadata) ? s.question_metadata[0] : s.question_metadata;
          const slideAnswers = (answerRows ?? []).filter((a: any) => a.slide_id === s.id);
          const total = slideAnswers.length;
          const correct = slideAnswers.filter((a: any) => a.is_correct).length;
          const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

          const counts = { A: 0, B: 0, C: 0, D: 0 };
          slideAnswers.forEach((a: any) => {
            if (a.selected_answer in counts) {
              counts[a.selected_answer as "A" | "B" | "C" | "D"] += 1;
            }
          });

          return {
            slide_number: s.slide_number,
            correct_answer: meta?.correct_answer ?? "A",
            points: meta?.points ?? 100,
            total_answers: total,
            correct_count: correct,
            accuracy,
            breakdown: counts,
          };
        });

        setQuestions(stats);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-brand" />
      </div>
    );
  }

  if (!room) return null;

  const totalPlayers = participants.length;
  const avgScore = totalPlayers > 0 ? Math.round(participants.reduce((sum, p) => sum + p.score, 0) / totalPlayers) : 0;
  const topScore = participants[0]?.score ?? 0;
  const winnerName = participants[0]?.display_name ?? "No winner yet";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        {/* Navigation & Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mb-3">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-4xl sm:text-5xl font-black uppercase">{quizTitle}</h1>
              <Badge variant="outline" className="font-mono text-xs uppercase text-brand border-brand/50">
                Room: {room.room_code}
              </Badge>
            </div>
            <p className="mt-2 text-muted-foreground text-sm">Post-event performance summary & question analytics</p>
          </div>

          <div className="flex gap-2">
            <Link to="/live/$roomCode" params={{ roomCode: room.room_code }}>
              <Button variant="outline" size="sm">
                Open Host Console
              </Button>
            </Link>
          </div>
        </div>

        {/* Top 4 Metrics Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-8">
          <div className="p-5 bg-card border border-border rounded-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-brand" /> Participants
            </span>
            <p className="mt-3 font-display text-3xl font-black">{totalPlayers}</p>
          </div>

          <div className="p-5 bg-card border border-border rounded-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-brand" /> Questions
            </span>
            <p className="mt-3 font-display text-3xl font-black">{questions.length}</p>
          </div>

          <div className="p-5 bg-card border border-border rounded-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5 text-brand" /> Avg Score
            </span>
            <p className="mt-3 font-display text-3xl font-black text-brand">{avgScore}</p>
          </div>

          <div className="p-5 bg-card border border-border rounded-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Champion
            </span>
            <p className="mt-3 font-display text-2xl font-black truncate text-foreground">{winnerName}</p>
            <span className="text-xs font-mono text-muted-foreground">{topScore} pts</span>
          </div>
        </section>

        {/* 2-Column Analytics: Leaderboard & Question Performance */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] pt-4">
          {/* Column 1: Final Leaderboard */}
          <div className="border border-border rounded-2xl bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h2 className="font-display text-xl font-bold uppercase flex items-center gap-2">
                <Trophy className="h-5 w-5 text-brand" /> Final Standings
              </h2>
              <span className="font-mono text-xs text-muted-foreground">{totalPlayers} ranked</span>
            </div>

            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-8 text-center">No participants completed the quiz.</p>
            ) : (
              <div className="divide-y divide-border">
                {participants.map((p, idx) => {
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
                  return (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-bold w-7 text-center">{medal}</span>
                        <span className="font-semibold text-sm">{p.display_name}</span>
                      </div>
                      <span className="font-mono font-bold text-brand text-sm">{p.score} pts</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Question Accuracy Breakdown */}
          <div className="border border-border rounded-2xl bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h2 className="font-display text-xl font-bold uppercase flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-brand" /> Question Accuracy
              </h2>
              <span className="font-mono text-xs text-muted-foreground">Accuracy %</span>
            </div>

            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-8 text-center">No quiz questions played.</p>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.slide_number} className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-display text-sm font-bold uppercase">Question {q.slide_number}</span>
                      <Badge variant={q.accuracy >= 50 ? "default" : "secondary"} className="font-mono text-xs">
                        {q.accuracy}% Correct
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Correct: <strong className="text-emerald-500 font-mono">{q.correct_answer}</strong></span>
                      <span>•</span>
                      <span>{q.correct_count} of {q.total_answers} answered correctly</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${q.accuracy >= 50 ? "bg-emerald-500" : "bg-orange-500"}`}
                        style={{ width: `${q.accuracy}%` }}
                      />
                    </div>

                    {/* Options Breakdown */}
                    <div className="grid grid-cols-4 gap-2 pt-1 text-center font-mono text-[11px]">
                      {(["A", "B", "C", "D"] as const).map((opt) => (
                        <div
                          key={opt}
                          className={`p-1 rounded ${
                            opt === q.correct_answer ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {opt}: {q.breakdown[opt]}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
