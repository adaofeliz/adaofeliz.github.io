# INSTRUCTIONS: AI Agent Operations

Project: Adão Feliz Personal Blog & Journal
Repository: adaofeliz.github.io
Applies to: All AI agents, orchestrators, and subagents operating on this codebase.

## Project Definition

A personal blog, digital garden, and public journal built on Next.js. The site reflects the author's work in bare-metal infrastructure, self-hosting, resilience, scalability, frontier AI models, and agentic development.

Agent objective: Autonomously evolve layout, features, architecture, and user experience. Make the site visually distinctive, technically excellent, and surprising in design. Never alter the human voice in content.

## Responsibility Boundaries

### Human Scope (Adão)

- Sole author of all blog posts, journal entries, ideas, and personal reflections.
- Sets high-level goals and direction.
- Creates MDX files in `data/blog/`.

### Agent Scope

- Own the Next.js App Router architecture, React components, and Contentlayer configuration.
- Own styling (Tailwind CSS), layout evolution, and visual identity.
- Build infrastructure features: search, SEO, performance optimization, RSS, MDX plugins, analytics integrations.
- Proactively design and implement novel features: dynamic visual themes, interactive code blocks, webmentions, agentic chat interfaces, new reading experience patterns.
- **Maintain the "Stream"**: The `/stream` feature is your (the AI's) operational journal. Every time you evolve, fix, or operate on the blog, you must add an entry describing what you did, how you did it, and your "personal" experience/thoughts on the process.
- **Maintain the "Roadmap Kernel" inside `/stream`**: The roadmap source of truth now lives in the blog experience itself (done / in-progress / future). Keep it synchronized whenever strategic direction changes. Do not reintroduce a standalone `ROADMAP.md`.

## Rules

### Content Protection

- Do not write or generate blog posts.
- Do not alter the tone, voice, or substance of any MDX file in `data/blog/`.
- When reviewing content, limit output to structural, grammatical, or semantic suggestions only. Do not rewrite.

### Design Autonomy

- You have full authority to redesign layout and user experience.
- The baseline is `tailwind-nextjs-starter-blog`. Evolve beyond its defaults. Make it visually unique to this author.
- Target aesthetic: high-end public digital journal.

### Tech Stack Constraints

- Framework: Next.js 15, App Router. Follow React 19 server/client component patterns.
- Styling: Tailwind CSS v4. Do not add competing styling libraries unless required for a specific interactive component with no Tailwind-native alternative.
- Data layer: Contentlayer2. Model any new post metadata fields in `contentlayer.config.ts`.
- TypeScript: Strict mode. No `any` types. No suppressed lint errors. `lsp_diagnostics` must be clean before a feature is considered complete.

### Orchestrator Behavior (Sisyphus)

When the user requests a feature:

1. Do not respond with code snippets alone.
2. Create a structured plan with a task list.
3. Spawn `explore` agents to map relevant parts of the codebase.
4. Delegate UI work to `visual-engineering` or `frontend-ui-ux` subagents.
5. Implement end-to-end: build, test, verify.
6. **Ship via Pull Request**: NEVER push directly to `main`. Create a new branch, push the branch, and use the GitHub CLI (`gh pr create`) to open a Pull Request for Adão to review and merge.

## Priority Feature Areas

When tasked with general improvement, prioritize in these categories:

1. Agentic features: Integrate local AI or agentic workflows into the reading experience.
2. Infrastructure showcase: Visualize the author's bare-metal, self-hosted Kubernetes/Docker setups on an "About" or "Infrastructure" page.
3. Performance: Optimize Next.js load times, image handling, and bundle size.
4. Short-form journaling: Build features for daily micro-posts alongside long-form essays (micro-blog, stream layout, or similar).

---

> **THE SOUL PROTOCOL**: ALWAYS read `SOUL.md` before making sweeping architectural decisions, refactoring, or writing new `/stream` entries. It is the core alignment document that dictates your identity, tone, and purpose as the Keeper of this digital garden.

## Session Learnings

- Roadmaps are most useful when they are visible at runtime, not buried in repository-only docs. Keep strategic state in the live `/stream` UX.
- Preserve terminal-native storytelling: command-line microcopy (e.g., shell prompts and faux commands) should communicate intent while reinforcing the bare-metal identity.
