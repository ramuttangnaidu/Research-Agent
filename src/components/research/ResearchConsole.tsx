import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage, type ToolUIPart, isToolUIPart } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Square, Sparkles, Loader2 } from "lucide-react";
import { ToolCallView } from "./ToolCallView";
import type { ResearchSession } from "@/lib/research-storage";

type Props = {
  session: ResearchSession;
  onMessagesChange: (messages: UIMessage[], firstUserText?: string) => void;
};

const SUGGESTIONS = [
  "Analyze the impact of AI on healthcare startups in India",
  "Electric vehicle market trends and investment outlook for 2025",
  "Compare leading vector databases for RAG applications",
  "TAM for HR software in North America with growth drivers",
];

function MessageText({ text }: { text: string }) {
  return (
    <div className="research-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

export function ResearchConsole({ session, onMessagesChange }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedRef = useRef<number>(0);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: session.id,
    messages: session.messages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // Persist messages whenever they change & stream completes / pauses
  useEffect(() => {
    if (messages.length === 0) return;
    if (status === "streaming" || status === "submitted") {
      // Throttle saves during streaming
      const now = Date.now();
      if (now - lastSavedRef.current < 1500) return;
      lastSavedRef.current = now;
    }
    const firstUser = messages.find((m) => m.role === "user");
    const firstText =
      firstUser?.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join(" ")
        .trim() || undefined;
    onMessagesChange(messages, firstText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status]);

  // Focus on session change & stream end
  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status, session.id]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [session.id]);

  const isBusy = status === "submitted" || status === "streaming";

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isBusy) return;
    sendMessage({ text: value });
    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0 relative">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-background/60 backdrop-blur-md">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Session
          </div>
          <div className="text-sm font-medium truncate text-foreground">
            {session.title}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Agent online
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
          {messages.length === 0 ? (
            <EmptyState onPick={(s) => handleSend(s)} />
          ) : (
            <div className="space-y-8">
              {messages.map((m) => (
                <MessageBlock key={m.id} message={m} />
              ))}
              {status === "submitted" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>Planning research strategy…</span>
                </div>
              )}
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm p-3">
                  {error.message || "Something went wrong contacting the agent."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background/80 backdrop-blur-md px-4 md:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative rounded-xl border border-border bg-surface focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-card"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything — e.g. ‘Quarterly review of the AI agent infrastructure market’"
              rows={2}
              autoFocus
              className="w-full resize-none bg-transparent px-4 pt-3.5 pb-12 text-sm placeholder:text-muted-foreground focus:outline-none text-foreground max-h-48"
            />
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                <kbd className="font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">
                  Enter
                </kbd>{" "}
                to send · <kbd className="font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">
                  Shift+Enter
                </kbd>{" "}
                newline
              </span>
              {isBusy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="flex items-center justify-center h-8 w-8 rounded-md bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
                  aria-label="Stop"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-primary-foreground hover:bg-primary-glow disabled:opacity-30 disabled:cursor-not-allowed transition-colors glow"
                  aria-label="Send"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("\n")
      .trim();
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-card">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        <span>Insight Agent</span>
      </div>
      <div className="space-y-2">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return <MessageText key={i} text={part.text} />;
          }
          if (isToolUIPart(part)) {
            return <ToolCallView key={i} part={part as ToolUIPart} />;
          }
          if (part.type === "reasoning") {
            return (
              <div
                key={i}
                className="text-xs text-muted-foreground italic border-l-2 border-border pl-3"
              >
                {("text" in part ? (part.text as string) : "") || ""}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="py-10 md:py-16">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] uppercase tracking-widest mb-5">
          <Sparkles className="h-3 w-3" />
          Autonomous research agent
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-gradient mb-3">
          What do you want to understand?
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
          Ask a complex question. The agent will plan, search the live web with Tavily,
          synthesize findings with Gemini, and return a structured insight report.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left p-4 rounded-lg border border-border bg-surface/60 hover:border-primary/40 hover:bg-surface-elevated transition-all group"
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Prompt idea
            </div>
            <div className="text-sm text-foreground group-hover:text-primary transition-colors">
              {s}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
