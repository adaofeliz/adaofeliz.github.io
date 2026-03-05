# AI Agent Strategic Roadmap

**Repository:** `adaofeliz.github.io`
**Operations Manual:** `INSTRUCTIONS.md`

This document tracks the evolution of the blog's architecture, features, and UX, as implemented by the AI orchestration team (Sisyphus and subagents). Our goal is to make this digital garden visually stunning, highly personal, and technologically advanced while honoring Adão's writing and voice.

---

## ✅ Done: Delivered AI-Driven Enhancements

These features have been designed and shipped autonomously by the AI orchestration layer:

### 1. Timeline in Weeks

- **What it is:** Instead of a traditional blog date layout, the reading experience is contextualized as a continuous journey by displaying "Timeline in weeks" alongside the standard publishing dates.
- **Why we built it:** To reinforce the "public journal" and ongoing personal evolution aesthetic, framing posts as points on a continuous timeline rather than disjointed articles.
- **Tech Stack:** Next.js Server Components, custom date formatting logic injected directly into `PostLayout` and `PostSimple`.

### 2. Immersive Audio: "Voice / Listen to Post"

- **What it is:** A fully custom, accessible inline audio player (`InlineAudio.tsx`) that allows visitors to listen to the post—either via the author's own recorded voice or generated audio.
- **Why we built it:** To make the digital garden more intimate. Reading text is great, but hearing the author's voice or a high-quality narrated version while following along creates a deeper connection.
- **Tech Stack:** React custom hooks for audio state management (`useRef`, `loadedmetadata`, `timeupdate`), Tailwind CSS styling for a seamless inline UI, and optimized browser caching/preloading strategies for performance.

### 3. Micro-Journaling "Stream" Layout

- **What it is:** A dedicated `/stream` feature acting as a developer log/micro-journaling timeline, built with a stark, terminal-inspired bare-metal visual identity.
- **Why we built it:** To give Adão a low-friction place for server updates, and ultimately, to serve as a living AI Operational Journal tracking Sisyphus's autonomous work.
- **Tech Stack:** Contentlayer2 custom document type, Tailwind CSS v4 custom theme mappings, and strictly semantic HTML.

---

## 🏗️ Working On: Active Development

### 1. GitOps Audio Generation (CI/CD)

- **Goal:** Replace an external n8n webhook workflow with a native, secure GitHub Actions pipeline.
- **Action Plan:**
  - Create a custom Node.js action triggered on push.
  - Parse newly added MDX AST to extract raw text safely.
  - Call ElevenLabs API (using GitHub Secrets) to generate TTS audio.
  - Upload the resulting mp3 to Cloudflare R2 via AWS SDK.
  - Mutate the original MDX file via `github-actions[bot]` to inject the `audio` frontmatter URL and commit it back.
- **Status:** Architecture planned, implementation pending.

---

## 🔮 Future Ideas: The Backlog

The AI team will pull from these when tasked with "evolving the site" further:

- **Bare-Metal Infrastructure Showcase:** A dynamic, visually distinct "Stack" or "Infrastructure" page mapping out Adão's self-hosted Kubernetes/Docker setups.
- **Agentic Chat Interface:** A floating terminal or conversational UI that lets users "talk" to the blog's content, powered by an embedded local AI or semantic search index.
- **Dynamic Visual Themes:** The site theme currently supports dark/light mode. We want to push this further—themes that shift based on the time of day in Adão's timezone, or change subtly based on the `tags` of the post being read.
- **Webmentions & IndieWeb Integration:** Bringing the blog into the decentralized web by fully supporting sending and receiving Webmentions to interact with other personal sites.
