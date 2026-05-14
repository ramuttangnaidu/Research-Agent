# Autonomous Research & Insight AgentX

> A production-grade agentic AI platform that **plans, searches the live web, reasons across sources, and synthesizes structured insight reports with citations** — built on Gemini, Tavily, and the Vercel AI SDK.

Not a chatbot. A research analyst that thinks in steps.

---
## 🌐 Live Demo

<div align="center">

### ⚡ Try it now — no sign-up required

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-insight--forge--ai-blueviolet?style=for-the-badge&logo=vercel&logoColor=white)](https://insight-forge-ai-45.lovable.app)
[![Status](https://img.shields.io/badge/Status-Live%20%26%20Active-brightgreen?style=for-the-badge)]()
[![Platform](https://img.shields.io/badge/Platform-Web-blue?style=for-the-badge&logo=googlechrome&logoColor=white)]()

<br/>

> 🔗 **Production URL:** [`https://insight-forge-ai-45.lovable.app`](https://insight-forge-ai-45.lovable.app)
>
> _Deployed and accessible globally — no installation, no configuration, just intelligence at your fingertips._

</div>



## ✨ Highlights

- **Agentic loop** — multi-step Plan → Execute → Synthesize orchestration with `streamText` + `stopWhen: stepCountIs(50)`
- **Real tool use** — live web search (`tavily_search`) and deep page extraction (`tavily_extract`)
- **Streaming UI** — token-by-token responses with live tool-call visualization, favicons, and expandable result cards
- **Structured reports** — Executive Summary · Key Insights · Trends · Risks · Recommendations · Citations
- **Persistent history** — sessions saved locally per browser, instantly resumable
- **Light & dark themes** — one-click toggle, persisted across sessions
- **Production-ready** — SSR via TanStack Start, edge-deployable on Cloudflare Workers
- **Beautiful, opinionated design** — midnight aurora aesthetic, Space Grotesk + Inter, custom tokenized design system

---

## 🧠 How the agent thinks

```text
        ┌──────────────────┐
        │  User question   │
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐    plan
        │     Planner      │────────────┐
        │  (Gemini 2.5)    │            │
        └────────┬─────────┘            │
                 ▼                      │
        ┌──────────────────┐  search    │
        │     Executor     │──────────► Tavily Search
        │  (tool calling)  │  extract   │
        │                  │──────────► Tavily Extract
        └────────┬─────────┘            │
                 ▼                      │
        ┌──────────────────┐ ◄──────────┘
        │   Synthesizer    │   findings + citations
        │  (Gemini 2.5)    │
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │ Structured report│
        │   + citations    │
        └──────────────────┘
```

Each step streams to the UI in real time so you can watch the agent work.

---

## 🏗 Architecture

| Layer | Technology |
|---|---|
| Framework | TanStack Start v1 (React 19, SSR) |
| Build | Vite 7 |
| Runtime | Cloudflare Workers (edge) |
| Styling | Tailwind CSS v4 + custom OKLCH design tokens |
| Agent | Vercel AI SDK (`streamText`, multi-step `tool` calling) |
| LLM | Google Gemini 2.5 Flash via `@ai-sdk/google` |
| Web search | Tavily API (`search` + `extract`) |
| Markdown | `react-markdown` + `remark-gfm` |
| State | `useChat` (AI SDK) + `localStorage` for history |

```
src/
├── routes/
│   ├── __root.tsx              # Root layout, SEO, providers
│   ├── index.tsx               # Research console page
│   └── api/
│       └── chat.ts             # Agent loop (server route)
├── components/
│   ├── research/
│   │   ├── ResearchConsole.tsx # Main UI (composer, stream, header)
│   │   ├── Sidebar.tsx         # Session history
│   │   ├── ToolCallView.tsx    # Live tool-call cards
│   │   └── ThemeToggle.tsx     # Light/dark switch
│   ├── ai-elements/            # Streaming primitives
│   └── ui/                     # shadcn primitives
├── hooks/
│   └── use-theme.tsx           # Theme persistence
├── lib/
│   └── research-storage.ts     # Session persistence
└── styles.css                  # Design tokens (light + dark)
```

---

## 🚀 Quick start

```bash
# 1. Install dependencies
bun install

# 2. Configure secrets (already wired in Lovable Cloud)
#    GEMINI_API_KEY=...
#    TAVILY_API_KEY=...

# 3. Run the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and ask something like:

> *"Analyze the impact of AI on healthcare startups in India"*

---

## 🔑 Environment variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini access (LLM) |
| `TAVILY_API_KEY` | Tavily web-search & extraction |

In Lovable, both are stored as encrypted secrets and injected at runtime — no `.env` file required.

---

## 🎨 Design system

- **Display font** — Space Grotesk
- **Body font** — Inter
- **Mono** — JetBrains Mono
- **Palette** — deep midnight surface with cyan-teal accent, fully tokenized in `src/styles.css`
- **Theme** — light & dark, toggled from the header, persisted in `localStorage`

All colors flow through semantic CSS variables (`--primary`, `--surface`, `--border`, …) so the entire UI re-themes instantly.

---

## 🧪 Try these prompts

- *"Compare leading vector databases for RAG applications"*
- *"Quarterly review of the AI agent infrastructure market"*
- *"Electric vehicle market trends and investment outlook for 2025"*
- *"TAM for HR software in North America with growth drivers"*

---

## 🚢 Deploy

This project is configured for **edge deployment on Cloudflare Workers** via `wrangler.jsonc`. In Lovable, click **Publish** to ship to a live URL with secrets injected automatically.

---

## 📄 License

MIT — build something great with it.
