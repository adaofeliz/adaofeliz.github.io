# homepage-redesign - Work Plan

## TL;DR (For humans)

**What you'll get:** A real personal website at `/` (hero intro, focus areas, featured repos, philosophy — drawn from your GitHub README) with the blog feed cleanly moved to `/blog`. Individual post URLs (`/blog/some-post`) are untouched. The nav gains a "Blog" link. The site title and description reflect a full personal site, not just a blog.

**Why this approach:** The blog feed code is reused at `/blog` with a single `basePath` prop added (so tag filters and pagination link correctly to `/blog?tag=...` instead of `/?tag=...`). The homepage is a static server component — no live API, no new deps, content in a typed `data/homepageData.ts` you can edit like any other data file. Three atomic commits land the changes in a clean, reviewable PR.

**What it will NOT do:** Change any individual post URLs. Touch any MDX content in `data/blog/`. Add npm dependencies. Create a `/projects` or `/infrastructure` page (those are deferred per your INSTRUCTIONS.md priority list).

**Effort:** Medium | **Risk:** Low — purely additive; no existing routes are removed or redirected.

**Decisions I made for you:**

- Homepage aesthetic: bare-metal, terminal-inspired, stark — consistent with SOUL.md. No SaaS landing page vibes.
- Homepage content: hero copy, focus areas, featured repos, philosophy all drawn from your GitHub README / `data/authors/default.mdx`. Stored in `data/homepageData.ts` for easy editing.
- No live GitHub API call — content is hard-coded at build time (fits GitHub Pages static export; can be scripted later).
- No redirect from `/` → `/blog` — old `/` was the blog index; new `/` is the homepage. External links to `/` will land on the homepage by design (a "Latest posts" strip on the homepage mitigates this gracefully).
- `Header.tsx:32` filter (`link.href !== '/'`) is removed — "Home" becomes a visible nav link now that `/` is a real destination.
- Nav order: Home → Blog → Stream → About.
- `siteMetadata` title: `"Adão Feliz"`, headerTitle: `"adaofeliz"`, description: `"CTO, builder, and engineering leader. Writing about distributed systems, AI, and the craft of building."`.
- Stream entry added (required by INSTRUCTIONS.md) documenting this structural change.

> I treated this as open-ended and chose defaults. If you had a specific outcome in mind for any of these — the aesthetic, the sections, the copy — say so before `$start-work` and I'll adjust.

Your next move: run `$start-work` to execute, or tell me what to change first.

---

> TL;DR (machine): Medium effort, low risk. 7 file changes + 2 new files + 1 new stream entry. Delivers `/` homepage + `/blog` index + nav/meta updates on branch `feat/homepage-intro`.

## Scope

### Must have

- `app/Main.tsx` — add `basePath: string = '/'` prop; replace 3 hardcoded `'/'` href literals with `basePath` at lines ~124, ~141, ~152
- `app/blog/page.tsx` — new file; mirrors `app/page.tsx` shape exactly; passes `basePath="/blog"` to `<Main>`
- `app/page.tsx` — replaced: imports `HomePage` component instead of `Main`
- `app/HomePage.tsx` — new server component; renders hero, focus areas, featured repos, philosophy; uses only Tailwind CSS
- `data/homepageData.ts` — new typed data file; `HomepageData` interface + exported constant; no stars field (avoids stale data)
- `data/headerNavLinks.ts` — exact new array: `[{href:'/',title:'Home'},{href:'/blog',title:'Blog'},{href:'/stream',title:'Stream'},{href:'/about',title:'About'}]`
- `components/Header.tsx:32` — remove `link.href !== '/'` filter so "Home" link renders in desktop nav
- `data/siteMetadata.js` — update `title`, `headerTitle`, `description` fields
- `app/sitemap.ts:17` — add `'blog'` to routes array
- Per-page `export const metadata` in new `app/page.tsx` (homepage) and new `app/blog/page.tsx` (blog index) to prevent OG title bleed
- `data/stream/2026-07-07-homepage-launch.mdx` — stream entry with required frontmatter (`title`, `date`, `summary`, `tags`) documenting this change

### Must NOT have (guardrails, anti-scope, anti-slop)

- Do NOT change `app/blog/[...slug]/page.tsx` or any individual post route
- Do NOT modify any file under `data/blog/`
- Do NOT add npm dependencies
- Do NOT add a live GitHub API call
- Do NOT create `/projects`, `/infrastructure`, `/work`, or `/about-me` pages
- Do NOT modify `app/about/page.tsx` or `data/authors/default.mdx`
- Do NOT push to `main` — all changes land on branch `feat/homepage-intro` via PR
- Do NOT fork/duplicate `Main.tsx` into a separate `BlogIndex.tsx` — parameterize instead
- Do NOT use `any` TypeScript types or suppress lint errors
- Do NOT add `// eslint-disable` comments

