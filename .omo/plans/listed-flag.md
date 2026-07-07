# Work Plan: `listed` Frontmatter Flag

## Objective

Add a `listed: true/false` frontmatter flag to blog posts. Posts with `listed: false` are excluded from the default home-page listing but remain accessible via direct URL and tag-filtered views. Also remove the AI-category filter from the default listing.

## Confirmed User Decisions

| Decision              | Answer                                                                              |
| --------------------- | ----------------------------------------------------------------------------------- |
| RSS feed              | Exclude `listed: false` posts from `feed.xml`                                       |
| Tag-filtered views    | `listed: false` only hidden from default view; still visible via `/?tag=<category>` |
| Prev/next navigation  | Skip unlisted posts in prev/next; current post accessible even if unlisted          |
| Search engine noindex | Add `robots: { index: false, follow: false }` to unlisted posts                     |
| Stream document type  | Blog only — skip Stream                                                             |

## Key Technical Decisions

- **Filter predicate**: `post.listed !== false` (treats `undefined` as listed — mirrors `draft` pattern)
- **`listed` field**: `{ type: 'boolean' }`, **no `default` key** (same as `draft` in this codebase)
- **Filtering placement**: `app/Main.tsx` client-side only (NOT `app/page.tsx`), so tag views still show unlisted posts
- **`app/page.tsx`**: **No changes** — passes all non-draft posts to `<Main />`
- **`app/blog/[...slug]/page.tsx`**: `generateStaticParams` unchanged (direct URLs kept working)

---

## Files to Modify

| File                           | What changes                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `contentlayer.config.ts`       | Add `listed` field to `Blog` document type (line 84 area)                                               |
| `app/Main.tsx`                 | Replace lines 98–102 `filteredPosts` useMemo: remove AI exclusion, add `listed` filter for default view |
| `app/sitemap.ts`               | Line 11: add `&& post.listed !== false` to filter                                                       |
| `scripts/rss.mjs`              | Line 38: add `&& post.listed !== false` to filter                                                       |
| `app/blog/[...slug]/page.tsx`  | Lines 78–85: skip unlisted in prev/next; add `robots` to `generateMetadata`                             |
| `data/blog/_test-unlisted.mdx` | New QA fixture (temporary; delete after merge)                                                          |

---

## Detailed Changes

### 1. `contentlayer.config.ts`

In the `Blog` document type `fields` (line 84), add after `draft`:

```typescript
// BEFORE (line 84):
draft: { type: 'boolean' },

// AFTER:
draft: { type: 'boolean' },
listed: { type: 'boolean' },
```

Do NOT add to `Stream` or `Authors`.

---

### 2. `app/Main.tsx`

Replace the `filteredPosts` useMemo (lines 98–102):

```typescript
// BEFORE:
const filteredPosts = useMemo(() => {
  if (activeTag === 'ai') return posts.filter((post) => getPostCategory(post.tags) === 'ai')
  if (!activeTag) return posts.filter((post) => getPostCategory(post.tags) !== 'ai')
  return posts.filter((post) => getPostCategory(post.tags) === activeTag)
}, [posts, activeTag])

// AFTER:
const filteredPosts = useMemo(() => {
  if (activeTag) return posts.filter((post) => getPostCategory(post.tags) === activeTag)
  return posts.filter((post) => post.listed !== false)
}, [posts, activeTag])
```

**What this does:**

- Removes the AI-category exclusion from the default view
- When `activeTag` is set: shows all posts matching that category (including unlisted ones — per Q2)
- Default view (no tag): hides `listed: false` posts

Do NOT touch any other lines in `Main.tsx`.

---

### 3. `app/sitemap.ts`

Line 11, add `listed` filter:

```typescript
// BEFORE:
const blogRoutes = allBlogs.filter((post) => !post.draft)

// AFTER:
const blogRoutes = allBlogs.filter((post) => !post.draft && post.listed !== false)
```

---

### 4. `scripts/rss.mjs`

Line 38, add `listed` filter:

```javascript
// BEFORE:
const publishPosts = allBlogs.filter((post) => post.draft !== true)

// AFTER:
const publishPosts = allBlogs.filter((post) => post.draft !== true && post.listed !== false)
```

---

### 5. `app/blog/[...slug]/page.tsx`

**Change A — `generateMetadata` (return statement, line 52)**:

Add `robots` field to the returned `Metadata` object:

```typescript
// BEFORE:
return {
  title: post.title,
  description: post.summary,
  openGraph: { ... },
}

// AFTER:
return {
  title: post.title,
  description: post.summary,
  ...(post.listed === false && { robots: { index: false, follow: false } }),
  openGraph: { ... },
}
```

**Change B — `Page()` function, prev/next (lines 78–85)**:

Filter `sortedCoreContents` so prev/next skip unlisted posts, but keep the current post accessible even if it's unlisted:

```typescript
// BEFORE (lines 78–85):
const sortedCoreContents = allCoreContent(sortPosts(allBlogs))
const postIndex = sortedCoreContents.findIndex((p) => p.slug === slug)
if (postIndex === -1) {
  return notFound()
}

const prev = sortedCoreContents[postIndex + 1]
const next = sortedCoreContents[postIndex - 1]

// AFTER:
const allSortedCoreContents = allCoreContent(sortPosts(allBlogs))
const sortedCoreContents = allSortedCoreContents.filter(
  (p) => p.listed !== false || p.slug === slug
)
const postIndex = sortedCoreContents.findIndex((p) => p.slug === slug)
if (postIndex === -1) {
  return notFound()
}

const prev = sortedCoreContents[postIndex + 1]
const next = sortedCoreContents[postIndex - 1]
```

