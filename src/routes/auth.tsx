import { FormEvent, useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, KeyRound, Laptop, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuizStageMark } from "@/components/quizstage-shell";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, loginAsLocalHost } from "@/lib/quizstage";

type AuthSearch = {
  mode?: "register" | "login";
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search["mode"] === "register" ? "register" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Host Sign In — QuizStage" },
      { name: "description", content: "Sign in or continue as local host to manage quizzes and live rooms." },
      { property: "og:title", content: "Host Sign In — QuizStage" },
      { property: "og:description", content: "Build and host presentation-led live quizzes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const isRegister = mode === "register";

  useEffect(() => {
    void (async () => {
      const user = await getCurrentUser();
      if (user) {
        void navigate({ to: "/dashboard" });
      }
    })();
  }, [navigate]);

  // Instant Local Dev Host Sign In
  function handleLocalHostLogin(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    loginAsLocalHost(email || "host@quizstage.dev", "Demo Organizer");
    toast.success("Signed in as Local Host / Organizer.");
    void navigate({ to: "/dashboard" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);

    try {
      if (isRegister) {
        const result = await supabase.auth.signUp({
          email,
          password,
        });

        if (result.error) {
          if (result.error.message?.toLowerCase().includes("weak")) {
            throw new Error("Password too weak. Please use at least 8 characters with numbers or symbols.");
          }
          throw result.error;
        }

        if (result.data.session) {
          toast.success("Account created and signed in!");
          void navigate({ to: "/dashboard" });
        } else {
          // Cloud Supabase has email confirmation enabled
          toast.success("Account created! You can verify your email OTP or enter immediately as Local Host.");
          setOtpMode(true);
        }
      } else {
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (result.error) {
          if (result.error.message?.toLowerCase().includes("email not confirmed")) {
            toast.error("Email not confirmed. Entering as Local Host with this email.");
            loginAsLocalHost(email, "Organizer");
            void navigate({ to: "/dashboard" });
            return;
          }
          throw result.error;
        }

        toast.success("Welcome back!");
        void navigate({ to: "/dashboard" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Authentication failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!otpCode || !email) return;
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode.trim(),
        type: "email",
      });

      if (error) throw error;
      toast.success("Email verified! Welcome aboard.");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[.8fr_1.2fr] bg-background">
      {/* Left Branding Panel (Hidden on small mobile) */}
      <section className="hidden bg-ink p-10 text-paper lg:flex lg:flex-col lg:justify-between">
        <QuizStageMark />
        <div>
          <p className="max-w-sm font-display text-6xl font-black uppercase leading-[0.9]">
            The room is waiting.
          </p>
          <div className="mt-8 h-1 w-20 bg-brand" />
          <p className="mt-5 max-w-sm text-sm leading-6 text-paper/70 font-medium">
            Take control of the live projector, advance presentation slides, open interactive questions, and celebrate the room's champions.
          </p>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-paper/40">
          QS / HOST & ORGANIZER CONSOLE
        </p>
      </section>

      {/* Main Auth Form Container */}
      <section className="flex flex-col justify-center px-5 py-8 sm:px-8 lg:px-12 pb-safe pt-safe">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Header Logo */}
          <div className="mb-6 lg:hidden flex justify-between items-center">
            <QuizStageMark />
            <span className="text-[10px] font-mono uppercase bg-muted text-muted-foreground px-2 py-1 rounded font-semibold tracking-wider">
              Host Portal
            </span>
          </div>

          {/* Quick Local Dev Login Banner */}
          <div className="mb-6 rounded-xl border-2 border-brand/40 bg-brand/5 p-4 sm:p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground font-bold">
                ⚡
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-black uppercase tracking-tight text-foreground">
                  Quick Local Dev / Host Mode
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  Skip cloud sign-up and jump straight into the Host Dashboard and Live Room.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleLocalHostLogin}
              className="mt-3.5 w-full bg-brand text-brand-foreground font-bold shadow-md active:scale-95 transition-transform"
              size="default"
            >
              <Laptop className="h-4 w-4 mr-2" />
              Continue as Local Host (1-Click)
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or sign in with credentials</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            {otpMode ? "Verification" : isRegister ? "Start hosting" : "Welcome back"}
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-black uppercase leading-tight">
            {otpMode ? "Verify Email" : isRegister ? "Create account." : "Take the stage."}
          </h1>

          {/* OTP Code Entry Screen */}
          {otpMode ? (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter the 6-digit confirmation code sent to <strong className="text-foreground">{email}</strong>:
              </p>
              <div>
                <Input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="e.g. 123456"
                  maxLength={10}
                  className="text-center font-mono text-xl tracking-widest h-12"
                  autoFocus
                  required
                />
              </div>

              <Button type="submit" className="w-full h-11" disabled={busy}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {busy ? "Verifying..." : "Verify and Continue"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs"
                onClick={handleLocalHostLogin}
              >
                Skip code & continue as Local Host with this email
              </Button>
            </form>
          ) : (
            /* Email & Password Form */
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em]">
                  Email Address
                </span>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="you@example.com"
                  className="h-11 text-base"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em]">
                  Password
                </span>
                <div className="relative">
                  <Input
                    className="pr-11 h-11 text-base"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <Button className="w-full h-12 font-bold text-sm" size="lg" disabled={busy}>
                {busy ? "Working..." : isRegister ? "Create Host Account" : "Sign In to Dashboard"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Already hosting?" : "New to QuizStage?"}{" "}
            <Link
              className="font-bold text-brand hover:underline"
              to="/auth"
              search={{ mode: isRegister ? "login" : "register" }}
            >
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>

          <p className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" />
            Built for projector presentation quizzes with zero app downloads.
          </p>
        </div>
      </section>
    </main>
  );
}