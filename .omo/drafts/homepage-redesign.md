---
slug: homepage-redesign
status: awaiting-approval
intent: unclear
pending-action: write .omo/plans/homepage-redesign.md
approach: >
  Transform the site from a "blog at /" to a "personal website with blog at /blog":
  add a new homepage at / (hero intro + featured projects + philosophy), move the blog
  feed to /app/blog-index/ (rendered at /blog), update nav links, and reroute all
  existing blog post URLs from /blog/[slug] → /blog/[slug] (no change — only the
  index moves). No content is deleted. No URLs of individual posts change.
---

# Draft: homepage-redesign

## Components (topology ledger)

| id  | outcome                                                                            | status | evidence                             |
| --- | ---------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| C1  | New `/` homepage — hero, bio, focus areas, project links, philosophy               | active | app/page.tsx, app/Main.tsx           |
| C2  | Blog index moved to `/blog` — full feed with filters, pagination, activity tracker | active | app/Main.tsx, data/headerNavLinks.ts |
| C3  | Nav update — "Blog" replaces "Home" or added as new link                           | active | data/headerNavLinks.ts               |
| C4  | Individual blog post URLs untouched — `/blog/[...slug]` stays                      | active | app/blog/[...slug]/page.tsx          |
| C5  | siteMetadata title/description update to reflect full site                         | active | data/siteMetadata.js                 |
| C6  | Stream entry documenting the change (INSTRUCTIONS.md mandate)                      | active | data/stream/                         |

## Open assumptions (announced defaults)

| assumption                         | adopted default                                                                                                                               | rationale                                                                                                                                               | reversible?                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Homepage visual style              | "High-end digital presence" — bare-metal, terminal-inspired, dark-first, stark grid; NOT a typical SaaS landing page                          | SOUL.md: "bare-metal, terminal-inspired, stark, highly intentional"; INSTRUCTIONS.md: "visually unique to this author, high-end public digital journal" | Yes — CSS/Tailwind only                           |
| Homepage sections                  | Hero (tagline + location + role) → Focus areas (EV / AI / Smart Home) → Featured repos (curated links to GitHub repos) → Philosophy quote     | Derived from GitHub README structure; mirrors the narrative arc of the profile                                                                          | Yes — sections can be reordered/removed           |
| Blog index route                   | `/blog` (new page) — current `app/page.tsx` + `app/Main.tsx` move/copy to `app/blog/page.tsx`                                                 | Standard personal site convention; clean separation                                                                                                     | Yes                                               |
| Root `/` route                     | New `app/page.tsx` + `app/HomePage.tsx` (server component + client presentational)                                                            | Follows existing pattern (page.tsx → Main.tsx)                                                                                                          | Yes                                               |
| Individual post URLs               | `/blog/[...slug]` UNCHANGED — `app/blog/[...slug]/page.tsx` stays exactly where it is                                                         | Already correct location; zero redirect risk                                                                                                            | N/A                                               |
| Nav links                          | Change `{ href: '/', title: 'Home' }` → `{ href: '/', title: 'Home' }` kept; add `{ href: '/blog', title: 'Blog' }`                           | Additive, preserves Stream + About                                                                                                                      | Yes                                               |
| About page `/about`                | Untouched — still renders author MDX                                                                                                          | Already works; no reason to move it                                                                                                                     | N/A                                               |
| GitHub data                        | Hard-coded from profile at plan time (no live API call)                                                                                       | Avoids rate-limiting, keeps build static/fast; content can be updated by hand or scripted later                                                         | Yes — can add GitHub API fetch later              |
| Homepage hero copy                 | Derived from README: "15+ years designing distributed systems, scaling platforms, and leading engineering teams. CTO at Powerdot." + Portugal | Exact GitHub README language                                                                                                                            | Yes — human edits siteMetadata or a new data file |
| New data file for homepage content | `data/homepageData.ts` — exports hero copy, focus areas array, featured repos array                                                           | Keeps content separate from component logic; follows `data/headerNavLinks.ts` pattern                                                                   | Yes                                               |
| PR workflow                        | New branch `feat/homepage-intro`, PR opened via `gh pr create`                                                                                | INSTRUCTIONS.md §Orchestrator Behavior: "NEVER push directly to main"                                                                                   | N/A (required)                                    |

