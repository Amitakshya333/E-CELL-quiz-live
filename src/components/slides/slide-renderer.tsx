import React from "react";
import { Badge } from "@/components/ui/badge";
import { Trophy, HelpCircle, AlertCircle, Sparkles, Flame, ShieldAlert, Users } from "lucide-react";

export type SlideData = {
  id: string;
  slide_number: number;
  page_number: number;
  slide_type: "normal" | "quiz" | "join" | "leaderboard" | "results";
  pdf_url?: string | null;
  slide_title?: string | null;
  question_text?: string | null;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  } | null;
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
  quizTitle = "LIVE QUIZ",
  isThumbnail = false,
  showCorrectAnswer = false,
  className = "",
}: SlideRendererProps) {
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
          isThumbnail ? "px-2 py-1" : "px-3 py-1.5 sm:px-6 sm:py-2.5 md:px-8 md:py-3.5"
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 mr-2">
          <span
            className={`font-black uppercase tracking-wider text-orange-500 shrink-0 ${
              isThumbnail ? "text-[8px]" : "text-[10px] sm:text-xs tracking-wider"
            }`}
          >
            E-CELL
          </span>
          <span className="text-white/30 shrink-0">&bull;</span>
          <span className={`font-mono uppercase text-white/70 truncate ${isThumbnail ? "text-[7px] max-w-[70px]" : "text-[10px] sm:text-xs max-w-[150px] sm:max-w-sm"}`}>
            {quizTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`font-mono uppercase text-white/60 shrink-0 whitespace-nowrap ${
              isThumbnail ? "text-[7px]" : "text-[10px] sm:text-xs font-semibold"
            }`}
          >
            Slide {String(slide.slide_number).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Main Slide Body */}
      <div
        className={`relative z-10 flex h-[calc(100%-2.2rem)] flex-col justify-between ${
          isThumbnail ? "p-2" : "p-3 sm:p-5 md:p-8 lg:p-10"
        }`}
      >
        {renderSlideContent(slide, isThumbnail, showCorrectAnswer, quizTitle)}

        {/* Footer */}
        <div
          className={`flex items-center justify-between border-t border-white/10 text-white/40 ${
            isThumbnail ? "pt-1 text-[6px]" : "pt-2.5 sm:pt-4 text-[10px] sm:text-xs font-mono"
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
  showCorrectAnswer: boolean,
  quizTitle: string
) {
  // ── JOIN SLIDE ──
  if (slide.slide_type === "join") {
    return (
      <div className="my-auto flex flex-col items-center justify-center text-center">
        <Users className={`text-orange-400 mb-2 ${isThumbnail ? "h-3 w-3" : "h-10 w-10 sm:h-14 sm:w-14"}`} />
        <div className={`font-mono uppercase tracking-widest text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs mb-2"}`}>
          CONNECT YOUR SMARTPHONE
        </div>
        <h2 className={`font-black uppercase text-white ${isThumbnail ? "text-xs" : "text-3xl sm:text-5xl mb-4"}`}>
          {slide.slide_title || "SCAN THE QR CODE TO JOIN"}
        </h2>
        <p className={`text-white/60 max-w-md ${isThumbnail ? "hidden" : "text-sm sm:text-base mb-4"}`}>
          Point your camera at the big screen, type your name, and stand by for the first question!
        </p>
      </div>
    );
  }

  // ── LEADERBOARD SLIDE ──
  if (slide.slide_type === "leaderboard") {
    return (
      <div className="my-auto flex flex-col items-center justify-center text-center">
        <Trophy className={`text-yellow-400 mb-2 ${isThumbnail ? "h-4 w-4" : "h-14 w-14"}`} />
        <div className={`font-mono uppercase tracking-widest text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs mb-2"}`}>
          LIVE STANDINGS
        </div>
        <h2 className={`font-black uppercase text-white ${isThumbnail ? "text-xs" : "text-3xl sm:text-5xl mb-4"}`}>
          {slide.slide_title || "LEADERBOARD"}
        </h2>
        <p className={`text-white/60 max-w-md ${isThumbnail ? "hidden" : "text-sm sm:text-base"}`}>
          Let's see who is leading the competition!
        </p>
      </div>
    );
  }

  // ── RESULTS SLIDE ──
  if (slide.slide_type === "results") {
    return (
      <div className="my-auto flex flex-col items-center justify-center text-center">
        <Sparkles className={`text-orange-400 mb-2 ${isThumbnail ? "h-4 w-4" : "h-12 w-12"}`} />
        <div className={`font-mono uppercase tracking-widest text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs mb-2"}`}>
          COMPETITION FINALE
        </div>
        <h2 className={`font-black uppercase text-white ${isThumbnail ? "text-xs" : "text-3xl sm:text-5xl mb-3"}`}>
          {slide.slide_title || "THE WINNER'S PODIUM"}
        </h2>
        <p className={`text-white/60 max-w-md ${isThumbnail ? "hidden" : "text-sm sm:text-base"}`}>
          Final scores are locked! Congratulations to all participants.
        </p>
      </div>
    );
  }

  // ── QUIZ SLIDE ──
  if (slide.slide_type === "quiz") {
    const meta = slide.question_metadata;
    const pts = meta?.points ?? 100;
    const timer = meta?.timer_seconds ?? 30;
    const questionText = slide.question_text || `Question ${slide.slide_number}`;
    const options = slide.options || { A: "Option A", B: "Option B", C: "Option C", D: "Option D" };

    return (
      <div className="my-auto">
        <div className="flex items-center justify-between mb-2">
          <span className={`font-mono uppercase tracking-wider text-orange-400 font-bold ${isThumbnail ? "text-[7px]" : "text-xs"}`}>
            QUESTION &bull; {pts} PTS &bull; {timer} SEC
          </span>
        </div>
        <h2 className={`font-black text-white ${isThumbnail ? "text-[9px] mb-2" : "text-2xl sm:text-4xl mb-6 leading-tight"}`}>
          {questionText}
        </h2>
        <div className={`grid grid-cols-2 gap-2 ${isThumbnail ? "text-[6px]" : "gap-3 text-sm sm:text-base"}`}>
          {(["A", "B", "C", "D"] as const).map((key) => (
            <div
              key={key}
              className={`flex items-center p-2 rounded border transition-all ${
                showCorrectAnswer && meta?.correct_answer === key
                  ? "border-emerald-500 bg-emerald-950/70 text-emerald-300 ring-2 ring-emerald-500"
                  : "border-white/15 bg-white/5 text-white/90"
              }`}
            >
              <span className="font-mono font-bold text-orange-400 mr-2">{key}</span>
              <span className="truncate">{options[key]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── NORMAL SLIDE (presentation / title / info) ──
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
          isThumbnail ? "text-[14px]" : "text-3xl sm:text-5xl lg:text-6xl"
        }`}
      >
        {slide.slide_title || quizTitle || "PRESENTATION SLIDE"}
      </h1>
      {slide.question_text && (
        <p
          className={`text-white/70 max-w-xl mx-auto font-sans ${
            isThumbnail ? "hidden" : "mt-6 text-base sm:text-lg"
          }`}
        >
          {slide.question_text}
        </p>
      )}
    </div>
  );
}
