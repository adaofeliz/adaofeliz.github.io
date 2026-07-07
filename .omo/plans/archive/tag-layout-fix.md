# Move Post Tags to "Read More" Row

## TL;DR

> **Quick Summary**: Move the category tag from the post title row to the "Read more →" row in both the home page and blog page listings, formatted as `Technology | Read more →`. Also add the missing "Read more →" link to the blog page (ListLayout).
>
> **Deliverables**:
>
> - Updated `app/Main.tsx` — tag moved from title row to "Read more" row
> - Updated `layouts/ListLayout.tsx` — tag moved from title row + "Read more →" link added
>
> **Estimated Effort**: Quick
> **Parallel Execution**: YES — 2 waves (2 independent file edits → 1 verification)
> **Critical Path**: Task 1 + Task 2 (parallel) → Task 3 (verify)

---

## Context

### Original Request

Move post tags from the title line to before the "Read more →" link. Format: `Technology | Read more →`. The blog page (`/blog`) currently has no "Read more →" — add it there too.

### Current State

- **Home page (`app/Main.tsx`)**: Tag and title sit in a flex row together (line 38–48). "Read more →" exists below the summary (line 53–61) but has no tag.
- **Blog page (`layouts/ListLayout.tsx`)**: Tag and title sit in a flex row together (line 191–198). No "Read more →" link exists at all.

### Metis Review

**Identified Gaps** (addressed):

- Flex wrapper div becomes single-child after Tag removal → simplified/unwrapped in plan
- Separator `|` styling needs specification → muted gray span defined
- ListLayout must use `/${path}` not `/blog/${slug}` for href → explicitly noted
- `aria-label` on "Read more" link for accessibility → included in both files
- Existing duplicate dark hover classes in Main.tsx → mirrored as-is, not "fixed"

---

## Work Objectives

### Core Objective

Restructure the post listing layout so the category tag appears next to "Read more →" instead of next to the post title, across both the home page and blog page.

### Concrete Deliverables

- `app/Main.tsx` — tag moved to "Read more" row
- `layouts/ListLayout.tsx` — tag moved + "Read more →" link added

### Definition of Done

- [ ] `bun run build` exits 0 with no errors
- [ ] Tag does NOT appear in the title row on either page
- [ ] Tag appears next to "Read more →" on both pages, formatted as `Category | Read more →`
- [ ] "Read more →" link exists on the blog page (`/blog`)
- [ ] Tag link still navigates to `/blog?tag=<category>`
- [ ] "Read more →" link navigates to the correct post

### Must Have

- Tag displayed before "Read more →" with a `|` separator
- "Read more →" link in blog page (ListLayout) that didn't exist before
- Correct href patterns: Main.tsx uses `/blog/${slug}`, ListLayout uses `/${path}`
- `aria-label` on "Read more" links for accessibility

### Must NOT Have (Guardrails)

- DO NOT modify `components/Tag.tsx` or `lib/categories.ts`
- DO NOT touch the ListLayout category filter pills (lines 115–139)
- DO NOT touch "All Posts →" link at bottom of Main.tsx (lines 70–80)
- DO NOT change any existing spacing classes (`py-12`, `py-4`, `space-y-*`)
- DO NOT add or remove imports (all needed imports already exist in both files)
- DO NOT "fix" the duplicate `dark:hover:text-primary-400 dark:hover:text-primary-300` classes in Main.tsx — mirror existing code exactly
- DO NOT change the Pagination component in ListLayout
- DO NOT over-abstract: no new components, no utility functions, just move existing elements

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: Not applicable — this is a layout-only change
- **Automated tests**: None — visual/structural change
- **Framework**: N/A

### QA Policy

Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Structural**: Grep to verify Tag placement in source code
- **Build**: `bun run build` must exit 0
- **Visual**: Playwright screenshots of both pages

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — independent file edits):
├── Task 1: Move tag to "Read more" row in Main.tsx [quick]
└── Task 2: Add "Read more" row with tag in ListLayout.tsx [quick]

Wave 2 (After Wave 1 — build + visual verification):
└── Task 3: Build verification + Playwright visual QA [quick + playwright]

Wave FINAL (After ALL tasks — review):
├── Task F1: Plan compliance audit [oracle]
└── Task F2: Scope fidelity check [deep]

Critical Path: Task 1 + Task 2 (parallel) → Task 3 → Final
Parallel Speedup: Wave 1 runs both tasks simultaneously
Max Concurrent: 2 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
| ---- | ---------- | ------ |
| 1    | —          | 3      |
| 2    | —          | 3      |
| 3    | 1, 2       | F1, F2 |
| F1   | 3          | —      |
| F2   | 3          | —      |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 → `quick`, T2 → `quick`
- **Wave 2**: 1 task — T3 → `quick` + `playwright` skill
- **FINAL**: 2 tasks — F1 → `oracle`, F2 → `deep`

