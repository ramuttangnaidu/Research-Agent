import { Search, Globe, FileText, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { ToolUIPart } from "ai";

type SearchResult = { title: string; url: string; snippet: string; score?: number };
type SearchOutput = { answer?: string | null; results?: SearchResult[]; error?: string };
type ExtractOutput = { results?: Array<{ url: string; content: string }>; error?: string };

function favicon(url: string) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return null;
  }
}

function StatusIcon({ state }: { state: ToolUIPart["state"] }) {
  if (state === "output-error")
    return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
  if (state === "output-available")
    return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
  );
}

export function ToolCallView({ part }: { part: ToolUIPart }) {
  const [open, setOpen] = useState(false);
  const isSearch = part.type === "tool-tavily_search";
  const isExtract = part.type === "tool-tavily_extract";
  const Icon = isSearch ? Search : isExtract ? Globe : FileText;
  const label = isSearch ? "Searching the web" : isExtract ? "Extracting page" : "Tool";

  const input = part.input as { query?: string; urls?: string[] } | undefined;
  const output = part.output as SearchOutput | ExtractOutput | undefined;
  const errorText = part.state === "output-error" ? part.errorText : undefined;

  const summary =
    isSearch && input?.query
      ? input.query
      : isExtract && input?.urls
        ? `${input.urls.length} URL${input.urls.length > 1 ? "s" : ""}`
        : "…";

  const searchOut = isSearch ? (output as SearchOutput | undefined) : undefined;
  const extractOut = isExtract ? (output as ExtractOutput | undefined) : undefined;

  return (
    <div className="my-2 rounded-lg border border-border bg-surface/60 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-elevated/60 transition-colors text-left"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StatusIcon state={part.state} />
            <span className="font-medium text-foreground">{label}</span>
          </div>
          <div className="text-sm text-foreground/90 truncate font-mono">{summary}</div>
        </div>
        {searchOut?.results && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {searchOut.results.length} results
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-3 py-3 space-y-2">
          {errorText && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
              {errorText}
            </div>
          )}

          {searchOut?.error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
              {searchOut.error}
            </div>
          )}

          {searchOut?.answer && (
            <div className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
              {searchOut.answer}
            </div>
          )}

          {searchOut?.results && searchOut.results.length > 0 && (
            <ul className="space-y-1.5">
              {searchOut.results.map((r, i) => {
                const fav = favicon(r.url);
                return (
                  <li
                    key={r.url + i}
                    className="flex items-start gap-2 rounded-md p-2 hover:bg-surface-elevated/60 transition-colors"
                  >
                    {fav ? (
                      <img
                        src={fav}
                        alt=""
                        className="h-4 w-4 mt-0.5 rounded-sm flex-shrink-0"
                      />
                    ) : (
                      <Globe className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-foreground hover:text-primary block truncate font-medium"
                      >
                        {r.title || r.url}
                      </a>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {(() => {
                          try {
                            return new URL(r.url).hostname;
                          } catch {
                            return r.url;
                          }
                        })()}
                      </div>
                      {r.snippet && (
                        <p className="text-xs text-muted-foreground/90 mt-1 line-clamp-2">
                          {r.snippet}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {extractOut?.results && extractOut.results.length > 0 && (
            <ul className="space-y-2">
              {extractOut.results.map((r, i) => (
                <li key={i} className="text-xs">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate block font-medium"
                  >
                    {r.url}
                  </a>
                  <p className="text-muted-foreground line-clamp-3 mt-1">
                    {r.content.slice(0, 300)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {part.state === "input-streaming" && (
            <div className="text-xs text-muted-foreground italic">Preparing query…</div>
          )}
        </div>
      )}
    </div>
  );
}
