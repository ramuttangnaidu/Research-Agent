import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { UIMessage } from "ai";
import { Sidebar } from "@/components/research/Sidebar";
import { ResearchConsole } from "@/components/research/ResearchConsole";
import {
  createSession,
  deriveTitle,
  loadSessions,
  saveSessions,
  type ResearchSession,
} from "@/lib/research-storage";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once on client
  useEffect(() => {
    const existing = loadSessions();
    if (existing.length > 0) {
      const sorted = [...existing].sort((a, b) => b.updatedAt - a.updatedAt);
      setSessions(sorted);
      setActiveId(sorted[0].id);
    } else {
      const fresh = createSession();
      setSessions([fresh]);
      setActiveId(fresh.id);
      saveSessions([fresh]);
    }
    setHydrated(true);
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  const handleNew = () => {
    const fresh = createSession();
    const next = [fresh, ...sessions];
    setSessions(next);
    setActiveId(fresh.id);
    saveSessions(next);
  };

  const handleDelete = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    if (next.length === 0) {
      const fresh = createSession();
      setSessions([fresh]);
      setActiveId(fresh.id);
      saveSessions([fresh]);
      return;
    }
    setSessions(next);
    if (activeId === id) setActiveId(next[0].id);
    saveSessions(next);
  };

  const handleMessagesChange = (messages: UIMessage[], firstUserText?: string) => {
    setSessions((prev) => {
      const next = prev.map((s) => {
        if (s.id !== activeId) return s;
        const title =
          s.title === "New research" && firstUserText
            ? deriveTitle(firstUserText)
            : s.title;
        return { ...s, messages, title, updatedAt: Date.now() };
      });
      saveSessions(next);
      return next;
    });
  };

  if (!hydrated || !activeSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading research console…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
      />
      <ResearchConsole
        key={activeSession.id}
        session={activeSession}
        onMessagesChange={handleMessagesChange}
      />
    </div>
  );
}
