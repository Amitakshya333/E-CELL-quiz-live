import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Menu,
  Home,
  LogOut,
  LayoutDashboard,
  Smartphone,
  PlusCircle,
  LogIn,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function QuizStageMark() {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5 shrink-0 whitespace-nowrap min-w-0">
      <img
        src="/ecell-logo.png"
        alt="E-Cell SUIIT Logo"
        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg object-contain bg-white p-0.5 border border-border shadow-sm transition-transform group-hover:scale-105"
      />
      <div className="flex flex-col min-w-0">
        <span className="font-display text-base sm:text-lg font-black uppercase tracking-tight leading-none truncate">
          E-Cell Quiz<span className="text-brand">.</span>
        </span>
        <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-semibold truncate">
          SUIIT Campus
        </span>
      </div>
    </Link>
  );
}

export function AppHeader({ onSignOut }: { onSignOut?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-40 w-full max-w-full overflow-x-hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <QuizStageMark />

        {/* Desktop Navigation Links */}
        <div className="hidden sm:flex items-center gap-2">
          <Link to="/join">
            <Button variant="ghost" size="sm" className="text-xs px-3 touch-press">
              <Smartphone className="h-3.5 w-3.5 mr-1.5 text-brand" />
              <span>Join Room</span>
            </Button>
          </Link>

          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs px-3 touch-press">
              <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
              <span>Dashboard</span>
            </Button>
          </Link>

          {onSignOut ? (
            <Button variant="outline" size="sm" className="text-xs px-3 touch-press" onClick={onSignOut}>
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              <span>Sign Out</span>
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="text-xs font-semibold px-3 touch-press">
                <span>Host Sign In</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Navigation Drawer Trigger */}
        <div className="flex sm:hidden items-center gap-2">
          <Link to="/join">
            <Button size="sm" variant="outline" className="h-9 px-2.5 text-xs font-bold text-brand border-brand/40 touch-press">
              <Smartphone className="h-3.5 w-3.5 mr-1" />
              Join
            </Button>
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 touch-press" aria-label="Open Navigation Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-5 flex flex-col justify-between">
              <div>
                <SheetHeader className="text-left pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/ecell-logo.png"
                      alt="E-Cell SUIIT Logo"
                      className="h-8 w-8 rounded-lg object-contain bg-white p-0.5 border border-border shadow-sm"
                    />
                    <div>
                      <SheetTitle className="font-display text-base font-black uppercase tracking-tight leading-none">
                        E-Cell Quiz<span className="text-brand">.</span>
                      </SheetTitle>
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mt-0.5">
                        SUIIT Campus
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                <nav className="mt-6 flex flex-col gap-2">
                  <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-foreground hover:bg-muted touch-press transition-colors"
                  >
                    <Home className="h-4 w-4 text-brand" />
                    Home
                  </Link>

                  <Link
                    to="/join"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-foreground hover:bg-muted touch-press transition-colors"
                  >
                    <Smartphone className="h-4 w-4 text-brand" />
                    Join Live Room
                  </Link>

                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-foreground hover:bg-muted touch-press transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-brand" />
                    Host Dashboard
                  </Link>

                  <Link
                    to="/quizzes/new"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-brand hover:bg-brand/10 touch-press transition-colors"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Upload New Deck
                  </Link>
                </nav>
              </div>

              <div className="border-t border-border pt-4">
                {onSignOut ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs font-bold text-destructive hover:text-destructive touch-press"
                    onClick={() => {
                      setOpen(false);
                      onSignOut();
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    <Button className="w-full justify-start text-xs font-bold touch-press">
                      <LogIn className="h-4 w-4 mr-2" />
                      Host Sign In
                    </Button>
                  </Link>
                )}

                <p className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  <Shield className="h-3 w-3 text-brand" />
                  E-CELL SUIIT
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}