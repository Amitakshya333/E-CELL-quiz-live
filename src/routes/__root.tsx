import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">QuizStage</p><h1 className="mt-4 font-display text-7xl font-black text-foreground">404</h1><p className="mt-4 text-muted-foreground">That page is off the deck.</p><Link to="/" className="mt-6 inline-block"><Button>Go home</Button></Link></div></div>;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">QuizStage</p><h1 className="mt-4 font-display text-3xl font-black uppercase">The room glitched.</h1><p className="mt-3 text-muted-foreground">Try refreshing or head back to the home screen.</p><div className="mt-7 flex justify-center gap-2"><Button onClick={() => { router.invalidate(); reset(); }}>Try again</Button><Link to="/"><Button variant="outline">Go home</Button></Link></div></div></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#0f172a" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "format-detection", content: "telephone=no" },
      { title: "E-Cell Quiz — Live Interactive Presentation Platform" },
      { name: "description", content: "Live, projector-first interactive quizzes by E-Cell SUIIT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/ecell-logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/ecell-logo.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth w-full max-w-full overflow-x-hidden">
      <head>
        <HeadContent />
      </head>
      <body className="w-full max-w-full overflow-x-hidden min-h-screen bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
function RootComponent() { const { queryClient } = Route.useRouteContext(); return <QueryClientProvider client={queryClient}><Toaster position="top-right" /><Outlet /></QueryClientProvider>; }