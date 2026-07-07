# Tag Layout Fix - Learnings & Conventions

## Conventions

- Use `/${path}` in ListLayout, `/blog/${slug}` in Main.tsx
- Separator: `<span className="text-gray-400 dark:text-gray-500">|</span>`
- Keep existing dark hover classes as-is (don't "fix" duplicates)
- Simplify flex wrappers to plain divs after Tag removal

## Patterns

- "Read more" row structure: `flex items-center gap-2` wrapper with Tag + span + Link
- aria-label pattern: `aria-label={\`Read more: "${title}"\`}`

## Gotchas

- ListLayout uses `path`, Main.tsx uses `slug` — don't mix them up
- Both files already have all needed imports
- Don't touch category filter pills in ListLayout (lines 115-139)

## Task 1: Tag Layout Refactor (COMPLETED)

### Changes Applied

- Removed `<Tag text={category} />` from title wrapper (line 38-48)
- Simplified title wrapper div: changed `<div className="flex flex-wrap items-center gap-2">` to plain `<div>`
- Added flex layout to "Read more" div: `className="flex items-center gap-2 text-base leading-6 font-medium"`
- Inserted Tag + separator before Link in "Read more" section:
  ```tsx
  <Tag text={category} />
  <span className="text-gray-400 dark:text-gray-500">|</span>
  ```

### Verification

- ✅ grep confirms Tag now appears at line 53 (in "Read more" section, not title)
- ✅ Build passes successfully with no errors
- ✅ All imports already present (Tag, Link, getPostCategory)
- ✅ No changes to href patterns or other components

### Key Learnings

- Flex wrapper simplification works cleanly when only h2 remains
- Separator span uses consistent gray color scheme (text-gray-400 dark:text-gray-500)
- Tag placement in "Read more" row creates better visual hierarchy

## Task 2: ListLayout Tag Movement (COMPLETED)

### Changes Applied

- Removed `<Tag text={category} />` from title wrapper (line 191-192)
- Simplified title wrapper div: changed `<div className="flex flex-wrap items-center gap-2">` to plain `<div>`
- Added new "Read more" section after summary div (lines 201-211):
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

### Verification

- ✅ grep confirms Tag now appears at line 202 (in "Read more" section, not title)
- ✅ grep confirms "Read more" text appears at line 209
- ✅ grep confirms href pattern uses `/${path}` at lines 193 and 205
- ✅ Build passes successfully with no errors
- ✅ All imports already present (Tag, Link, getPostCategory)
- ✅ No changes to category filter pills or pagination

### Key Learnings

- ListLayout structure: date (dl) → title (h3) → summary (prose) → read more (flex)
- Flex wrapper simplification works cleanly when only h3 remains inside
- "Read more" row uses consistent spacing: `gap-2` with `text-base leading-6 font-medium`
- Separator span uses consistent gray color scheme (text-gray-400 dark:text-gray-500)
- Tag placement in "Read more" row creates better visual hierarchy and cleaner title area

## Task 3: Visual Verification (Completed)

### Verification Method

- Used HTML inspection via curl to verify layout structure
- Confirmed tag placement in "Read more" row across both pages
- Validated link structures and navigation paths
- No file modifications needed (verification only)

### Key Findings

1. **Home Page**: Tag layout correctly shows `Category | Read more →` format
2. **Blog Page**: Tag layout correctly shows `Category | Read more →` format with "Read more →" text visible
3. **Tag Navigation**: All tag links correctly navigate to `/blog?tag=<category>`
4. **Read More Navigation**: All "Read more" links correctly navigate to blog post pages

### HTML Structure Verified

```html
<div class="flex items-center gap-2 text-base leading-6 font-medium">
  <a href="/blog/?tag=fitness">Fitness</a>
  <span class="text-gray-400 dark:text-gray-500">|</span>
  <a href="/blog/post-slug/">Read more →</a>
</div>
```

### Verification Status

✅ All checks passed - tag layout changes are working correctly on both home and blog pages.
