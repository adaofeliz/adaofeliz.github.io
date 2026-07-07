# Task 3: Fix Hard-coded /blog References - Evidence

## Changes Completed

### 1. components/Tag.tsx (Line 15)

**Before:**

```tsx
<Link href={`/blog?tag=${text}`} className={`${defaultStyles} ${className}`.trim()}>
```

**After:**

```tsx
<Link href={`/?tag=${text}`} className={`${defaultStyles} ${className}`.trim()}>
```

**Impact:** Tag links now navigate to home page with tag query parameter instead of /blog route.

---

### 2. layouts/PostLayout.tsx (Lines 121, 123, 125)

#### Line 121 - href attribute

**Before:**

```tsx
href={`/${basePath}`}
```

**After:**

```tsx
href = '/'
```

#### Line 123 - aria-label attribute

**Before:**

```tsx
aria-label="Back to the blog"
```

**After:**

```tsx
aria-label="Back to home"
```

#### Line 125 - Link text

**Before:**

```tsx
&larr; Back to the blog
```

**After:**

```tsx
&larr; Back to home
```

**Impact:** Back-link now navigates to home page (/) instead of /blog route, with updated accessibility label and text.

---

## Verification Results

✅ Tag.tsx href changed to `/?tag=${text}`
✅ PostLayout.tsx href changed to `/`
✅ PostLayout.tsx aria-label changed to `Back to home`
✅ PostLayout.tsx link text changed to `← Back to home`
✅ Old `/blog?tag=` reference removed
✅ Old `Back to the blog` text removed

## Navigation Behavior

### Tag Links

- **Location:** Used in Main.tsx, PostLayout.tsx, ListLayout.tsx
- **Old behavior:** `/blog?tag=X` → /blog route
- **New behavior:** `/?tag=X` → home page with tag filter

### Back-link

- **Location:** PostLayout.tsx footer
- **Old behavior:** `/${basePath}` (evaluates to `/blog`) → /blog route
- **New behavior:** `/` → home page

## Rationale

These changes prepare the codebase for the deletion of the /blog route (Task 6). By updating all hard-coded references to use the home page (/) instead, we ensure:

1. Tag filtering works on the home page
2. Post back-links navigate to home instead of a deleted route
3. No broken links when /blog route is removed
4. Consistent navigation patterns across the site

## Files Modified

- `components/Tag.tsx` - 1 line changed
- `layouts/PostLayout.tsx` - 3 lines changed

**Total changes:** 4 lines across 2 files