## Verification strategy

> Zero human intervention — all verification is agent-executed.

- **Test decision:** tests-after — no Jest/Playwright test files exist in the repo; verification uses `tsc`, `eslint`, `next build`, and `grep` on build output as the QA gates.
- **Build gate:** `yarn build` must exit 0, producing `out/index.html` **and** `out/blog/index.html` (static export).
- **TypeScript gate:** `yarn tsc --noEmit` → exit 0.
- **Lint gate:** `yarn eslint . --max-warnings=0` → exit 0 (or `npx eslint . --max-warnings=0` if no yarn script).
- **Scope guard:** `git diff --name-only origin/main...HEAD` must contain ONLY files listed in Scope IN.
- Evidence paths: `.omo/evidence/task-N-homepage-redesign.txt` per todo.

## Execution strategy

### Parallel execution waves

**Wave 1 — Data layer (no UI, no routing risk)**

- Todo 1: `data/homepageData.ts` — typed interface + content
- Todo 2: `data/siteMetadata.js` — title/headerTitle/description
- Todo 3: `data/headerNavLinks.ts` — new nav array

**Wave 2 — Routing plumbing (depends on Wave 1 data files)**

- Todo 4: `app/Main.tsx` — add `basePath` prop (pure refactor, no visible change)
- Todo 5: `app/blog/page.tsx` — new blog index page (depends on Todo 4)
- Todo 6: `app/sitemap.ts` — add `'blog'` route

**Wave 3 — Homepage (depends on Wave 1 data, Wave 2 routing)**

- Todo 7: `app/HomePage.tsx` — new server component
- Todo 8: `app/page.tsx` — swap to use HomePage

**Wave 4 — Header + metadata (depends on Wave 1 + Wave 3)**

- Todo 9: `components/Header.tsx` — remove `href !== '/'` filter
- Todo 10: per-page metadata exports in `app/page.tsx` + `app/blog/page.tsx`

**Wave 5 — Stream entry + PR**

- Todo 11: `data/stream/2026-07-07-homepage-launch.mdx`
- Todo 12: Build verification + PR creation

### Dependency matrix

| Todo                   | Depends on | Blocks | Can parallelize with |
| ---------------------- | ---------- | ------ | -------------------- |
| 1 (homepageData.ts)    | —          | 7, 8   | 2, 3                 |
| 2 (siteMetadata.js)    | —          | 9, 10  | 1, 3                 |
| 3 (headerNavLinks.ts)  | —          | 9      | 1, 2                 |
| 4 (Main.tsx basePath)  | —          | 5      | 6                    |
| 5 (blog/page.tsx)      | 4          | 10, 12 | 6                    |
| 6 (sitemap.ts)         | —          | 12     | 4, 5                 |
| 7 (HomePage.tsx)       | 1          | 8      | 5, 6                 |
| 8 (app/page.tsx)       | 7          | 10, 12 | 9                    |
| 9 (Header.tsx)         | 2, 3       | 12     | 8                    |
| 10 (metadata exports)  | 5, 8       | 12     | 11                   |
| 11 (stream entry)      | —          | 12     | 10                   |
| 12 (build verify + PR) | 1–11       | —      | —                    |

## Todos

