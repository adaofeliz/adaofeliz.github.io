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

Posts are narrated with [Fish Audio S2 Pro](https://huggingface.co/fishaudio/s2-pro), generated locally on
Apple Silicon (via `mlx-speech`) by cloning a short voice reference. Word timestamps for the read-along
highlight come from forced alignment of the post text against the audio. Output is uploaded to Cloudflare
R2 (`https://audio.adaofeliz.com/<slug>.mp3` and `<slug>-timestamps.json`) and linked from the post's
`audio` and `audioTimestamps` frontmatter.

### Requirements

- An Apple Silicon Mac. The model does not run in CI.
- `ffmpeg` and `uv` (`brew install ffmpeg uv`).
- `.env` with `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY_ID` and `CLOUDFLARE_SECRET_ACCESS_KEY` (R2
  read/write).
- `.voice/reference.wav` (10 to 30 s of clean speech) and `.voice/reference.txt` (its exact transcript).

`.env` and `.voice/` are gitignored. Never commit them.

The current voice reference is a 16 s excerpt of the existing narration of `when-the-why-breaks`, so new
posts match the rest of the blog. If `.voice/` is missing, recreate it from the repo root:

```bash
mkdir -p .voice
curl -sfo /tmp/ref.mp3 https://audio.adaofeliz.com/when-the-why-breaks.mp3
ffmpeg -y -ss 15.06 -to 31.02 -i /tmp/ref.mp3 -ar 44100 -ac 1 .voice/reference.wav
echo "Sometimes it was raining. Sometimes it was still dark when I closed the door behind me. Most of it alone. I did not push that hard because someone told me to. There was no coach standing behind me. There was no contract that said I had to be on the road at that hour. It was something quieter than that." > .voice/reference.txt
```

To switch to a different voice, replace both files: record yourself in a quiet room, convert with
`ffmpeg -i memo.m4a -ar 44100 -ac 1 .voice/reference.wav`, and put exactly what was said, slips included,
in `.voice/reference.txt`.

### Generating audio for a new post (runbook for agents)

Run everything from the repo root.

1. **Check the post.** It must exist at `data/blog/<slug>.mdx`, must not be `draft: true`, and must not
   already have an `audio` field (posts with audio are skipped unless `--force` is passed).
2. **Check the setup.** `.env` and both `.voice/` files exist (see above).
3. **Dry run** to see the chunk plan without generating anything:
   ```bash
   yarn audio --only=<slug> --dry-run
   ```
4. **Generate and upload.** This synthesizes every chunk, uploads the MP3 and timestamps to R2 and writes
   `audio` and `audioTimestamps` into the post's frontmatter:
   ```bash
   yarn audio --only=<slug>
   ```
   Expect roughly 2 minutes of compute per minute of narration (a 4.5 min post took about 8 min). Run it
   in the background rather than with a short command timeout. The first run on a machine also downloads
   about 8 GB of models into `~/.cache`. Finished chunks are cached in `.cache/audio-tts`, so if a run dies,
   rerunning the same command resumes without regenerating them.
5. **Verify.** The log should end with `Successfully processed ...` and `1 post(s) updated.` Then confirm
   both URLs respond:
   ```bash
   curl -sfI https://audio.adaofeliz.com/<slug>.mp3 | head -1
   curl -sf https://audio.adaofeliz.com/<slug>-timestamps.json | head -c 200
   ```
   `git diff data/blog/<slug>.mdx` should show only the two new frontmatter lines, plus possibly the
   `summary` re-wrapped by the YAML writer (expected, no wording changes).
6. **Commit and push only the post file**, which triggers CI and the GitHub Pages deploy:
   ```bash
   git add data/blog/<slug>.mdx
   git commit -m "chore(audio): add narration for <Post Title>"
   git push origin main
   ```
7. **Confirm it is live** once the `GitHub Pages` workflow succeeds (`gh run list --limit 3`):
   ```bash
   curl -sL https://www.adaofeliz.com/blog/<slug>/ | grep -o 'audio.adaofeliz.com/<slug>[^"\\]*' | sort -u
   ```

Other commands:

```bash
yarn audio                                    # every published post still missing audio
yarn audio --only=<slug> --force              # regenerate a post that already has audio
node scripts/normalize-existing-audio.mjs     # repair loudness of published files (also a manual CI workflow)
```

### Troubleshooting

- `Voice reference not found`: `.voice/` is missing. Recreate it as above.
- `R2 credentials missing`: `.env` is missing or incomplete.
- Hugging Face `401`: the pipeline already sets `HF_HUB_DISABLE_IMPLICIT_TOKEN=1` because the model is
  public. If it still happens, run `hf auth logout` to clear an expired login.
- `Word timestamps do not match the post text`: a chunk boundary split a word. Check
  `scripts/lib/text-chunker.mjs` for an unusually long unbroken string in the post.

### License

The Fish S2 Pro weights are under a non-commercial license, which suits a free blog. Adding ads or paid
content would need a commercial license or a different model.
