import { Link } from "@tanstack/react-router";
import { Clapperboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuizStageMark() {
  return <Link to="/" className="group inline-flex items-center gap-3"><span className="grid h-9 w-9 place-items-center bg-brand text-brand-foreground transition-transform group-hover:rotate-3"><Clapperboard className="h-5 w-5" /></span><span className="font-display text-lg font-black uppercase tracking-tight">QuizStage<span className="text-brand">.</span></span></Link>;
}

export function AppHeader({ onSignOut }: { onSignOut?: () => void }) {
  return <header className="border-b border-border bg-background"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><QuizStageMark /><div className="flex items-center gap-2"><Link to="/join"><Button variant="ghost" size="sm">Join room</Button></Link>{onSignOut ? <Button variant="outline" size="sm" onClick={onSignOut}><LogOut /> Sign out</Button> : <Link to="/auth"><Button variant="outline" size="sm">Host sign in</Button></Link>}</div></div></header>;
}