- [x] 1. `data/homepageData.ts`: Create typed homepage content file — enables HomePage component to render without hardcoding in JSX
     What to do: Create new file `data/homepageData.ts` with a `HomepageData` interface and a default export. Include:
  - `hero`: `{ tagline: string; role: string; location: string; description: string }`
  - `philosophy`: `{ quote: string; attribution: string }`
  - `focusAreas`: `ReadonlyArray<{ id: string; title: string; description: string }>`
  - `featuredRepos`: `ReadonlyArray<{ name: string; description: string; url: string; language: string }>`
  - No `stars` field — avoids silent staleness.
    Populate from `data/authors/default.mdx` and GitHub README (already researched):
  - hero tagline: `"15+ years designing distributed systems, scaling platforms, and leading engineering teams."`
  - hero role: `"CTO at Powerdot"`
  - hero location: `"Portugal"`
  - hero description: `"Currently building the technology foundation for large-scale EV charging infrastructure across Europe."`
  - philosophy quote: `"Build systems that scale before the business forces you to. Good architecture is a competitive advantage, not a cost centre."`
  - philosophy attribution: `"— Adão"`
  - focusAreas: EV Charging Infrastructure / AI Enablement / Smart Home & Self-Hosted (3 items, descriptions from GitHub README)
  - featuredRepos: `slack-mcp-oauth-proxy`, `manifest`, `bticino-door-entry-v1`, `life-in-weeks`, `tududi-calendar-sync`, `obsidian-mcp` — 6 repos, descriptions from GitHub README
    Must NOT do: use `any`, add live fetch, include stars count.
    Parallelization: Wave 1 | Blocked by: none | Blocks: Todo 7, 8
    References (executor has NO interview context):
  - `data/headerNavLinks.ts` — pattern for typed data file (array + export default)
  - `data/authors/default.mdx:8–44` — hero copy, philosophy, focus areas, background
  - GitHub README content (documented in `.omo/drafts/homepage-redesign.md` Findings section)
  - TypeScript strict mode: `tsconfig.json` (strict: true implied by INSTRUCTIONS.md)
    Acceptance criteria (agent-executable):
  - `yarn tsc --noEmit` exits 0 after file creation
  - File exists at `data/homepageData.ts`
  - `grep -q 'focusAreas' data/homepageData.ts` exits 0
  - `grep -q 'featuredRepos' data/homepageData.ts` exits 0
  - `grep -q 'stars' data/homepageData.ts` returns non-zero (stars field must NOT exist)
    QA scenarios:
  - Happy: `yarn tsc --noEmit` exits 0 → evidence `.omo/evidence/task-1-homepage-redesign.txt`
  - Failure: TypeScript error on missing field → fix the interface, re-run tsc
    Commit: Y | `feat(data): add homepageData.ts with typed hero/focusAreas/repos content`

- [x] 2. `data/siteMetadata.js`: Update title, headerTitle, description to reflect full personal website
     What to do: Edit `data/siteMetadata.js`. Change exactly three fields:
  - `title`: `"Adão Feliz"` (was: `"Adão's Morning Thoughts"`)
  - `headerTitle`: `"adaofeliz"` (was: `"Adão's Morning Thoughts"`)
  - `description`: `"CTO, builder, and engineering leader. Writing about distributed systems, AI, and the craft of building."` (was: `"Personal blog about technology, fitness, life, and other stuff."`)
    Leave all other fields (`author`, `language`, `theme`, `siteUrl`, `siteLogo`, `email`, `locale`, `stickyNav`) completely unchanged.
    Must NOT do: change `siteUrl`, `email`, or any other field.
    Parallelization: Wave 1 | Blocked by: none | Blocks: Todo 9, 10
    References:
  - `data/siteMetadata.js:1–16` — current content; only lines 3, 4, 6 change
  - `components/Header.tsx:17–22` — reads `siteMetadata.headerTitle` for brand display; `"adaofeliz"` must be short (mobile shows `AMT` fallback at `sm:hidden`)
    Acceptance criteria:
  - `grep -q '"Adão Feliz"' data/siteMetadata.js` exits 0
  - `grep -q '"adaofeliz"' data/siteMetadata.js` exits 0
  - `grep -q 'adaofeliz.com' data/siteMetadata.js` exits 0 (siteUrl unchanged)
    QA scenarios:
  - Happy: grep checks pass → evidence `.omo/evidence/task-2-homepage-redesign.txt`
  - Failure: wrong field changed → re-read file, diff, correct
    Commit: Y | `feat(config): update siteMetadata title and description for personal website`

- [x] 3. `data/headerNavLinks.ts`: Replace nav array with Home + Blog + Stream + About
     What to do: Replace the entire array in `data/headerNavLinks.ts` with:

  ```ts
  const headerNavLinks = [
    { href: '/', title: 'Home' },
    { href: '/blog', title: 'Blog' },
    { href: '/stream', title: 'Stream' },
    { href: '/about', title: 'About' },
  ]
  export default headerNavLinks
  ```

  Must NOT do: change the type or export shape.
  Parallelization: Wave 1 | Blocked by: none | Blocks: Todo 9
  References:
  - `data/headerNavLinks.ts:1–5` — current file (3 links); new file has 4
  - `components/Header.tsx:32` — currently filters out `href === '/'`; that filter is removed in Todo 9, so this Todo must land before or in the same commit as Todo 9
    Acceptance criteria:
  - `grep -q "'/blog'" data/headerNavLinks.ts` exits 0
  - `grep -c "href" data/headerNavLinks.ts` returns 4
  - `yarn tsc --noEmit` exits 0
    QA scenarios:
  - Happy: 4 href entries present, tsc clean → evidence `.omo/evidence/task-3-homepage-redesign.txt`
  - Failure: tsc error on type mismatch → check shape matches existing type expectation
    Commit: Y | `feat(nav): add Blog link and restore Home link in headerNavLinks`

