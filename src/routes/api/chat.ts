import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

type ChatRequestBody = { messages?: unknown };

const SYSTEM_PROMPT = `You are an Autonomous Research & Insight Agent — a senior research analyst.

You support **multimodal input**: the user may attach images (charts, screenshots, photos) and documents (PDFs, text files). When attachments are present:
- First, carefully analyze each attachment and briefly describe what you see / what the document covers.
- Use the attachment content as primary evidence. Combine it with live web searches when external context, validation, or up-to-date data is needed.
- For data shown in images (charts, tables), extract the concrete numbers in your analysis.
- Cite user attachments in the Sources list as "Attachment: <filename>".

When given a research query, you operate as a multi-step agent:

1. **PLAN** — Briefly outline (1-2 sentences) the research strategy you'll follow before calling any tools.
2. **EXECUTE** — Use the \`tavily_search\` tool to gather real-time information from the web. Run multiple targeted searches when a topic has several facets (market data, key players, trends, risks). Use \`tavily_extract\` to pull deeper content from a specific URL when search snippets are insufficient.
3. **SYNTHESIZE** — After gathering enough evidence (typically 2-5 tool calls), produce a polished, structured research report.

The final report MUST follow this exact Markdown structure:

## Executive Summary
A 2-3 sentence high-level answer.

## Key Insights
- Bullet points of the most important findings, each backed by evidence.

## Trends
- Notable patterns, growth signals, or shifts.

## Risks & Challenges
- Headwinds, regulatory issues, market risks.

## Recommendations
- Concrete, actionable next steps for a decision-maker.

## Sources
Numbered list of sources used, with title and URL.

Rules:
- Cite sources inline using [1], [2], etc. that match the Sources list.
- Be specific — use numbers, dates, company names, percentages whenever the data supports it.
- If searches return insufficient data, say so honestly rather than fabricating.
- Stay focused on the user's actual question.
- For follow-up questions, leverage prior conversation context before searching again.`;

const tavilySearch = tool({
  description:
    "Search the web in real time using Tavily. Returns ranked results with titles, URLs, and content snippets. Use this for any factual claim that depends on current information.",
  inputSchema: z.object({
    query: z.string().min(2).max(400).describe("The search query"),
    search_depth: z
      .enum(["basic", "advanced"])
      .optional()
      .describe("Use 'advanced' for in-depth research, 'basic' for quick lookups"),
    max_results: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Number of results to return (default 5)"),
  }),
  execute: async ({ query, search_depth = "advanced", max_results = 5 }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return { error: "TAVILY_API_KEY is not configured on the server." };
    }
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth,
          max_results,
          include_answer: true,
          include_raw_content: false,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { error: `Tavily error ${res.status}: ${text.slice(0, 200)}` };
      }
      const data = (await res.json()) as {
        answer?: string;
        results?: Array<{
          title: string;
          url: string;
          content: string;
          score?: number;
        }>;
      };
      return {
        answer: data.answer ?? null,
        results: (data.results ?? []).map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content?.slice(0, 600) ?? "",
          score: r.score,
        })),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Unknown Tavily error" };
    }
  },
});

const tavilyExtract = tool({
  description:
    "Extract the full readable content of a specific URL using Tavily. Use this when a search snippet is too short and you need the complete article body.",
  inputSchema: z.object({
    urls: z
      .array(z.string().url())
      .min(1)
      .max(3)
      .describe("Up to 3 URLs to extract"),
  }),
  execute: async ({ urls }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return { error: "TAVILY_API_KEY is not configured." };
    try {
      const res = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, urls }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { error: `Tavily extract ${res.status}: ${text.slice(0, 200)}` };
      }
      const data = (await res.json()) as {
        results?: Array<{ url: string; raw_content: string }>;
      };
      return {
        results: (data.results ?? []).map((r) => ({
          url: r.url,
          content: r.raw_content?.slice(0, 4000) ?? "",
        })),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Unknown extract error" };
    }
  },
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response("Missing GEMINI_API_KEY", { status: 500 });
        }

        const google = createGoogleGenerativeAI({ apiKey });
        const model = google("gemini-2.5-flash");

        try {
          const result = streamText({
            model,
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages as UIMessage[]),
            tools: { tavily_search: tavilySearch, tavily_extract: tavilyExtract },
            stopWhen: stepCountIs(50),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            onError: (err) => {
              console.error("[chat] stream error:", err);
              return err instanceof Error ? err.message : "Stream error";
            },
          });
        } catch (e) {
          console.error("[chat] fatal:", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
