import type { UIMessage } from "ai";

export type ResearchSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
};

const STORAGE_KEY = "research-sessions-v1";

export function loadSessions(): ResearchSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResearchSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ResearchSession[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // quota exceeded — ignore
  }
}

export function createSession(): ResearchSession {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  return {
    id,
    title: "New research",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function deriveTitle(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  return cleaned.length > 60 ? cleaned.slice(0, 57) + "…" : cleaned || "New research";
}