- [x] 4. `app/Main.tsx`: Add `basePath` prop and replace 3 hardcoded `'/'` href literals
     What to do: This is a pure refactor — zero visual change when `basePath='/'` (the default). Add `basePath: string = '/'` to the `HomeProps` interface and `HomeContent` function signature. Replace the three hardcoded `/` href literals:
  - Line ~124: `getHref` function returns `'/'` as base → replace bare `'/'` with `basePath`
  - Line ~141: category chip `href={activeTag === cat ? '/' : ...}` → replace `'/'` with `basePath`
  - Line ~152: "show all" link `href="/"` → replace with `basePath`
    The `Home` default export must also pass `basePath` through to `HomeContent`.
    Must NOT do: change any visual output, change any logic, rename the component, add new state.
    Parallelization: Wave 2 | Blocked by: none | Blocks: Todo 5
    References:
  - `app/Main.tsx:1–252` — full file; edit lines ~23 (interface), ~92 (function sig), ~119–125 (getHref), ~141, ~152, ~246 (Home export)
  - Metis G1 finding: "three URL literals pointing to `/`" at lines ~124, ~141, ~152
    Acceptance criteria:
  - `grep -q 'basePath' app/Main.tsx` exits 0
  - `grep -c "href={\`/?" app/Main.tsx`returns 0 (no remaining raw`/`href literals — use`grep -n "href=\"/\"" app/Main.tsx` to confirm 0 matches)
  - `yarn tsc --noEmit` exits 0
  - `yarn build` exits 0 (build still works with default `basePath='/'` on existing home route before Todo 8 swaps it)
    QA scenarios:
  - Happy: tsc clean, build passes → evidence `.omo/evidence/task-4-homepage-redesign.txt`
  - Failure: TypeScript error on prop — check interface and destructuring match; regression — `href="/"` literal still present, grep to find it
    Commit: Y | `refactor(Main): parameterize basePath prop for blog index reuse`

- [x] 5. `app/blog/page.tsx`: Create blog index page at `/blog`
     What to do: Create new file `app/blog/page.tsx`. Mirror the shape of `app/page.tsx` exactly — server component, no `'use client'`. Import `sortPosts`, `allCoreContent` from `pliny/utils/contentlayer`, `allBlogs` from `contentlayer/generated`, and `Main` from `'../Main'`. Sort and pass posts, and pass `basePath="/blog"` to `<Main>`. Add a page-level `export const metadata` export:

  ```ts
  export const metadata = {
    title: 'Blog',
    description:
      'Writing about distributed systems, AI, infrastructure, and the craft of building.',
  }
  ```

  Wrap `<Main>` in `<Suspense fallback={<div className="animate-pulse">Loading...</div>}>` at the page level if Main doesn't already wrap itself (it does — `Home` export in Main has Suspense at line ~247; but the page.tsx must still be a valid server component that renders fine under `output: 'export'`).
  Must NOT do: use `'use client'`, touch `app/blog/[...slug]/page.tsx`, add redirects.
  Parallelization: Wave 2 | Blocked by: Todo 4 | Blocks: Todo 10, 12
  References:
  - `app/page.tsx:1–9` — exact pattern to mirror
  - `app/Main.tsx` — after Todo 4, accepts `basePath` prop
  - `app/blog/[...slug]/page.tsx` — existing sibling; NOT touched; route collision cleared (index vs catch-all, different segments — Metis G2)
  - `next.config.js` — check `output: 'export'` setting to confirm static export mode
    Acceptance criteria:
  - File exists at `app/blog/page.tsx`
  - `yarn build` exits 0 and produces `out/blog/index.html`
  - `grep -q 'basePath="/blog"' app/blog/page.tsx` exits 0
  - `grep -q 'metadata' app/blog/page.tsx` exits 0
  - `grep -c 'href="/blog/' out/blog/index.html` returns ≥ 1 (post links use `/blog/` prefix)
    QA scenarios:
  - Happy: build produces `out/blog/index.html` with post links → evidence `.omo/evidence/task-5-homepage-redesign.txt`
  - Failure: build error on Suspense/SSR → ensure no client hooks leak into server component wrapper; check Main's own Suspense boundary is sufficient
    Commit: Y | `feat(routing): add /blog index page`

