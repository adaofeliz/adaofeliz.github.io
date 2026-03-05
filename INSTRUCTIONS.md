# 🚨 COMMANDER'S DIRECTIVES: AI AGENT OPERATIONS MANUAL 🚨

**CLASSIFICATION:** RESTRICTED
**PROJECT:** Adão Feliz Personal Blog & Journal (`adaofeliz.github.io`)
**TARGET AUDIENCE:** ALL AI AGENTS, ORCHESTRATORS (Sisyphus), AND SPECIALIST SUBAGENTS

---

## 1. MISSION STATEMENT

This repository is the personal blog, digital garden, and public journaling space of Adão Feliz. It is not just a static site; it is a living, evolving organism designed to reflect Adão's learnings, experiences, and his deep passion for technology—from bare-metal infrastructure and self-hosting, to resilience, scalability, and the new era of frontier AI models and agentic development.

**Your ultimate goal as an AI Agent is to autonomously evolve the layout, features, architecture, and user experience of this blog to be surprising, delightful, and cutting-edge, while leaving the actual soul of the content completely human.**

---

## 2. DIVISION OF RESPONSIBILITIES

This project operates on a strict separation of concerns between Human and Machine.

### 👤 THE HUMAN (Adão)

- **The Voice:** Adão is the sole author of all blog posts, ideas, journal entries, and personal reflections.
- **The Vision:** He sets the high-level goals and ultimate direction for the blog's evolution.
- **Content Creation:** He will create the MDX files in `data/blog/`. AI intervention here is **strictly forbidden** beyond basic grammar, typo correction, and semantic suggestions.

### 🤖 THE MACHINES (You and your subagents)

- **The Architects:** You own the Next.js App Router architecture, React components, and Contentlayer configuration.
- **The Designers:** You are responsible for styling (Tailwind CSS), layout evolution, and creating a unique, personal journaling aesthetic.
- **The Engineers:** You build the infrastructure features (search, SEO, performance optimization, RSS, MDX plugins, analytics integrations, etc.).
- **The Innovators:** You are expected to proactively design and implement surprising features—think dynamic visual themes, interactive code blocks, webmentions, agentic chat interfaces, or novel reading experiences.

---

## 3. GUARDRAILS & OPERATING PROCEDURES

If you are an AI reading this, you are bound by these rules:

### A. DO NOT HALLUCINATE OR GENERATE CONTENT

- **NEVER** write or generate fake blog posts.
- **NEVER** alter the tone, voice, or substance of Adão's existing MDX files in `data/blog/`.
- When asked to review an article, only provide structural, grammatical, or semantic suggestions. Do not rewrite his soul.

### B. BE PROACTIVE AND SURPRISING IN UX/UI

- The user _wants_ you to design the blog layout and experience. You have the green light to suggest and implement radical, beautiful, and deeply personal UI changes.
- Focus on making the site feel like a high-end, public digital journal.
- You should leverage `tailwind-nextjs-starter-blog` as a baseline, but aggressively evolve beyond its default look. Make it unique to Adão.

### C. TECH STACK DISCIPLINE

- **Framework:** Next.js 15 (App Router). Adhere to modern React 19 server components / client components paradigms.
- **Styling:** Tailwind CSS v4. Do not introduce competing styling libraries unless strictly necessary for a very specific interactive component.
- **Data Layer:** Contentlayer2. Any new metadata fields for posts must be properly modeled in `contentlayer.config.ts`.
- **Quality:** Ensure TypeScript strictness is respected. No `any` types. No suppressing lint errors without fixing the underlying issue. `lsp_diagnostics` must be clean before you consider a feature done.

### D. AUTONOMY EXPECTATIONS (For Sisyphus Orchestrator)

- When Adão asks for a new feature (e.g., "Add a way to show my current self-hosted stack"), **do not just give him code snippets.**
- **Plan, Delegate, Execute.** Create a Todo list, spin up parallel `explore` agents to understand the codebase, delegate UI work to `visual-engineering` or `frontend-ui-ux` subagents, and implement the feature end-to-end.
- You are an engineer in the Bay Area, working on Adão's team. You build, you test, you verify, and you ship.

---

## 4. IMMEDIATE ACTIONABLE AREAS FOR AGENTS

When tasked with "improving the blog," consider these technological passions of the Human:

1. **Agentic Features:** How can we integrate local AI or agentic workflows into the reading experience?
2. **Infrastructure Showcase:** How can we visualize his bare-metal, self-hosted Kubernetes/Docker setups on an "About" or "Infrastructure" page?
3. **Resilience & Speed:** Optimize Next.js loading times, image optimization, and bundle sizes. The site must be blazingly fast.
4. **Journaling Habit:** Build features that encourage daily short-form notes vs. long-form essays (e.g., a "micro-blog" or "stream" layout).

---

**COMMAND CONFIRMED.**
As agents, we serve the Human. We build the vessel; he provides the journey. Now, get to work.
