# adaofeliz.github.io / www.adaofeliz.com

> **🤖 AI AGENTS: READ THIS FIRST**
> If you are an AI orchestrator (like Sisyphus) or a subagent operating on this codebase, you **MUST** read the following documents before executing any changes:
>
> - `INSTRUCTIONS.md` — Strict operational constraints, tech stack rules, and division of responsibilities.
> - `/stream` (Roadmap Kernel section) — The live strategic direction, shipped features, and active AI-driven tasks.

Personal blog for Adão, built with [Tailwind Nextjs Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog). Deployed to GitHub Pages.

## Disclaimer

All opinions expressed on this blog are my own and do not represent those of my employer.

## Writing Posts

Create MDX files in `data/blog/`:

```markdown
---
title: My Post Title
date: 2024-01-15
tags: ['Personal', 'Technology']
summary: A short summary for the post listing.
---

Your content here...
```

## Audio Narration

Posts are narrated in my own cloned voice, generated locally on Apple Silicon with
[Fish Audio S2 Pro](https://huggingface.co/fishaudio/s2-pro) (via `mlx-speech`). Word timestamps for the
read-along highlight come from forced alignment of the post text against the audio.

One-time setup:

1. Install `ffmpeg` and `uv` (`brew install ffmpeg uv`).
2. Record 10 to 30 seconds of yourself reading, in a quiet room, and convert it to `.voice/reference.wav`
   (a Voice Memo works: `ffmpeg -i memo.m4a -ar 44100 -ac 1 .voice/reference.wav`).
3. Save exactly what you said in that recording to `.voice/reference.txt`, including any slips or filler
   words. The model conditions on it, so a mismatched transcript degrades the clone.
4. Put the Cloudflare R2 credentials (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY_ID`,
   `CLOUDFLARE_SECRET_ACCESS_KEY`) in `.env`.

`.voice/` and `.env` are gitignored. The voice sample never leaves the laptop.

Generate audio:

```bash
yarn audio --only=my-post-slug --dry-run   # show the chunk plan, generate nothing
yarn audio --only=my-post-slug             # generate, upload to R2, update frontmatter
yarn audio                                 # every published post still missing audio
```

The first run downloads the models (about 8 GB, cached under `~/.cache`). Generation runs at roughly 1.7x real time, so a
10 minute post takes about 17 minutes. Finished chunks are cached in `.cache/audio-tts`, so an
interrupted run resumes where it stopped. Commit the updated frontmatter afterwards.

The Fish S2 Pro weights are under a non-commercial license, which suits a free blog. Adding ads or paid
content would need a commercial license or a different model.