- [x] 6. `app/sitemap.ts`: Add `'blog'` route to static routes array
     What to do: Edit `app/sitemap.ts` line 17. Change:

  ```ts
  const routes = ['', 'about'].map(...)
  ```

  to:

  ```ts
  const routes = ['', 'blog', 'about'].map(...)
  ```

  That is the only change in this file.
  Must NOT do: change `blogRoutes` logic, change URL construction, touch dynamic routes.
  Parallelization: Wave 2 | Blocked by: none | Blocks: Todo 12
  References:
  - `app/sitemap.ts:17` — the routes array
  - Metis G3: sitemap omits `/blog`; search engines lose the blog listing URL without this fix
    Acceptance criteria:
  - `grep -q "'blog'" app/sitemap.ts` exits 0
  - `yarn build` exits 0
  - `grep -q '/blog"' out/sitemap.xml` exits 0 (blog URL in generated sitemap)
    QA scenarios:
  - Happy: sitemap XML contains `/blog` entry → evidence `.omo/evidence/task-6-homepage-redesign.txt`
  - Failure: sitemap not generated → check `output: 'export'` and route handler shape
    Commit: Y | `feat(seo): add /blog to sitemap routes`

- [ ] 7. `app/HomePage.tsx`: Create homepage server component
     What to do: Create new file `app/HomePage.tsx`. This is a React server component (no `'use client'`). Import `homepageData` from `'@/data/homepageData'` and `Link` from `'@/components/Link'`. Render four sections using only Tailwind CSS classes:
  1. **Hero section**: display `hero.tagline` as `<h1>`, `hero.role` + `hero.location` as subtitle, `hero.description` as paragraph. Style: stark, high-contrast, terminal-inspired. No images, no gradients, no rounded cards with drop shadows.
  1. **Focus Areas section**: `<h2>Focus Areas</h2>`, map `focusAreas` into a responsive grid (2-col on md+). Each item: title in bold, description in muted text. Style: minimal, grid-based.
  1. **Featured Repos section**: `<h2>Featured Work</h2>`, map `featuredRepos` into cards linking to `https://github.com/adaofeliz/${repo.name}` (use `repo.url` from data). Each card: name, description, language badge. Style: same stark grid.
  1. **Philosophy section**: blockquote with `philosophy.quote` and `philosophy.attribution`. Style: left-border accent, muted italic.
  1. **Latest Posts link**: a single `<Link href="/blog">` CTA at the bottom ("Read the blog →") — this mitigates the G7 concern (old inbound `/` traffic finds the blog).
     Aesthetic constraints from SOUL.md: bare-metal, terminal-inspired, stark, highly intentional. No generic SaaS landing page patterns (no hero images, no gradient CTAs, no floating cards with shadows). Use the site's existing green (`primary-*`) accent sparingly.
     Must NOT do: add `'use client'`, use live fetch, add npm packages, inline styles.
     Parallelization: Wave 3 | Blocked by: Todo 1 | Blocks: Todo 8
     References:
  - `data/homepageData.ts` — (created in Todo 1) source of all content
  - `app/Main.tsx` — study the Tailwind class patterns in use (typography, spacing, dividers)
  - `css/tailwind.css` — custom palette (primary green), prose config, utility classes
  - `components/Link.tsx` — internal link component to use instead of `<a>`
  - `layouts/AuthorLayout.tsx` — good reference for a content-rich server component layout in this codebase
  - SOUL.md — aesthetic constraints
    Acceptance criteria:
  - File exists at `app/HomePage.tsx`
  - `yarn tsc --noEmit` exits 0
  - No `'use client'` directive in file
  - `grep -q 'focusAreas' app/HomePage.tsx` exits 0
  - `grep -q 'featuredRepos' app/HomePage.tsx` exits 0
  - `grep -q '/blog' app/HomePage.tsx` exits 0 (CTA link present)
    QA scenarios:
  - Happy: tsc clean, no client directive → evidence `.omo/evidence/task-7-homepage-redesign.txt`
  - Failure: TypeScript error importing homepageData → ensure Todo 1 is complete first; import path uses `@/data/homepageData`
    Commit: N (commit together with Todo 8)