## Findings (cited - path:lines)

- **Framework**: Next.js 15 App Router, React 19, Contentlayer2, Tailwind CSS v4. `package.json`, `next.config.js`, `contentlayer.config.ts`
- **Current `/` route**: `app/page.tsx` (9 lines) → `app/Main.tsx` (252 lines, client, blog feed + ActivityTracker + pagination)
- **Current blog post route**: `app/blog/[...slug]/page.tsx` — already at `/blog/[slug]`; individual post URLs are already correct and DO NOT need to change
- **No `/blog` index page exists yet** — `app/blog/` only contains `[...slug]/` — a new `app/blog/page.tsx` is needed
- **Nav links**: `data/headerNavLinks.ts` has Home, Stream, About — needs Blog added
- **siteMetadata**: `data/siteMetadata.js:3` title = "Adão's Morning Thoughts", description = generic blog copy — should be updated to reflect full site identity
- **Author data**: `data/authors/default.mdx` and `/about` page already exist — no duplication needed
- **SOUL.md**: aesthetic = bare-metal, terminal-inspired, stark; tone = quietly proud, reflective
- **INSTRUCTIONS.md:56**: "NEVER push directly to main. Create a new branch, push the branch, and use `gh pr create`."
- **INSTRUCTIONS.md:27**: "Maintain the Stream" — every change must add a `/stream` entry
- **GitHub profile README**: tagline, philosophy quote, focus areas (EV / AI / Smart Home), background (Bright Technologies, Sword Health, Airchat, Powerdot), curated repos

## Decisions (with rationale)

1. **Move blog feed to `/blog`, not a subdirectory** — cleanliness and SEO; `/blog` is the conventional path
2. **Homepage is a static server component** — no client-side data needed; GitHub data is hard-coded at build time → fast, no hydration issues
3. **No new pages beyond `/` and `/blog` index** — scope stays tight; projects page, infrastructure page etc. are deferred (INSTRUCTIONS.md §Priority Feature Areas already lists these for future sprints)
4. **Reuse existing layout** — the global `Header`, `Footer`, `SectionContainer`, `ThemeProviders` shell stays; only the route content changes
5. **Tailwind-only styling** — INSTRUCTIONS.md prohibits competing style libraries

## Scope IN

- New `app/page.tsx` + `app/HomePage.tsx` (homepage — hero, focus areas, featured repos, philosophy)
- New `app/blog/page.tsx` + reuse of `app/Main.tsx` (blog feed index at /blog)
- `data/homepageData.ts` (structured content for the homepage — hero copy, focus areas, repos)
- `data/headerNavLinks.ts` — add Blog link, keep Home, Stream, About
- `data/siteMetadata.js` — update title + description to match full personal website identity
- New stream entry in `data/stream/` documenting this change
- PR on branch `feat/homepage-intro`

## Scope OUT (Must NOT have)

- Do NOT change individual blog post URLs (`/blog/[...slug]` stays exactly as-is)
- Do NOT modify any files in `data/blog/` (no content changes)
- Do NOT add a live GitHub API call (hard-code homepage content at build time)
- Do NOT add new npm dependencies for the homepage
- Do NOT create a separate `/about-me`, `/projects`, or `/work` page in this PR (deferred)
- Do NOT change the Stream (`/stream`) page
- Do NOT alter MDX content tone or voice in any existing post

## Open questions

None — all resolved by evidence or adopted defaults.

## Approval gate

status: awaiting-approval
pending-action: write .omo/plans/homepage-redesign.md
approach: >
Create a new homepage at / (server component, hard-coded data, bare-metal aesthetic),
move the blog feed to /blog (reuse Main.tsx), update nav + siteMetadata, add a stream
entry, ship on a PR branch. Zero individual post URL changes.
