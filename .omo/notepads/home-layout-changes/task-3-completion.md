# Task 3: Fix Hard-coded /blog References - COMPLETED

## Status: ✅ COMPLETE

All required changes have been implemented and verified.

## Changes Made

### 1. components/Tag.tsx (Line 15)

```diff
- <Link href={`/blog?tag=${text}`} className={`${defaultStyles} ${className}`.trim()}>
+ <Link href={`/?tag=${text}`} className={`${defaultStyles} ${className}`.trim()}>
```

**Impact:** Tag links now navigate to home page with tag query parameter instead of /blog route.

### 2. layouts/PostLayout.tsx (Lines 121, 123, 125)

#### Line 121 - href attribute

```diff
- href={`/${basePath}`}
+ href="/"
```

#### Line 123 - aria-label attribute

```diff
- aria-label="Back to the blog"
+ aria-label="Back to home"
```

#### Line 125 - Link text

```diff
- &larr; Back to the blog
+ &larr; Back to home
```

**Impact:** Back-link now navigates to home page (/) instead of /blog route, with updated accessibility label and text.

## Verification Results

✅ All 4 line changes applied correctly
✅ Tag.tsx href changed to `/?tag=${text}`
✅ PostLayout.tsx href changed to `/`
✅ PostLayout.tsx aria-label changed to `Back to home`
✅ PostLayout.tsx link text changed to `← Back to home`
✅ Old `/blog?tag=` reference removed
✅ Old `Back to the blog` text removed

## Files Modified

- `components/Tag.tsx` - 1 line changed
- `layouts/PostLayout.tsx` - 3 lines changed

**Total changes:** 4 lines across 2 files

## Commit Status

**NOT YET COMMITTED** — Waiting for Wave 1 completion

According to the plan, this task should be committed together with Tasks 1, 2, and 4 in a single commit:

- **Message:** `refactor(layout): update header, nav, and fix /blog references`
- **Files:** components/Header.tsx, data/headerNavLinks.ts, components/Tag.tsx, layouts/PostLayout.tsx, data/siteMetadata.js, app/sitemap.ts

## Dependencies

- **Blocks:** Task 5 (Main.tsx refactoring needs correct Tag hrefs)
- **Blocks:** Final verification F1-F4
- **Blocked By:** None (completed independently)

## Evidence

- `.sisyphus/evidence/task-3-changes-summary.md` — Detailed change documentation

## Next Steps

1. Wait for Tasks 1, 2, 4 to complete
2. Create combined Wave 1 commit with all 6 files
3. Proceed to Task 5 (Main.tsx refactoring)