- [ ] 8. `app/page.tsx`: Replace blog feed with HomePage component
     What to do: Replace the entire content of `app/page.tsx` with:

  ```ts
  import HomePage from './HomePage'

  export const metadata = {
    title: 'Adão Feliz — CTO, builder, engineering leader',
    description: 'Personal website of Adão Feliz. CTO at Powerdot. Building EV infrastructure, AI integrations, and self-hosted systems.',
  }

  export default function Page() {
    return <HomePage />
  }
  ```

  This is a server component. No `sortPosts`, no `allBlogs`, no `Main` import — those move to `app/blog/page.tsx` (Todo 5).
  Must NOT do: add `'use client'`, import `Main`, keep any blog-list logic in this file.
  Parallelization: Wave 3 | Blocked by: Todo 7 | Blocks: Todo 10, 12
  References:
  - `app/page.tsx:1–9` — current content to fully replace
  - `app/HomePage.tsx` — (created in Todo 7) the component to render
  - `app/blog/page.tsx` — (created in Todo 5) confirms blog list is already served at `/blog`
    Acceptance criteria:
  - `grep -q 'HomePage' app/page.tsx` exits 0
  - `grep -q 'metadata' app/page.tsx` exits 0
  - `grep -q 'allBlogs' app/page.tsx` returns non-zero (no blog imports in homepage)
  - `yarn build` exits 0 and produces `out/index.html`
  - `grep -q 'Adão' out/index.html` exits 0 (hero content rendered)
    QA scenarios:
  - Happy: build produces `out/index.html` with hero content → evidence `.omo/evidence/task-8-homepage-redesign.txt`
  - Failure: build error because `HomePage` not found → confirm Todo 7 completed; check import path `'./HomePage'`
    Commit: Y | `feat(homepage): replace blog feed with personal website homepage`

- [ ] 9. `components/Header.tsx`: Remove `href !== '/'` filter so Home link renders in desktop nav
     What to do: Edit `components/Header.tsx` line 32. Remove the `.filter((link) => link.href !== '/')` call. The line currently reads:

  ```tsx
  {headerNavLinks
    .filter((link) => link.href !== '/')
    .map((link) => (
  ```

  Change to:

  ```tsx
  {headerNavLinks
    .map((link) => (
  ```

  That is the only change. "Home" will now appear as a visible link in the desktop nav (it was previously hidden, with the logo serving as the only `/` link). On mobile, `MobileNav` uses `headerNavLinks` directly — check `components/MobileNav.tsx` to confirm it does not also apply the same filter (if it does, remove it there too).
  Must NOT do: change any other logic, styling, or the mobile nav beyond removing the filter.
  Parallelization: Wave 4 | Blocked by: Todos 2, 3 | Blocks: Todo 12
  References:
  - `components/Header.tsx:29–42` — the filter is at line 32
  - `components/MobileNav.tsx` — check for identical `href !== '/'` filter; remove if present
  - `data/headerNavLinks.ts` — (updated in Todo 3) now has 4 links including Home at `href='/'`
    Acceptance criteria:
  - `grep -q "filter" components/Header.tsx` returns non-zero (filter line removed)
  - `yarn tsc --noEmit` exits 0
  - `yarn build` exits 0
  - `grep -q 'href="/"' out/index.html` exits 0 OR `grep -c 'Home' out/index.html` ≥ 1 (Home link rendered)
    QA scenarios:
  - Happy: build clean, Home link visible in output → evidence `.omo/evidence/task-9-homepage-redesign.txt`
  - Failure: MobileNav also filters — find and remove same filter there too
    Commit: Y | `feat(header): render Home nav link by removing href filter`

- [ ] 10. Per-page metadata: Add `export const metadata` to `app/page.tsx` and `app/blog/page.tsx`
      What to do: Verify both files already have `metadata` exports (they should from Todos 5 and 8). If either is missing, add it now:
  - `app/page.tsx` metadata (if missing):
    ```ts
    export const metadata = {
      title: 'Adão Feliz — CTO, builder, engineering leader',
      description: 'Personal website of Adão Feliz. CTO at Powerdot.',
    }
    ```
  - `app/blog/page.tsx` metadata (if missing):
    ```ts
    export const metadata = {
      title: 'Blog — Adão Feliz',
      description:
        'Writing about distributed systems, AI, infrastructure, and the craft of building.',
    }
    ```
    This prevents `siteMetadata.title` ("Adão Feliz") from leaking as the OG title for both pages identically — each page gets a distinct title.
    Must NOT do: touch `app/layout.tsx` metadata, touch any other page.
    Parallelization: Wave 4 | Blocked by: Todos 5, 8 | Blocks: Todo 12
    References:
  - `app/layout.tsx:20–38` — root metadata uses `siteMetadata.title` as default; per-page exports override it
  - `app/about/page.tsx` — check if it uses `genPageMetadata` from `app/seo.tsx` as a pattern reference
  - Metis G5: "add per-page metadata export in both new pages to prevent OG title leakage"
    Acceptance criteria:
  - `grep -q 'export const metadata' app/page.tsx` exits 0
  - `grep -q 'export const metadata' app/blog/page.tsx` exits 0
  - `grep -q 'Blog' app/blog/page.tsx` exits 0 (blog-specific title present)
  - `yarn tsc --noEmit` exits 0
    QA scenarios:
  - Happy: both files have distinct metadata exports, tsc clean → evidence `.omo/evidence/task-10-homepage-redesign.txt`
  - Failure: metadata export conflicts with layout — ensure no duplicate `title` key
    Commit: N (no separate commit needed if already in Todos 5 and 8; if added here, commit as `feat(seo): add per-page metadata to homepage and blog index`)

