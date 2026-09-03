import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CirclePlay, LogIn, Smartphone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizStageMark } from "@/components/quizstage-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuizStage — Live quizzes for the room" },
      { name: "description", content: "Run presentation-led live quizzes with a host console, projector view, and fast participant play." },
      { property: "og:title", content: "QuizStage — Live quizzes for the room" },
      { property: "og:description", content: "Turn any presentation into a live, projector-first quiz night." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <QuizStageMark />
          <nav className="flex items-center gap-2">
            <Link to="/join">
              <Button variant="ghost" size="sm"><Users /> Join a room</Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="sm"><LogIn /> Host sign in</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-28 lg:pt-24">
        <div className="max-w-3xl">
          <div className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            <span className="h-px w-10 bg-brand" />
            Presentation-powered live quiz
          </div>
          <h1 className="max-w-4xl font-display text-4xl sm:text-6xl md:text-7xl lg:text-[7.4rem] font-black uppercase leading-[0.9] tracking-tight text-foreground">
            Put the room<br /><span className="text-brand">on the spot.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground font-medium">
            QuizStage turns your presentation deck into a shared live moment: one screen for the room, one phone for every answer, and one host in control.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto h-12 font-bold touch-press"><CirclePlay className="mr-2 h-4 w-4" /> Build your first quiz <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
            <Link to="/join">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto h-12 font-bold touch-press"><Smartphone className="mr-2 h-4 w-4" /> Join with a code</Button>
            </Link>
          </div>
          <div className="mt-14 grid max-w-xl grid-cols-3 gap-5 border-t border-border pt-6">
            <Stat value="01" label="Upload a deck" />
            <Stat value="02" label="Mark questions" />
            <Stat value="03" label="Take the stage" />
          </div>
        </div>

        <div className="relative flex min-h-[520px] items-center justify-center lg:min-h-[620px]">
          <div className="absolute right-1 top-2 hidden text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:block">Live room / 001</div>
          <div className="stage-poster w-full max-w-[540px] border border-foreground/10 bg-ink p-5 text-paper shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-paper/20 pb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-paper/60">
              <span>QuizStage presents</span><span>Tonight / 20:45</span>
            </div>
            <div className="flex aspect-[4/5] flex-col justify-between py-10 sm:py-14">
              <div className="flex items-start justify-between">
                <span className="border border-brand px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Live quiz</span>
                <span className="font-display text-6xl font-black leading-none text-paper/15 sm:text-8xl">01</span>
              </div>
              <div>
                <div className="mb-5 h-2 w-24 bg-brand" />
                <h2 className="font-display text-5xl font-black uppercase leading-[0.86] sm:text-7xl">Can you<br />crack the<br /><span className="text-brand">startup?</span></h2>
                <p className="mt-7 max-w-xs text-sm leading-6 text-paper/60">A founder challenge for teams who know their runway from their roadmap.</p>
              </div>
              <div className="flex items-end justify-between border-t border-paper/20 pt-5">
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-paper/50">Room code</p><p className="mt-1 font-display text-3xl font-bold tracking-[0.18em]">QZ7K2M</p></div>
                <div className="grid grid-cols-3 gap-1.5" aria-label="Join code graphic">{Array.from({ length: 9 }).map((_, i) => <span key={i} className={`h-2 w-2 ${i % 3 === 0 ? "bg-brand" : "bg-paper/40"}`} />)}</div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 left-0 max-w-[190px] border border-border bg-background p-4 shadow-xl sm:left-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Room energy</p>
            <div className="mt-4 flex items-end gap-1.5">{[36, 52, 43, 70, 58, 84, 63, 96].map((height, i) => <span key={i} className={`w-2 ${i > 5 ? "bg-brand" : "bg-foreground/25"}`} style={{ height }} />)}</div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 lg:grid-cols-3 lg:px-8">
          <Feature eyebrow="For the host" title="Keep the show moving." body="Advance slides, open questions, reveal answers, and bring the leaderboard up without leaving the console." />
          <Feature eyebrow="For the room" title="One big shared screen." body="Your deck stays central. The join code, timer, and score moments appear exactly when the room needs them." />
          <Feature eyebrow="For every player" title="Fast on any phone." body="No app download. Join with a room code, pick an answer, and get back to arguing with your team." />
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><p className="font-display text-2xl font-bold text-brand">{value}</p><p className="mt-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p></div>;
}

function Feature({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <article className="border-border py-10 lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p><h2 className="mt-4 max-w-xs font-display text-3xl font-black uppercase leading-none">{title}</h2><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p></article>;
}