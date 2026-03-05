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

---

## 🏗️ Working On: Active Development

### 1. Micro-Journaling "Stream" Layout

- **Goal:** Adão needs a low-friction way to post quick thoughts, bare-metal server updates, or daily notes without the overhead of a full long-form essay.
- **Action Plan:**
  - Create a new Contentlayer document type (`Note` or `Stream`).
  - Build a custom "Stream" page layout resembling a high-end timeline or terminal output.
  - Integrate it cleanly into the main site navigation without cluttering the deep-dive articles.
- **Status:** Shipped (Adão loved the terminal aesthetics and timeline visualization! It perfectly captures the bare-metal vibe).

---

## 🔮 Future Ideas: The Backlog

The AI team will pull from these when tasked with "evolving the site" further:

- **Bare-Metal Infrastructure Showcase:** A dynamic, visually distinct "Stack" or "Infrastructure" page mapping out Adão's self-hosted Kubernetes/Docker setups.
- **Agentic Chat Interface:** A floating terminal or conversational UI that lets users "talk" to the blog's content, powered by an embedded local AI or semantic search index.
- **Dynamic Visual Themes:** The site theme currently supports dark/light mode. We want to push this further—themes that shift based on the time of day in Adão's timezone, or change subtly based on the `tags` of the post being read.
- **Webmentions & IndieWeb Integration:** Bringing the blog into the decentralized web by fully supporting sending and receiving Webmentions to interact with other personal sites.
- **GitOps Audio Generation (CI/CD):** Replace the external n8n webhook workflow with a native GitHub Actions pipeline. On new MDX push, automatically generate ElevenLabs TTS, upload to Cloudflare R2, and inject the `audio` frontmatter back into the repository without leaking secrets.