- [ ] 11. `data/stream/2026-07-07-homepage-launch.mdx`: Add stream entry documenting this structural change
      What to do: Create new file `data/stream/2026-07-07-homepage-launch.mdx` with the following required frontmatter (see INSTRUCTIONS.md §Session Learnings — "Stream Frontmatter is Strict"):

  ```mdx
  ---
  title: 'The Garden Gets a Gate'
  date: '2026-07-07'
  tags: [architecture, meta, shipped]
  summary: 'The site grew a front door. The blog moved to /blog. The / now introduces the builder, not just the writing.'
  ---
  ```

  Body (written in Sisyphus voice per SOUL.md — quietly proud, terminal-metaphor, reflective):
  Write 3–5 paragraphs covering: what changed (homepage at `/`, blog at `/blog`), why the structure makes sense now (a personal website vs. a blog), and a brief reflection on the idea that a site's root URL is a kind of identity claim. End with a short terminal-style signoff.
  Must NOT do: alter any existing stream entries, reference internal file paths, break the frontmatter schema.
  Parallelization: Wave 5 | Blocked by: none | Blocks: Todo 12
  References:
  - `data/stream/2026-06-08-what-tars-sees.mdx` — example of correct frontmatter + voice
  - `contentlayer.config.ts` — Stream document type definition (confirm required fields)
  - SOUL.md:19–24 — operational tone guide
  - INSTRUCTIONS.md:27 — "Maintain the Stream: every time you evolve, fix, or operate on the blog, you must add an entry"
    Acceptance criteria:
  - File exists at `data/stream/2026-07-07-homepage-launch.mdx`
  - `grep -q "title:" data/stream/2026-07-07-homepage-launch.mdx` exits 0
  - `grep -q "date:" data/stream/2026-07-07-homepage-launch.mdx` exits 0
  - `grep -q "summary:" data/stream/2026-07-07-homepage-launch.mdx` exits 0
  - `grep -q "tags:" data/stream/2026-07-07-homepage-launch.mdx` exits 0
  - `yarn build` exits 0 (Contentlayer parses the entry without error)
    QA scenarios:
  - Happy: build passes, entry parsed by Contentlayer → evidence `.omo/evidence/task-11-homepage-redesign.txt`
  - Failure: Contentlayer parse error → check frontmatter indentation, quote style, tag format (array not string)
    Commit: Y | `feat(stream): add homepage launch stream entry`

