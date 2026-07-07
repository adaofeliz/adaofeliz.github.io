# Audio Player Enhancements

## Objective

Enhance the `InlineAudio` component with three features:

1. **Speed cycle button** — Cycle through 0.75x → 0.9x → 1x → 1.5x playback speeds
2. **Sticky player** — Pin to top of viewport when playing and scrolled past original position
3. **Expandable timeline scrubber** — Reveal a horizontal seek bar after the time display

All changes are scoped to `components/InlineAudio.tsx`. No other component files, context files, or layout files should be modified.

## Architecture Context

| File                                   | Role                                      | Modify?                  |
| -------------------------------------- | ----------------------------------------- | ------------------------ |
| `components/InlineAudio.tsx`           | Main audio player component               | **YES — primary target** |
| `components/AudioHighlightContext.tsx` | Context for time sync + word highlighting | NO                       |
| `layouts/PostLayout.tsx`               | Uses `<InlineAudio>` in post header       | NO                       |
| `layouts/PostBanner.tsx`               | Uses `<InlineAudio>` in banner layout     | NO                       |
| `layouts/PostSimple.tsx`               | Uses `<InlineAudio>` in simple layout     | NO                       |
| `css/tailwind.css`                     | Custom theme, z-index values              | NO                       |

### Current InlineAudio Structure (lines 110-181)

```
<div className="inline-flex items-center gap-2">   ← Root container
  <button>                                          ← Play/pause with SVG circular progress
    <svg>...</svg>                                   ← Progress ring (radius 18, 40x40 viewBox)
    {isPlaying ? <PauseIcon/> : <PlayIcon/>}
  </button>
  <span>                                            ← Time display: "0:32 / 4:15"
    {formatTime(currentTime)} / {formatTime(duration)}
  </span>
  <audio ref={audioRef} ... />                       ← Hidden audio element
</div>
```

### Key State & Refs (lines 7-14)

- `audioRef` → HTMLAudioElement ref
- `syncRafRef` → rAF ID for time sync loop
- `isPlaying` → local boolean
- `duration` → from loadedmetadata
- `currentTime` → from timeupdate
- Context integration: `setHighlightTime`, `setHighlightPlaying` from `useAudioHighlight()`

### Z-Index Conventions

- Header: `z-50` (when `stickyNav` enabled)
- Mobile nav overlay: `z-60`, panel: `z-70`, close button: `z-80`
- **Sticky audio player**: Use `z-40` — below header, above page content

## Design Decisions

| Decision          | Choice                                       | Rationale                                                                                                                 |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Sticky position   | `top` of viewport                            | User confirmed. Player is above post content, sticks when scrolling down.                                                 |
| Sticky z-index    | `z-40`                                       | Below header (`z-50`) so header always wins if both visible. Above normal content.                                        |
| Sticky top offset | `top-0`                                      | Header `stickyNav` is currently `false` in siteMetadata. If header becomes sticky later, change to `top-[header-height]`. |
| Sticky appearance | Identical to inline                          | User confirmed. Same controls, just pinned. Add background + shadow for visual separation.                                |
| Sticky background | `bg-white dark:bg-gray-950` with `shadow-sm` | Needed so scrolling content doesn't show through. Match site background colors.                                           |
| Speed button UI   | Cycle button (not dropdown)                  | User confirmed. Shows "1x", click cycles through speeds.                                                                  |
| Speed options     | `[0.75, 0.9, 1, 1.5]`                        | User specified exactly these values. Default is `1` (index 2).                                                            |
| Speed persistence | Reset to 1x per page load                    | No localStorage. Simple, no cross-page state needed.                                                                      |
| Timeline expand   | Button after time text                       | Expand icon toggles a horizontal `<input type="range">` filling remaining space.                                          |
| Timeline collapse | Manual toggle only                           | Stays expanded until user clicks collapse. Does NOT auto-collapse on pause.                                               |
| Scrubber element  | `<input type="range">`                       | Native keyboard support (arrow keys, Home/End). Styled with Tailwind. Accessible by default.                              |

## Implementation Plan

### Task 1: Add Speed Cycle Button

**File**: `components/InlineAudio.tsx`
**What**: Add a playback speed cycle button between the time display and (future) expand button.