---

## TODOs

- [ ] 1. Move tag to "Read more" row in Main.tsx

  **What to do**:
  1. Remove `<Tag text={category} />` from the flex wrapper div (line 39 area)
  2. Simplify the wrapper div around the title: remove `flex flex-wrap items-center gap-2` classes since only the `<h2>` remains. Just use a plain `<div>`:
     ```tsx
     <div>
       <h2 className="text-2xl leading-8 font-bold tracking-tight">
         <Link href={`/blog/${slug}`} className="text-[#1e1e1e] dark:text-gray-100">
           {title}
         </Link>
       </h2>
     </div>
     ```
  3. In the "Read more" div (line 53 area), convert it to a flex row and add Tag + separator before the existing Link:
     ```tsx
     <div className="flex items-center gap-2 text-base leading-6 font-medium">
       <Tag text={category} />
       <span className="text-gray-400 dark:text-gray-500">|</span>
       <Link
         href={`/blog/${slug}`}
         className="text-primary-600 hover:text-primary-700 dark:hover:text-primary-400 dark:hover:text-primary-300"
         aria-label={`Read more: "${title}"`}
       >
         Read more &rarr;
       </Link>
     </div>
     ```

  **Must NOT do**:
  - DO NOT change the href pattern — keep `/blog/${slug}`
  - DO NOT modify the "All Posts →" link at bottom (lines 70–80)
  - DO NOT touch imports — `Tag`, `Link`, `getPostCategory` are already imported
  - DO NOT change spacing classes on parent elements
  - DO NOT "fix" the duplicate dark hover class — leave as-is

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file edit, ~15 lines changed, straightforward restructuring
  - **Skills**: `[]`
    - No special skills needed — standard JSX editing
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for implementation, only for verification task
    - `frontend-ui-ux`: Overkill — this is moving existing elements, not designing new UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `app/Main.tsx:53-61` — Current "Read more" div structure. This is what you're modifying: add `flex items-center gap-2` to the outer div, insert Tag + separator before the Link
  - `app/Main.tsx:38-48` — Current flex wrapper with Tag + title. Remove Tag from here, simplify the div

  **API/Type References**:
  - `components/Tag.tsx` — Tag component accepts `text: Category` prop, renders a Link. Use as `<Tag text={category} />`
  - `lib/categories.ts` — `getPostCategory(tags)` already called at line 25, `category` variable already exists

  **WHY Each Reference Matters**:
  - Main.tsx:53-61 is the exact section being modified — copy the existing Link attributes exactly
  - Main.tsx:38-48 is what's being dismantled — ensure only the Tag is removed, heading stays intact

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tag removed from title row in source
    Tool: Bash (grep)
    Preconditions: Task 1 edits applied to app/Main.tsx
    Steps:
      1. Run: grep -n '<Tag' app/Main.tsx
      2. Check the line number context — Tag should appear inside the "Read more" div section (near the Link with "Read more" text), NOT inside the heading section
      3. Run: grep -n 'flex flex-wrap items-center' app/Main.tsx
      4. Verify the title wrapper no longer has flex-wrap classes (the old wrapper around Tag + h2 should be simplified)
    Expected Result: <Tag appears only once, in the "Read more" section. No flex-wrap on the title div
    Failure Indicators: <Tag appears near <h2> heading, or flex-wrap exists on a div containing only the heading
    Evidence: .sisyphus/evidence/task-1-grep-tag-placement.txt

  Scenario: Build succeeds
    Tool: Bash
    Preconditions: Task 1 edits applied
    Steps:
      1. Run: bun run build
    Expected Result: Exit code 0, no TypeScript errors
    Failure Indicators: Non-zero exit code, type errors mentioning Main.tsx
    Evidence: .sisyphus/evidence/task-1-build-output.txt
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `fix(blog): move tag from title row to read-more row`
  - Files: `app/Main.tsx`, `layouts/ListLayout.tsx`
  - Pre-commit: `bun run build`

---

