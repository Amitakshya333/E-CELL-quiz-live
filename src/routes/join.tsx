import { FormEvent, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Smartphone, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuizStageMark } from "@/components/quizstage-shell";
import { supabase } from "@/integrations/supabase/client";

import { getLocalRoomByCode } from "@/lib/quizstage";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join a Live Room — QuizStage" },
      { name: "description", content: "Join a QuizStage live quiz from your phone with a room code." },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      toast.error("Please enter a 6-character room code.");
      return;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(30); } catch {}
    }

    setBusy(true);
    try {
      let targetCode = normalized;
      const { data: room } = await supabase
        .from("rooms")
        .select("id,room_code,status")
        .eq("room_code", normalized)
        .maybeSingle();

      if (!room) {
        const local = getLocalRoomByCode(normalized);
        if (!local) {
          toast.error("That room code does not exist. Check the big screen!");
          return;
        }
        targetCode = local.room_code;
      }

      // Navigate to /join/$roomCode
      void navigate({
        to: "/join/$roomCode",
        params: { roomCode: targetCode },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not find that room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink text-paper">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-7 sm:px-8">
        <QuizStageMark />
        <div className="my-auto py-12">
          <div className="mb-8 flex h-14 w-14 items-center justify-center bg-brand text-brand-foreground rounded-xl">
            <Smartphone className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Player Entry</p>
          <h1 className="mt-4 font-display text-5xl sm:text-6xl font-black uppercase leading-[0.88]">
            Find your<br />
            <span className="text-brand">room.</span>
          </h1>
          <p className="mt-6 max-w-sm text-paper/60 leading-relaxed">
            Enter the six-character room code displayed on the projector screen to join the live competition.
          </p>

          <form onSubmit={submit} className="mt-10 space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-paper/60">
                Room Code
              </span>
              <Input
                className="h-16 border-paper/20 bg-paper/10 font-mono text-3xl uppercase tracking-[0.3em] text-paper placeholder:text-paper/25 font-black text-center"
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .replace(/[^a-zA-Z0-9]/g, "")
                      .toUpperCase()
                      .slice(0, 6)
                  )
                }
                required
                minLength={6}
                maxLength={6}
                placeholder="ABC123"
                autoFocus
              />
            </label>

            <Button
              className="h-14 w-full bg-brand text-brand-foreground font-bold text-base uppercase tracking-wider"
              size="lg"
              disabled={busy || code.length !== 6}
            >
              {busy ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Users className="mr-2 h-5 w-5" />}
              {busy ? "Finding Room..." : "Enter Room"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/30 text-center py-4">
          No app download • Works directly in mobile browsers
        </p>
      </div>
    </main>
  );
}