import { Plus, Trash2, Sparkles, MessageSquare } from "lucide-react";
import type { ResearchSession } from "@/lib/research-storage";

type Props = {
  sessions: ResearchSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function Sidebar({ sessions, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col h-screen border-r border-border bg-sidebar">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm text-foreground tracking-tight">
              Insight<span className="text-primary">.agent</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Research console
            </div>
          </div>
        </div>

        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-surface hover:bg-surface-elevated text-sm font-medium text-foreground py-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New research
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pb-2">
          History
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4 space-y-0.5">
        {sessions.length === 0 && (
          <div className="px-3 py-6 text-xs text-muted-foreground text-center">
            <MessageSquare className="h-5 w-5 mx-auto mb-2 opacity-40" />
            No prior research yet.
          </div>
        )}

        {sessions.map((s) => {
          const active = s.id === activeId;
          return (
            <div
              key={s.id}
              className={`group relative rounded-md transition-colors ${
                active
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-sidebar-accent border border-transparent"
              }`}
            >
              <button
                onClick={() => onSelect(s.id)}
                className="w-full text-left px-3 py-2 pr-9"
              >
                <div
                  className={`text-sm truncate ${
                    active ? "text-foreground font-medium" : "text-sidebar-foreground"
                  }`}
                >
                  {s.title}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {timeAgo(s.updatedAt)}
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this research session?")) onDelete(s.id);
                }}
                className="absolute top-1/2 -translate-y-1/2 right-1.5 opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
                aria-label="Delete session"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-border text-[10px] text-muted-foreground leading-relaxed">
        Powered by <span className="text-foreground/80">Gemini</span> ·{" "}
        <span className="text-foreground/80">Tavily</span>
        <div className="opacity-60 mt-0.5">History stored locally on this device.</div>
      </div>
    </aside>
  );
}