- [ ] 2. Add "Read more" row with tag in ListLayout.tsx

  **What to do**:
  1. Remove `<Tag text={category} />` from the flex wrapper div (line 192 area)
  2. Simplify the wrapper div around the title: remove `flex flex-wrap items-center gap-2` classes since only the `<h3>` remains. Just use a plain `<div>`:
     ```tsx
     <div>
       <h3 className="text-2xl leading-8 font-bold tracking-tight">
         <Link href={`/${path}`} className="text-gray-900 dark:text-gray-100">
           {title}
         </Link>
       </h3>
     </div>
     ```
  3. After the summary div (around line 199–201), add a new "Read more" section with Tag + separator + Link:
     ```tsx
     <div className="flex items-center gap-2 text-base leading-6 font-medium">
       <Tag text={category} />
       <span className="text-gray-400 dark:text-gray-500">|</span>
       <Link
         href={`/${path}`}
         className="text-primary-600 hover:text-primary-700 dark:hover:text-primary-400 dark:hover:text-primary-300"
         aria-label={`Read more: "${title}"`}
       >
         Read more &rarr;
       </Link>
     </div>
     ```

  **Must NOT do**:
  - DO NOT use `/blog/${slug}` — ListLayout uses `/${path}` pattern (matching existing line 194)
  - DO NOT touch the category filter pills (lines 115–139)
  - DO NOT touch the Pagination component
  - DO NOT touch imports — `Tag`, `Link`, `getPostCategory` are already imported
  - DO NOT change the existing `space-y-3` on the parent div (line 190)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file edit, ~20 lines changed, follows pattern established in Task 1
  - **Skills**: `[]`
    - No special skills needed — standard JSX editing
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for implementation, only for verification task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `app/Main.tsx:53-61` — The "Read more" pattern to replicate. Copy the structure but use `/${path}` instead of `/blog/${slug}` for the href
  - `layouts/ListLayout.tsx:191-198` — Current flex wrapper with Tag + title. Remove Tag from here, simplify the div
  - `layouts/ListLayout.tsx:194` — Shows the existing href pattern `/${path}` — MUST use this same pattern for "Read more" link

  **API/Type References**:
  - `components/Tag.tsx` — Tag component accepts `text: Category` prop. Use as `<Tag text={category} />`
  - `layouts/ListLayout.tsx:179-180` — Destructuring shows `path` is available from `post`, and `category` is derived from `getPostCategory(tags)`

  **WHY Each Reference Matters**:
  - Main.tsx:53-61 is the template to follow for the "Read more" structure (className, aria-label pattern)
  - ListLayout.tsx:194 proves the href pattern is `/${path}` — critical to get right
  - ListLayout.tsx:191-198 is what's being restructured — understand the current nesting

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tag removed from title row and "Read more" added in source
    Tool: Bash (grep)
    Preconditions: Task 2 edits applied to layouts/ListLayout.tsx
    Steps:
      1. Run: grep -n '<Tag' layouts/ListLayout.tsx
      2. Check the line number — Tag should appear near "Read more" text, NOT near the <h3> heading
      3. Run: grep -n 'Read more' layouts/ListLayout.tsx
      4. Verify "Read more" text exists in the file (it didn't before)
      5. Run: grep -n 'flex flex-wrap items-center' layouts/ListLayout.tsx
      6. Verify the title wrapper no longer has flex-wrap classes
    Expected Result: Tag appears once near "Read more". "Read more" text exists. No flex-wrap on title div
    Failure Indicators: Tag near <h3>, no "Read more" text, flex-wrap still on title wrapper
    Evidence: .sisyphus/evidence/task-2-grep-tag-placement.txt

  Scenario: Correct href pattern used
    Tool: Bash (grep)
    Preconditions: Task 2 edits applied
    Steps:
      1. Run: grep -A2 'Read more' layouts/ListLayout.tsx
      2. Verify the Link href uses `/${path}` pattern, NOT `/blog/${slug}`
    Expected Result: href contains `/${path}` template literal
    Failure Indicators: href contains `/blog/${slug}` or hardcoded path
    Evidence: .sisyphus/evidence/task-2-grep-href-pattern.txt

  Scenario: Build succeeds
    Tool: Bash
    Preconditions: Task 2 edits applied
    Steps:
      1. Run: bun run build
    Expected Result: Exit code 0, no TypeScript errors
    Failure Indicators: Non-zero exit code, type errors mentioning ListLayout.tsx
    Evidence: .sisyphus/evidence/task-2-build-output.txt
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `fix(blog): move tag from title row to read-more row`
  - Files: `app/Main.tsx`, `layouts/ListLayout.tsx`
  - Pre-commit: `bun run build`

---

- [ ] 3. Build verification + Playwright visual QA

  **What to do**:
  1. Run `bun run build` and verify it succeeds
  2. Start the dev server (`bun run dev` or `next dev`)
  3. Use Playwright to verify both pages visually

  **Must NOT do**:
  - DO NOT modify any files — this is verification only
  - DO NOT skip any scenario

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification only — no implementation, just running checks
  - **Skills**: [`playwright`]
    - `playwright`: Required for browser automation to verify visual layout and link navigation
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — we're verifying, not designing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: F1, F2
  - **Blocked By**: Task 1, Task 2

  **References**:

  **Pattern References**:
  - `app/Main.tsx` — Final state after Task 1: tag should be in "Read more" row
  - `layouts/ListLayout.tsx` — Final state after Task 2: tag + "Read more →" added

  **WHY Each Reference Matters**:
  - Need to know what the expected visual output looks like to verify against

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Home page — tag appears in "Read more" row, not title row
    Tool: Playwright
    Preconditions: Dev server running at localhost:3000, Tasks 1 and 2 completed
    Steps:
      1. Navigate to http://localhost:3000
      2. Wait for page load (wait for selector: 'article')
      3. Take full-page screenshot
      4. For the first post listing, verify the tag text (e.g., "Technology" or "Life") appears on the same visual line as "Read more →", separated by "|"
      5. Verify the tag text does NOT appear on the same line as the post title
    Expected Result: Each post shows title on its own line. Below the summary, "Category | Read more →" appears
    Failure Indicators: Tag still next to title, or "Read more →" missing, or no "|" separator visible
    Evidence: .sisyphus/evidence/task-3-home-page.png

  Scenario: Blog page — tag + "Read more" row exists
    Tool: Playwright
    Preconditions: Dev server running at localhost:3000
    Steps:
      1. Navigate to http://localhost:3000/blog
      2. Wait for page load (wait for selector: 'article')
      3. Take full-page screenshot
      4. For the first post listing, verify "Read more →" text is visible (it wasn't before)
      5. Verify tag text appears on the same line as "Read more →" with "|" separator
      6. Verify tag does NOT appear on the same line as the post title
    Expected Result: Each post shows "Category | Read more →" below the summary. Tag not in title row
    Failure Indicators: No "Read more →" visible, tag still in title row, missing separator
    Evidence: .sisyphus/evidence/task-3-blog-page.png

  Scenario: Tag link navigation works
    Tool: Playwright
    Preconditions: Dev server running, on /blog page
    Steps:
      1. Navigate to http://localhost:3000/blog
      2. Find the first tag link in a "Read more" row (e.g., link text "Technology")
      3. Click the tag link
      4. Wait for navigation
      5. Verify URL contains /blog?tag= parameter
      6. Take screenshot
    Expected Result: URL is http://localhost:3000/blog?tag=<category>, page shows filtered posts
    Failure Indicators: 404, no tag parameter in URL, broken navigation
    Evidence: .sisyphus/evidence/task-3-tag-navigation.png

  Scenario: "Read more" link navigation works on blog page
    Tool: Playwright
    Preconditions: Dev server running, on /blog page
    Steps:
      1. Navigate to http://localhost:3000/blog
      2. Find the first "Read more →" link
      3. Click it
      4. Wait for navigation
      5. Verify URL changed to a blog post path (e.g., /blog/some-post-slug)
      6. Verify the post page loaded (check for article content)
      7. Take screenshot
    Expected Result: Navigates to the correct blog post page, post content visible
    Failure Indicators: 404, wrong post, broken link
    Evidence: .sisyphus/evidence/task-3-readmore-navigation.png
  ```

  **Commit**: NO (verification only)

---

## Final Verification Wave

> 2 review agents run in PARALLEL. Both must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, check DOM). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff (`git diff`). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
      Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Single commit** after Tasks 1 + 2 verified by Task 3:
  - Message: `fix(blog): move tag from title row to read-more row`
  - Files: `app/Main.tsx`, `layouts/ListLayout.tsx`
  - Pre-commit: `bun run build`

---

## Success Criteria

### Verification Commands

```bash
bun run build           # Expected: exit 0, no errors
grep -n '<Tag' app/Main.tsx          # Expected: appears near "Read more", not near <h2>
grep -n '<Tag' layouts/ListLayout.tsx # Expected: appears near "Read more", not near <h3>
grep -n 'Read more' layouts/ListLayout.tsx  # Expected: found (didn't exist before)
```

### Final Checklist

- [ ] Tag NOT in title row on home page
- [ ] Tag NOT in title row on blog page
- [ ] `Category | Read more →` visible on home page
- [ ] `Category | Read more →` visible on blog page
- [ ] Tag links navigate to `/blog?tag=<category>`
- [ ] "Read more →" links navigate to correct post
- [ ] Build succeeds with zero errors
- [ ] No files modified beyond Main.tsx and ListLayout.tsx
