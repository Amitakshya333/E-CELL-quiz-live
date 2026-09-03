import { useState, type ChangeEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileUp, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/quizstage-shell";
import { createQuizFromPdf, getCurrentUser } from "@/lib/quizstage";

export const Route = createFileRoute("/quizzes/new")({
  head: () => ({
    meta: [
      { title: "New Quiz — QuizStage" },
      { name: "description", content: "Upload a PDF deck and turn its slides into an interactive live quiz." },
      { property: "og:title", content: "New Quiz — QuizStage" },
      { property: "og:description", content: "Upload a PDF deck and prepare an interactive live quiz." },
    ],
  }),
  component: NewQuizPage,
});

function NewQuizPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    if (next) setFile(next);
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        void navigate({ to: "/auth" });
        return;
      }
      const quizId = await createQuizFromPdf(file, user.id);
      toast.success("Presentation uploaded! Configuring your slide track.");
      void navigate({
        to: "/quizzes/$quizId/slides",
        params: { quizId },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload that deck.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8 lg:py-14">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="mt-12 grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">New Quiz / 01</p>
            <h1 className="mt-4 font-display text-6xl font-black uppercase leading-[0.88]">
              Bring your<br />
              <span className="text-brand">deck.</span>
            </h1>
            <p className="mt-6 max-w-sm leading-7 text-muted-foreground">
              Start with a PDF exported from PowerPoint, Canva, or Google Slides. We preserve your visual design exactly, letting you attach quiz mechanics to any slide.
            </p>
          </div>
          <div>
            <label
              htmlFor="pdf-upload"
              className={`group flex min-h-[360px] cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 text-center transition-colors rounded-xl ${
                file ? "border-brand bg-accent/40" : "border-border bg-muted/20 hover:border-brand hover:bg-accent/20"
              }`}
            >
              <input id="pdf-upload" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={choose} />
              {file ? (
                <>
                  <FileUp className="h-12 w-12 text-brand" />
                  <p className="mt-6 max-w-sm break-words font-display text-2xl font-bold uppercase">{file.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">PDF selected • Click continue to create slide track</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-12 w-12 text-brand transition-transform group-hover:-translate-y-1" />
                  <p className="mt-6 font-display text-2xl font-bold uppercase">Drop your presentation PDF here</p>
                  <p className="mt-2 text-sm text-muted-foreground">or click to browse • max 50 MB</p>
                </>
              )}
            </label>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                Your original presentation is kept in private Cloud storage and visually untouched.
              </p>
              <Button size="lg" className="bg-brand text-brand-foreground font-bold" disabled={!file || busy} onClick={() => void submit()}>
                {busy ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <FileUp className="mr-2 h-4 w-4" />}
                {busy ? "Processing Presentation..." : "Create Slide Track"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}