**New state** (add after line 14):

```tsx
const SPEED_OPTIONS = [0.75, 0.9, 1, 1.5]
const [speedIndex, setSpeedIndex] = useState(2) // default 1x
```

**New handler** (add after `togglePlay` function, ~line 95):

```tsx
const cycleSpeed = (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length
  setSpeedIndex(nextIndex)
  if (audioRef.current) {
    audioRef.current.playbackRate = SPEED_OPTIONS[nextIndex]
  }
}
```

**New UI element** (insert after the time `<span>` on line 176, before `<audio>`):

```tsx
<button
  onClick={cycleSpeed}
  className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
  aria-label={`Playback speed ${SPEED_OPTIONS[speedIndex]}x. Click to change.`}
  title={`Speed: ${SPEED_OPTIONS[speedIndex]}x`}
>
  {SPEED_OPTIONS[speedIndex]}x
</button>
```

**Sync on play**: When audio starts playing, ensure playbackRate is applied. Add to the `handlePlay` callback (after line 43):

```tsx
if (audioRef.current) {
  audioRef.current.playbackRate = SPEED_OPTIONS[speedIndex]
}
```

Note: This is needed because some browsers reset playbackRate. Use a ref (`speedIndexRef`) to avoid stale closure in the event handler. Pattern: create `const speedIndexRef = useRef(2)` and update it in `cycleSpeed`. In `handlePlay`, read from `speedIndexRef.current`.

**QA Criteria**:

- [x] Speed button visible next to time display
- [x] Click cycles: 0.75x → 0.9x → 1x → 1.5x → 0.75x (wraps)
- [x] Button text updates to show current speed
- [x] Audio playback rate actually changes (verify via `audioRef.current.playbackRate`)
- [x] `aria-label` updates dynamically with current speed value
- [x] Default speed on page load is 1x
- [x] Speed persists when pausing and resuming within the same page

---

### Task 2: Add Expandable Timeline Scrubber

**File**: `components/InlineAudio.tsx`
**What**: Add an expand/collapse button after the speed button. When expanded, show a horizontal `<input type="range">` seek bar that fills the remaining space on the same line.

**New state** (add with other state):

```tsx
const [isTimelineExpanded, setIsTimelineExpanded] = useState(false)
```

**Toggle handler**:

```tsx
const toggleTimeline = (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  setIsTimelineExpanded((prev) => !prev)
}
```

**Seek handler**:

```tsx
const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newTime = parseFloat(e.target.value)
  if (audioRef.current) {
    audioRef.current.currentTime = newTime
  }
  setCurrentTime(newTime)
  setHighlightTime?.(newTime)
}
```

**UI changes to root container** — The root `<div>` must change from `inline-flex` to `flex` when the timeline is expanded so it can take full width:

```tsx
<div className={`flex items-center gap-2 ${isTimelineExpanded ? 'w-full' : 'inline-flex'}`}>
```

Wait — actually `inline-flex` with the range input using `flex-1` should work. But the parent container constrains width. Better approach: always use `flex items-center gap-2` and let the range input grow with `flex-1 min-w-0`. When collapsed, the div naturally shrinks to content width.

**Updated root container**:

```tsx
<div className="flex items-center gap-2" title="Listen to article">
```

**Expand/collapse button** (after speed button, before `<audio>`):

```tsx
<button
  onClick={toggleTimeline}
  className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
  aria-label={isTimelineExpanded ? 'Collapse timeline' : 'Expand timeline'}
  aria-expanded={isTimelineExpanded}
>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    {isTimelineExpanded ? (
      {/* ChevronLeft icon — collapse */}
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    ) : (
      {/* ChevronRight icon — expand */}
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    )}
  </svg>
</button>
```

**Timeline range input** (after expand button, before `<audio>`, conditionally rendered):

```tsx
{
  isTimelineExpanded && duration && (
    <input
      type="range"
      min={0}
      max={duration}
      step={0.1}
      value={currentTime}
      onChange={handleSeek}
      className="accent-primary-500 h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-700"
      aria-label="Seek audio position"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
    />
  )
}
```

**Styling note for range input**: The `accent-primary-500` works for the track fill in modern browsers. For cross-browser consistency with the terminal green theme, use these Tailwind-compatible styles:

- `appearance-none` removes default browser styling
- `accent-primary-500` colors the filled portion of the range
- The `h-1 rounded-full bg-gray-200 dark:bg-gray-700` handles the track background
- For the thumb, if more customization is needed, add a small CSS block in `tailwind.css` — but try without first; `accent-color` often suffices.

**QA Criteria**:

- [x] Expand button visible after speed button
- [x] Clicking expand shows a horizontal range input filling remaining line space
- [x] Clicking collapse hides the range input
- [x] Dragging the range input changes audio playback position
- [x] Time display updates in real-time while dragging
- [x] Word highlighting re-syncs after seeking via the scrubber
- [x] Range input has proper `aria-label`, `aria-valuetext`
- [x] Keyboard navigation works on the range input (Left/Right arrows, Home/End)
- [x] Range input progress reflects current playback position during normal playback

---

### Task 3: Implement Sticky Player on Scroll

**File**: `components/InlineAudio.tsx`
**What**: When audio is playing AND the player has been scrolled past its original position, pin it to the top of the viewport. When paused or scrolled back up, unstick.

**Why NOT pure CSS `position: sticky`**: CSS sticky works based on scroll position alone, not conditional on `isPlaying`. We need JavaScript to toggle between inline and fixed positioning based on TWO conditions: playing state + scroll threshold.

**Approach**: Use `IntersectionObserver` on a sentinel element at the player's original position. When the sentinel leaves the viewport (scrolled past) AND audio is playing, switch the player to `fixed top-0`.

**New state/refs**:

```tsx
const playerRef = useRef<HTMLDivElement>(null)
const sentinelRef = useRef<HTMLDivElement>(null)
const [isSticky, setIsSticky] = useState(false)
const isScrolledPast = useRef(false)
```

**IntersectionObserver setup** (add a new useEffect):

```tsx
useEffect(() => {
  const sentinel = sentinelRef.current
  if (!sentinel) return

  const observer = new IntersectionObserver(
    ([entry]) => {
      isScrolledPast.current = !entry.isIntersecting
      // Only become sticky if playing AND scrolled past
      setIsSticky(!entry.isIntersecting && isPlaying)
    },
    { threshold: 0 }
  )

  observer.observe(sentinel)
  return () => observer.disconnect()
}, [isPlaying])
```

**Also update sticky when isPlaying changes** — The observer callback already depends on `isPlaying` via the effect dependency. When `isPlaying` goes false, the effect re-runs: observer re-fires with current intersection state, and `!entry.isIntersecting && false` = false, so `isSticky` becomes false. This is correct.

**Updated JSX structure**:

```tsx
return (
  <>
    {/* Sentinel: marks the player's original position in the document flow */}
    <div ref={sentinelRef} className="h-0 w-0" aria-hidden="true" />

    {/* Player container: conditionally fixed when sticky */}
    <div
      ref={playerRef}
      className={`flex items-center gap-2 transition-shadow duration-200 ${
        isSticky
          ? 'fixed top-0 right-0 left-0 z-40 bg-white px-4 py-2 shadow-md sm:px-6 xl:px-0 dark:bg-gray-950'
          : ''
      } ${isTimelineExpanded ? '' : ''}`}
      style={isSticky ? { maxWidth: 'none' } : undefined}
      title="Listen to article"
    >
      {/* ... existing play button, time, speed, expand, scrubber, audio element ... */}
    </div>
  </>
)
```

**When sticky**, the player is pulled out of flow and positioned fixed at the top. Key styling when sticky:

- `fixed top-0 left-0 right-0` — Full viewport width at top
- `z-40` — Below header (z-50) but above content
- `bg-white dark:bg-gray-950` — Opaque background matching site background
- `shadow-md` — Visual separation from content below
- `px-4 py-2 sm:px-6` — Horizontal padding matching `SectionContainer` (which uses `px-4 sm:px-6`)
- Smooth transition via `transition-shadow duration-200`

**Important**: When the player becomes `fixed`, it leaves the document flow. This could cause a layout jump. To prevent this, when `isSticky` is true, the sentinel should reserve the height:

```tsx
<div ref={sentinelRef} className={isSticky ? 'h-10' : 'h-0 w-0'} aria-hidden="true" />
```

The `h-10` (40px) matches the approximate height of the player row. This prevents content from jumping up when the player becomes fixed.

**Centering the controls when sticky**: When fixed full-width, the controls should be centered to match the page's `max-w-3xl xl:max-w-5xl` content width. Wrap inner content:

```tsx
<div
  ref={playerRef}
  className={`${
    isSticky ? 'fixed top-0 right-0 left-0 z-40 bg-white shadow-md dark:bg-gray-950' : ''
  }`}
  title="Listen to article"
>
  <div
    className={`flex items-center gap-2 ${isSticky ? 'mx-auto max-w-3xl px-4 py-2 sm:px-6 xl:max-w-5xl xl:px-0' : ''}`}
  >
    {/* ... controls ... */}
  </div>
</div>
```

**QA Criteria**:

- [x] Player appears inline normally (not sticky) when page first loads
- [x] Player does NOT become sticky when paused, even if scrolled past
- [x] Player becomes sticky (pinned to top) when playing AND scrolled past original position
- [x] Player unsticks when paused while in sticky state
- [x] Player unsticks when scrolled back up to original position (even while still playing)
- [x] No layout jump when transitioning between sticky/non-sticky (sentinel reserves space)
- [x] Sticky player has opaque background (no see-through content)
- [x] Sticky player has subtle shadow for visual separation
- [x] Sticky player controls are centered to match content width (`max-w-3xl` / `xl:max-w-5xl`)
- [x] Z-index is below header (z-40 vs z-50)
- [x] Sticky player works correctly with all three features together (speed + timeline + sticky)
- [x] Dark mode: background is `gray-950`, shadow still visible

---

### Task 4: Integration Testing & Polish

**File**: `components/InlineAudio.tsx`
**What**: Verify all three features work together, fix edge cases.

**Edge cases to verify**:

1. **Speed + seek**: Changing speed while scrubbing should not reset position
2. **Sticky + expand timeline**: When sticky and timeline is expanded, the range input should still fill remaining space within the centered container
3. **Audio ends while sticky**: Player should unstick (isPlaying becomes false via `handleEnded`)
4. **Page has no audio**: If `audio` prop is missing, layouts don't render `InlineAudio` at all — no changes needed
5. **Mobile viewport**: Sticky full-width bar should look correct on small screens. Speed button and expand button may wrap — ensure `flex-wrap` is NOT used (keep single row, items shrink gracefully)
6. **Multiple speed changes**: Verify rapid clicking cycles correctly without getting out of sync

**Final element order in the player row**:

```
[Play/Pause Button] [Time Display] [Speed Button] [Expand Button] [Range Input (if expanded)] [Hidden <audio>]
```

**Build verification**:

```bash
npm run build
# Must exit 0 — static export must succeed
```

**QA Criteria**:

- [x] `npm run build` exits 0
- [x] All three features work independently
- [x] All three features work together (play audio, change speed, expand timeline, scroll down to trigger sticky, seek while sticky)
- [x] Dark mode renders correctly for all new elements
- [x] No TypeScript errors (run `npx tsc --noEmit`)
- [x] Player works identically in all 3 layouts (PostLayout, PostBanner, PostSimple) — no layout-specific changes needed since all use the same `<InlineAudio>` component

---

## Final Verification Wave

After all tasks complete, run:

```bash
npm run build       # Static export must succeed
npx tsc --noEmit    # No TypeScript errors
```

Open a post with audio in the browser and verify:

1. Play audio → speed button shows "1x" → click cycles through speeds
2. After time, click expand → horizontal seek bar appears → drag to seek
3. Scroll down while playing → player pins to top with background/shadow
4. Pause → player unsticks
5. Scroll back up → player is inline again in its original position
6. Dark mode: all elements properly themed

## Summary

- **Scope**: `components/InlineAudio.tsx` only
- **No new files**: All features added to existing component
- **No context changes**: `AudioHighlightContext` untouched
- **No layout changes**: All 3 layouts automatically get the enhancements
- **No new dependencies**: Uses native browser APIs (`playbackRate`, `IntersectionObserver`, `<input type="range">`)
