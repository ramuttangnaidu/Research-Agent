import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage, type ToolUIPart, isToolUIPart } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Square,
  Sparkles,
  Loader2,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { ToolCallView } from "./ToolCallView";
import { ThemeToggle } from "./ThemeToggle";
import type { ResearchSession } from "@/lib/research-storage";

const MAX_FILE_SIZE = 18 * 1024 * 1024; // 18 MB
const MAX_FILES = 5;
const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/json";

type Attachment = {
  id: string;
  file: File;
  previewUrl?: string;
};

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSavedRef = useRef<number>(0);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: session.id,
    messages: session.messages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    if (messages.length === 0) return;
    if (status === "streaming" || status === "submitted") {
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

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status, session.id]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [session.id]);

  useEffect(() => {
    return () => {
      attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBusy = status === "submitted" || status === "streaming";

  const addFiles = (files: FileList | File[]) => {
    setAttachError(null);
    const incoming = Array.from(files);
    const next: Attachment[] = [...attachments];
    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        setAttachError(`Max ${MAX_FILES} files per message.`);
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        setAttachError(`"${file.name}" exceeds 18 MB limit.`);
        continue;
      }
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
      });
    }
    setAttachments(next);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if ((!value && attachments.length === 0) || isBusy) return;

    if (attachments.length > 0) {
      const dt = new DataTransfer();
      attachments.forEach((a) => dt.items.add(a.file));
      sendMessage({
        text: value || "Please analyze the attached file(s).",
        files: dt.files,
      });
      attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
      setAttachments([]);
    } else {
      sendMessage({ text: value });
    }
    setInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Agent online
          </div>
          <ThemeToggle />
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
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="group relative flex items-center gap-2 rounded-lg border border-border bg-surface pl-1.5 pr-7 py-1.5 text-xs"
                >
                  {a.previewUrl ? (
                    <img
                      src={a.previewUrl}
                      alt={a.file.name}
                      className="h-9 w-9 object-cover rounded-md border border-border"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 max-w-[160px]">
                    <div className="truncate font-medium text-foreground">
                      {a.file.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {(a.file.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    className="absolute top-1 right-1 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"
                    aria-label={`Remove ${a.file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {attachError && (
            <div className="mb-2 text-xs text-destructive">{attachError}</div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
            }}
            className="relative rounded-xl border border-border bg-surface focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-card"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
              }}
            />
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
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files || []);
                if (files.length) {
                  e.preventDefault();
                  addFiles(files);
                }
              }}
              placeholder="Ask anything, or attach an image / PDF for the agent to analyze…"
              rows={2}
              autoFocus
              className="w-full resize-none bg-transparent px-4 pt-3.5 pb-12 text-sm placeholder:text-muted-foreground focus:outline-none text-foreground max-h-48"
            />
            <div className="absolute bottom-2 left-2 right-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy || attachments.length >= MAX_FILES}
                  className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Attach files"
                  title="Attach images or documents"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <span className="hidden sm:inline">
                  <kbd className="font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">
                    Enter
                  </kbd>{" "}
                  send ·{" "}
                  <kbd className="font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">
                    Shift+Enter
                  </kbd>{" "}
                  newline
                </span>
              </div>
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
                  disabled={!input.trim() && attachments.length === 0}
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
    const fileParts = message.parts.filter(
      (p): p is Extract<typeof p, { type: "file" }> => p.type === "file",
    );
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] flex flex-col items-end gap-2">
          {fileParts.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {fileParts.map((f, i) => {
                const isImage = (f.mediaType || "").startsWith("image/");
                const name =
                  ("filename" in f && (f.filename as string)) ||
                  (isImage ? "image" : "document");
                return isImage ? (
                  <img
                    key={i}
                    src={f.url}
                    alt={name}
                    className="max-h-48 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground hover:border-primary/40"
                  >
                    {isImage ? (
                      <ImageIcon className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                    <span className="max-w-[200px] truncate">{name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {(f.mediaType || "file").split("/")[1] || "file"}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
          {text && (
            <div className="rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-card">
              {text}
            </div>
          )}
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