**Why the `|| p.slug === slug` clause**: an unlisted post accessed directly stays in the list (no 404), but ALL OTHER unlisted posts are filtered out of prev/next computation.

Do NOT touch `generateStaticParams` (line 70–72).

---

### 6. `data/blog/_test-unlisted.mdx` (QA fixture)

```mdx
---
title: Test Unlisted Post
date: '2026-05-26'
tags: ['technology']
summary: Temporary QA fixture for testing the listed:false feature.
listed: false
---

This post tests the `listed: false` frontmatter flag. It should not appear in the default post listing but should be accessible via its direct URL and via the technology tag filter.
```

Slug will be `_test-unlisted` (derived from filename by Contentlayer).
**Delete this file after the PR is merged.**

---

## Acceptance Criteria

All must be verified by executing commands (no manual browser checks):

| #    | Criterion                                    | Command / Assertion                                                               |
| ---- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| AC1  | `listed` field accepted by Contentlayer      | `bun run build` exits 0                                                           |
| AC2  | Existing listed posts still show on `/`      | `curl -s http://localhost:3000/` contains `href="/blog/` links                    |
| AC3  | `_test-unlisted` NOT in default list         | `curl -s http://localhost:3000/` does NOT contain `_test-unlisted`                |
| AC4  | Direct URL of unlisted post returns 200      | `curl -sI http://localhost:3000/blog/_test-unlisted` → HTTP 200                   |
| AC5  | Unlisted post accessible and renders content | `curl -s http://localhost:3000/blog/_test-unlisted` contains `Test Unlisted Post` |
| AC6  | Unlisted post visible via tag filter         | `curl -s 'http://localhost:3000/?tag=technology'` contains `_test-unlisted`       |
| AC7  | AI posts visible in default `/`              | `curl -s http://localhost:3000/` contains AI-tagged post content                  |
| AC8  | Noindex meta on unlisted post page           | `curl -s http://localhost:3000/blog/_test-unlisted` contains `noindex`            |
| AC9  | Sitemap excludes unlisted post               | After `bun run build`: sitemap route does NOT contain `_test-unlisted`            |
| AC10 | RSS excludes unlisted post                   | After `bun run build`: `public/feed.xml` does NOT contain `_test-unlisted`        |
| AC11 | LSP diagnostics clean                        | `lsp_diagnostics` on all 5 modified files → 0 errors                              |
| AC12 | Build + lint pass                            | `bun run build && bun run lint` → exit code 0                                     |

---

## Execution Waves

### Wave 1 — Schema + QA fixture (sequential)

1. Edit `contentlayer.config.ts` — add `listed` to Blog fields
2. Create `data/blog/_test-unlisted.mdx` — QA fixture
3. Run `rm -rf .contentlayer` to force Contentlayer regeneration
4. Run `bun run build` — verify types regenerate and build succeeds

### Wave 2 — Filtering and SEO (parallel, after Wave 1)

Run tasks 5–7 in parallel:

5. Edit `app/Main.tsx` — replace `filteredPosts` useMemo (lines 98–102)
6. Edit `app/sitemap.ts` (line 11) + `scripts/rss.mjs` (line 38)
7. Edit `app/blog/[...slug]/page.tsx` — Change A (`generateMetadata`) + Change B (prev/next filtering)

### Wave 3 — QA gate (after Wave 2)

8. Start dev server (`bun run dev`)
9. Run all 12 ACs (curl commands + build verification)
10. `lsp_diagnostics` on all modified files
11. `bun run build && bun run lint`

### Wave 4 — Ship

12. Create branch `feat/listed-frontmatter-flag`
13. Commit in 3 atomic commits:
    - `feat(contentlayer): add listed boolean field to Blog schema`
    - `feat(home): remove AI filter and add listed-post filtering for default view`
    - `feat(seo): exclude listed:false posts from sitemap, rss; add noindex meta and skip in prev/next`
14. Push branch + `gh pr create`

---

## Guardrails (MUST NOT)

- MUST NOT modify any existing `data/blog/*.mdx` files
- MUST NOT touch `generateStaticParams` in `app/blog/[...slug]/page.tsx`
- MUST NOT add `listed` to `Stream` or `Authors` document types
- MUST NOT extract a helper function — inline `post.listed !== false` predicate
- MUST NOT add a UI "Unlisted" badge/banner on unlisted posts
- MUST NOT touch `lib/categories.ts`
- MUST NOT change `ActivityTracker` data source (uses full `posts` — reflects cadence, not discoverability)
- MUST NOT push directly to `main`
- MUST NOT run `bun add` or modify any dependencies
- MUST NOT rename or merge the `draft` field with `listed` (they have different semantics)
- MUST NOT remove the `<Link href="/?tag=ai">AI</Link>` link in the `Main.tsx` intro paragraph (lines 129–134)
- MUST NOT modify `app/page.tsx` — no filtering needed there

## Critical Path

`Wave 1 (steps 1–4)` → `Wave 2 (steps 5–7 in parallel)` → `Wave 3 (QA)` → `Wave 4 (ship)`