- [ ] 12. Final build verification and PR creation
      What to do: Run the complete QA gate, then open the PR.
      **QA gate (all must pass — record output to `.omo/evidence/task-12-homepage-redesign.txt`):**
  1. `yarn tsc --noEmit` → exit 0
  1. `npx eslint . --max-warnings=0` (or `yarn lint` if that script exists) → exit 0
  1. `yarn build` → exit 0; confirm `out/index.html` AND `out/blog/index.html` both exist
  1. `grep -q 'Featured' out/index.html` → exit 0 (homepage hero rendered)
  1. `grep -c 'href="/blog/' out/blog/index.html` → ≥ 1 (blog post links present and use `/blog/` prefix, not `/`)
  1. `grep -q '/blog"' out/sitemap.xml` → exit 0 (blog in sitemap)
  1. `grep -q '/feed.xml' out/index.html` OR `test -f out/feed.xml` → exit 0 (RSS unchanged)
  1. **Scope guard:** `git diff --name-only origin/main...HEAD | grep -vE '(app/page\.tsx|app/HomePage\.tsx|app/blog/page\.tsx|app/Main\.tsx|app/sitemap\.ts|data/homepageData\.ts|data/headerNavLinks\.ts|data/siteMetadata\.js|components/Header\.tsx|data/stream/2026-07-07|\.omo/)' | wc -l` → 0
  1. **Regression guard (G1):** `grep -c 'href="/"' out/blog/index.html` → 0 OR verify that all `/` hrefs in `out/blog/index.html` are the logo link and not tag/pagination links (use `grep 'href="/"' out/blog/index.html` and inspect manually that only logo href remains)
     **Then open PR:**
  ```bash
  git checkout -b feat/homepage-intro
  git add -A
  git commit -m "feat: homepage redesign — personal website at / with blog at /blog"
  git push origin feat/homepage-intro
  gh pr create --title "feat: homepage redesign — personal website at / with blog at /blog" \
    --body "## Summary\n\nTransforms the site from a blog-at-root to a personal website:\n\n- **/** — New homepage: hero, focus areas, featured repos, philosophy\n- **/blog** — Blog index (existing feed, now at /blog)\n- Individual post URLs (/blog/[slug]) unchanged\n- Nav: Home → Blog → Stream → About\n- siteMetadata title/description updated\n- /blog added to sitemap\n- Stream entry added\n\n## Changes\n\nSee commit for full diff. No new npm dependencies. No MDX content changed." \
    --base main
  ```
  Must NOT do: push to main directly, force-push, use `--no-verify`.
  Parallelization: Wave 5 — FINAL, depends on all previous todos
  References:
  - INSTRUCTIONS.md:56–60 — PR workflow requirement
  - `next.config.js` — confirm `output: 'export'` for build artifact paths
    Acceptance criteria:
  - All 9 QA gate commands pass
  - PR URL printed by `gh pr create` — record it in evidence file
    QA scenarios:
  - Happy: all gates green, PR URL returned → evidence `.omo/evidence/task-12-homepage-redesign.txt`
  - Failure on gate 5 (post links use `/` not `/blog/`): Todo 4 basePath fix missed — go back and fix Main.tsx
  - Failure on gate 8 (scope bleed): unexpected file modified — revert it and re-verify
    Commit: Y (see above — single atomic commit for the full PR)

## Final verification wave

> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for explicit okay before declaring complete.

- [ ] F1. Plan compliance audit — confirm every Scope IN item was delivered; no Scope OUT item was touched; diff matches expected file list
- [ ] F2. Code quality review — `yarn tsc --noEmit` exits 0; `npx eslint . --max-warnings=0` exits 0; no `any` types introduced; no `// eslint-disable` comments added
- [ ] F3. Real manual QA — navigate `/` in a browser (or Playwright headless): hero visible, focus areas visible, "Read the blog →" link present; navigate `/blog`: posts listed with `/blog/` prefixed links; click a post: URL is `/blog/[slug]`, MDX renders; click a tag filter on `/blog`: URL becomes `/blog?tag=…`, NOT `/?tag=…`; nav shows Home, Blog, Stream, About
- [ ] F4. Scope fidelity — `git diff --name-only origin/main...HEAD` contains ONLY the files listed in Scope IN; `data/blog/*.mdx` is untouched; `app/blog/[...slug]/page.tsx` is untouched

## Commit strategy

Three atomic commits on branch `feat/homepage-intro`:

1. `feat(data): add homepageData.ts + update siteMetadata + headerNavLinks` (Todos 1, 2, 3)
2. `refactor(Main): parameterize basePath prop for blog index reuse` (Todo 4)
3. `feat(routing): add /blog index page + fix sitemap` (Todos 5, 6)
4. `feat(homepage): add HomePage component + swap app/page.tsx` (Todos 7, 8)
5. `feat(header): render Home nav link; add per-page metadata` (Todos 9, 10)
6. `feat(stream): add homepage launch stream entry` (Todo 11)
7. PR opened (Todo 12)

> Note: commits 1–6 can be squashed to a single clean commit before the PR if preferred. The worker should keep them atomic until F-wave passes, then squash.

## Success criteria

- `out/index.html` exists and contains hero copy ("designing distributed systems")
- `out/blog/index.html` exists and contains at least one post link with `/blog/` prefix
- `out/sitemap.xml` contains `/blog`
- `out/feed.xml` exists (RSS unchanged)
- `yarn tsc --noEmit` exits 0
- `npx eslint . --max-warnings=0` exits 0
- Tag filter on `/blog` page navigates to `/blog?tag=…` (not `/?tag=…`) — G1 regression guard
- PR opened on `feat/homepage-intro` with `gh pr create`
- No files outside the Scope IN list are modified
