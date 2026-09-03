import React from "react";
import { Badge } from "@/components/ui/badge";
import { Trophy, HelpCircle, AlertCircle, Sparkles, Flame, ShieldAlert } from "lucide-react";

export type SlideData = {
  id: string;
  slide_number: number;
  page_number: number;
  slide_type: "normal" | "quiz" | "join" | "leaderboard" | "results";
  pdf_url?: string | null;
  question_metadata?: {
    correct_answer: "A" | "B" | "C" | "D";
    points: number;
    timer_seconds: number | null;
  } | null;
};

interface SlideRendererProps {
  slide: SlideData;
  quizTitle?: string;
  isThumbnail?: boolean;
  showCorrectAnswer?: boolean;
  className?: string;
}

export function SlideRenderer({
  slide,
  quizTitle = "CAN YOU CRACK THE STARTUP?",
  isThumbnail = false,
  showCorrectAnswer = false,
  className = "",
}: SlideRendererProps) {
  // If slide has a direct uploaded PDF or image URL, we can render it
  // Otherwise, we provide the canonical presentation slide deck
  return (
    <div
      className={`relative aspect-[16/9] w-full select-none overflow-hidden rounded-md border transition-all ${
        isThumbnail
          ? "text-[9px] shadow-sm border-border/70"
          : "text-base shadow-2xl border-border"
      } ${className}`}
      style={{
        background: "linear-gradient(135deg, #0d0e12 0%, #171922 60%, #1e2230 100%)",
        color: "#f3f4f6",
      }}
    >
      {/* Background Accent Grid / Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(249, 115, 22, 0.25) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)",
        }}
      />

      {/* Header bar on slide */}
      <div
        className={`relative z-10 flex items-center justify-between border-b border-white/10 ${
          isThumbnail ? "px-2 py-1" : "px-8 py-4"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`font-black uppercase tracking-wider text-orange-500 ${
              isThumbnail ? "text-[8px]" : "text-xs tracking-widest"
            }`}
          >
            QUIZSTAGE
          </span>
          <span className="text-white/30">•</span>
          <span className={`font-mono uppercase text-white/60 truncate ${isThumbnail ? "text-[7px] max-w-[80px]" : "text-xs max-w-sm"}`}>
            {quizTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`font-mono uppercase text-white/50 ${
              isThumbnail ? "text-[7px]" : "text-xs"
            }`}
          >
            Slide {String(slide.slide_number).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Main Slide Body */}
      <div
        className={`relative z-10 flex h-[calc(100%-2.5rem)] flex-col justify-between ${
          isThumbnail ? "p-2" : "p-8 sm:p-12"
        }`}
      >
        {renderSlideContent(slide, isThumbnail, showCorrectAnswer)}

        {/* Footer footer info */}
        <div
          className={`flex items-center justify-between border-t border-white/10 text-white/40 ${
            isThumbnail ? "pt-1 text-[6px]" : "pt-4 text-xs font-mono"
          }`}
        >
          <span>E-CELL LIVE COMPETITION</span>
          <span className="uppercase">{slide.slide_type}</span>
        </div>
      </div>
    </div>
  );
}

function renderSlideContent(
  slide: SlideData,
  isThumbnail: boolean,
  showCorrectAnswer: boolean
) {
  const pageNum = slide.slide_number || slide.page_number;

  // Slide 1: Title
  if (pageNum === 1) {
    return (
      <div className="my-auto flex flex-col items-center justify-center text-center">
        <div
          className={`font-mono uppercase tracking-widest text-orange-400 font-bold ${
            isThumbnail ? "text-[7px] mb-1" : "text-xs mb-4"
          }`}
        >
          ★ E-CELL INTERACTIVE ARENA ★
        </div>
        <h1
          className={`font-black uppercase tracking-tight text-white leading-none ${
            isThumbnail ? "text-[14px]" : "text-4xl sm:text-6xl lg:text-7xl"
          }`}
        >
          CAN YOU CRACK <br />
          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
            THE STARTUP?
          </span>
        </h1>
        <p
          className={`text-white/70 max-w-xl mx-auto font-sans ${
            isThumbnail ? "hidden" : "mt-6 text-base sm:text-lg"
          }`}
        >
          A high-stakes founder showdown for teams who know their runway from their roadmap.
        </p>
      </div>
    );
  }

  // Slide 2: Rules
  if (pageNum === 2) {
    return (
      <div className="my-auto">
        <div className={`font-mono uppercase tracking-widest text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs mb-2"}`}>
          CONTEST GUIDELINES
        </div>
        <h2 className={`font-black uppercase text-white ${isThumbnail ? "text-xs" : "text-3xl sm:text-5xl mb-6"}`}>
          HOUSE RULES
        </h2>
        <div className={`grid gap-2 text-white/80 ${isThumbnail ? "text-[7px]" : "gap-3 text-sm sm:text-base max-w-2xl"}`}>
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/10">
            <span className="font-mono text-orange-400 font-bold">01.</span>
            <span>Scan the QR code on your phone to enter the arena.</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/10">
            <span className="font-mono text-orange-400 font-bold">02.</span>
            <span>Select A, B, C, or D before the server countdown reaches 0s.</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/10">
            <span className="font-mono text-orange-400 font-bold">03.</span>
            <span>Once submitted, your answer is locked. No changes allowed!</span>
          </div>
        </div>
      </div>
    );
  }

  // Slide 3: Join Screen Slide
  if (pageNum === 3 || slide.slide_type === "join") {
    return (
      <div className="my-auto flex flex-col items-center justify-center text-center">
        <div className={`font-mono uppercase tracking-widest text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs mb-2"}`}>
          CONNECT YOUR SMARTPHONE
        </div>
        <h2 className={`font-black uppercase text-white ${isThumbnail ? "text-xs" : "text-3xl sm:text-5xl mb-4"}`}>
          SCAN THE QR CODE TO JOIN
        </h2>
        <p className={`text-white/60 max-w-md ${isThumbnail ? "hidden" : "text-sm sm:text-base mb-4"}`}>
          Point your camera at the big screen, type your founder name, and stand by for Question 1!
        </p>
      </div>
    );
  }

  // Slide 4: Question 1
  if (pageNum === 4) {
    return (
      <div className="my-auto">
        <div className="flex items-center justify-between mb-2">
          <span className={`font-mono uppercase tracking-wider text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs"}`}>
            QUESTION 01 • 200 PTS • 30 SEC
          </span>
        </div>
        <h2 className={`font-black text-white ${isThumbnail ? "text-[9px] mb-2" : "text-2xl sm:text-4xl mb-6 leading-tight"}`}>
          What is the #1 most cited reason seed-stage startups fail within 18 months?
        </h2>
        <div className={`grid grid-cols-2 gap-2 ${isThumbnail ? "text-[6px]" : "gap-3 text-sm sm:text-base"}`}>
          {[
            { key: "A", text: "Co-founder disputes" },
            { key: "B", text: "Running out of cash (Runway failure)" },
            { key: "C", text: "Building something nobody wants" },
            { key: "D", text: "Ineffective social media marketing" },
          ].map((item) => (
            <div
              key={item.key}
              className={`flex items-center p-2 rounded border transition-all ${
                showCorrectAnswer && item.key === "B"
                  ? "border-emerald-500 bg-emerald-950/70 text-emerald-300 ring-2 ring-emerald-500"
                  : "border-white/15 bg-white/5 text-white/90"
              }`}
            >
              <span className="font-mono font-bold text-orange-400 mr-2">{item.key}</span>
              <span className="truncate">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Slide 5: Question 2
  if (pageNum === 5) {
    return (
      <div className="my-auto">
        <div className="flex items-center justify-between mb-2">
          <span className={`font-mono uppercase tracking-wider text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs"}`}>
            QUESTION 02 • 300 PTS • 20 SEC
          </span>
        </div>
        <h2 className={`font-black text-white ${isThumbnail ? "text-[9px] mb-2" : "text-2xl sm:text-4xl mb-6 leading-tight"}`}>
          If Net Burn is $100K/month and the bank balance is $800K, what is the exact runway?
        </h2>
        <div className={`grid grid-cols-2 gap-2 ${isThumbnail ? "text-[6px]" : "gap-3 text-sm sm:text-base"}`}>
          {[
            { key: "A", text: "6 Months" },
            { key: "B", text: "12 Months" },
            { key: "C", text: "15 Months" },
            { key: "D", text: "8 Months" },
          ].map((item) => (
            <div
              key={item.key}
              className={`flex items-center p-2 rounded border transition-all ${
                showCorrectAnswer && item.key === "D"
                  ? "border-emerald-500 bg-emerald-950/70 text-emerald-300 ring-2 ring-emerald-500"
                  : "border-white/15 bg-white/5 text-white/90"
              }`}
            >
              <span className="font-mono font-bold text-orange-400 mr-2">{item.key}</span>
              <span className="truncate">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Slide 6: Leaderboard Intermission
  if (pageNum === 6 || slide.slide_type === "leaderboard") {
    return (
      <div className="my-auto flex flex-col items-center justify-center text-center">
        <Trophy className={`text-yellow-400 mb-2 ${isThumbnail ? "h-4 w-4" : "h-14 w-14"}`} />
        <div className={`font-mono uppercase tracking-widest text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs mb-2"}`}>
          HALFTIME STANDINGS
        </div>
        <h2 className={`font-black uppercase text-white ${isThumbnail ? "text-xs" : "text-3xl sm:text-5xl mb-4"}`}>
          WHO WILL BECOME UNICORN?
        </h2>
        <p className={`text-white/60 max-w-md ${isThumbnail ? "hidden" : "text-sm sm:text-base"}`}>
          Let's see who is dominating the valuation leaderboard and who needs an emergency bridge round!
        </p>
      </div>
    );
  }

  // Slide 7: Question 3
  if (pageNum === 7) {
    return (
      <div className="my-auto">
        <div className="flex items-center justify-between mb-2">
          <span className={`font-mono uppercase tracking-wider text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs"}`}>
            QUESTION 03 • 500 PTS • 45 SEC (FINAL QUESTION)
          </span>
        </div>
        <h2 className={`font-black text-white ${isThumbnail ? "text-[9px] mb-2" : "text-2xl sm:text-4xl mb-6 leading-tight"}`}>
          Which multi-billion dollar platform originally launched under the name 'Burbn' before pivoting?
        </h2>
        <div className={`grid grid-cols-2 gap-2 ${isThumbnail ? "text-[6px]" : "gap-3 text-sm sm:text-base"}`}>
          {[
            { key: "A", text: "Instagram" },
            { key: "B", text: "Twitter / X" },
            { key: "C", text: "Airbnb" },
            { key: "D", text: "Slack" },
          ].map((item) => (
            <div
              key={item.key}
              className={`flex items-center p-2 rounded border transition-all ${
                showCorrectAnswer && item.key === "A"
                  ? "border-emerald-500 bg-emerald-950/70 text-emerald-300 ring-2 ring-emerald-500"
                  : "border-white/15 bg-white/5 text-white/90"
              }`}
            >
              <span className="font-mono font-bold text-orange-400 mr-2">{item.key}</span>
              <span className="truncate">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Slide 8: Final Results
  return (
    <div className="my-auto flex flex-col items-center justify-center text-center">
      <Sparkles className={`text-orange-400 mb-2 ${isThumbnail ? "h-4 w-4" : "h-12 w-12"}`} />
      <div className={`font-mono uppercase tracking-widest text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs mb-2"}`}>
        COMPETITION FINALE
      </div>
      <h2 className={`font-black uppercase text-white ${isThumbnail ? "text-xs" : "text-3xl sm:text-5xl mb-3"}`}>
        THE WINNER'S PODIUM
      </h2>
      <p className={`text-white/60 max-w-md ${isThumbnail ? "hidden" : "text-sm sm:text-base"}`}>
        Final scores are locked! Huge congratulations to all participating founders and startups.
      </p>
    </div>
  );
}
