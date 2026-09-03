import { Link } from "@tanstack/react-router";
import { Clapperboard, LogOut, LayoutDashboard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuizStageMark() {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5">
      <img
        src="/ecell-logo.png"
        alt="E-Cell SUIIT Logo"
        className="h-9 w-9 rounded-lg object-contain bg-white p-0.5 border border-border shadow-sm transition-transform group-hover:scale-105"
      />
      <div className="flex flex-col">
        <span className="font-display text-lg font-black uppercase tracking-tight leading-none">
          E-Cell Quiz<span className="text-brand">.</span>
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          SUIIT Campus
        </span>
      </div>
    </Link>
  );
}

export function AppHeader({ onSignOut }: { onSignOut?: () => void }) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <QuizStageMark />
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link to="/join">
            <Button variant="ghost" size="sm" className="text-xs px-2 sm:px-3 touch-press">
              <Smartphone className="h-3.5 w-3.5 sm:mr-1.5 text-brand" />
              <span className="hidden xs:inline sm:inline">Join Room</span>
              <span className="xs:hidden sm:hidden">Join</span>
            </Button>
          </Link>

          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs px-2 sm:px-3 touch-press">
              <LayoutDashboard className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden xs:inline sm:inline">Dashboard</span>
              <span className="xs:hidden sm:hidden">Host</span>
            </Button>
          </Link>

          {onSignOut ? (
            <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3 touch-press" onClick={onSignOut}>
              <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="text-xs font-semibold px-2 sm:px-3 touch-press">
                <span className="hidden sm:inline">Host Sign In</span>
                <span className="sm:hidden">Sign In</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}