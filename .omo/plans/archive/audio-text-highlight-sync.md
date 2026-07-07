# Plan: Audio-Text Highlight Sync (Karaoke-Style)

## Objective

Add word-by-word text highlighting synchronized with audio playback on blog posts. When the audio narration plays, each word in the blog post body highlights inline as it's spoken.

## Success Criteria

- When audio plays, the currently spoken word is visually highlighted in the post body
- Highlighting tracks accurately with audio playback (play, pause, seek, resume all work)
- Posts without timestamp data render normally (graceful degradation)
- InlineAudio on homepage (Main.tsx) continues working unchanged
- No visual flash/jank during highlighting transitions
- Code blocks, inline code are excluded from highlighting
- Works on all 3 post layouts: PostLayout, PostBanner, PostSimple

## Scope

**IN**: Timestamp generation pipeline, highlighting component, audio-text sync via React context, all existing + new posts
**OUT**: Auto-scroll to current paragraph (Phase 2), real-time streaming TTS, mobile-specific gestures

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Blog Post Page                               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              AudioHighlightProvider (React Context)          │ │
│  │                                                               │ │
│  │  State: currentTime, isPlaying, timestampData                │ │
│  │                                                               │ │
│  │  ┌──────────────┐    ┌──────────────────────────────────┐   │ │
│  │  │ InlineAudio  │───▶│ Reports currentTime to context   │   │ │
│  │  │ (enhanced)   │    └──────────────────────────────────┘   │ │
│  │  └──────────────┘                                             │ │
│  │                                                               │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │ HighlightableContent                                  │   │ │
│  │  │  - Wraps MDX children                                 │   │ │
│  │  │  - Walks DOM text nodes, wraps words in <span>        │   │ │
│  │  │  - Reads currentTime from context                     │   │ │
│  │  │  - Binary search → active word index                  │   │ │
│  │  │  - Applies .audio-highlight class to active word      │   │ │
│  │  └──────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Key Technical Decisions

1. **Timestamp source**: ElevenLabs `/v1/text-to-speech/{voice_id}/with-timestamps` endpoint (character-level timestamps, compute word boundaries)
2. **Timestamp storage**: JSON file on R2 alongside MP3, URL in frontmatter as `audioTimestamps` field
3. **Text matching strategy**: Canonical tokenizer shared between generation script and runtime — strip markdown → normalize whitespace → split on word boundaries (regex `\b\w+\b` aware of punctuation)
4. **Highlighting mechanism**: DOM-based word wrapping post-render (not MDX component replacement), using `requestAnimationFrame` for smooth updates
5. **Sync transport**: React Context (`AudioHighlightProvider`) shared between `InlineAudio` and `HighlightableContent`
6. **Performance**: Only activate highlighting per-paragraph (observe which paragraph is "current"), binary search on timestamp array

## Timestamp JSON Schema

```json
{
  "version": 1,
  "words": [
    { "word": "Every", "start": 0.0, "end": 0.28 },
    { "word": "blog", "start": 0.3, "end": 0.55 },
    { "word": "needs", "start": 0.57, "end": 0.82 }
  ],
  "sourceText": "Every blog needs a first post..."
}
```

The `sourceText` field stores the exact plain text sent to ElevenLabs, enabling runtime alignment validation.

---

## Task Wave 1: Foundation — Timestamp Pipeline

<!-- TASKS_START -->

### Task 1.1: Add `audioTimestamps` field to Contentlayer Blog schema

**File**: `contentlayer.config.ts`
**Action**: Add new field to Blog document type

Add after line 91 (`audio: { type: 'string' },`):

```typescript
audioTimestamps: { type: 'string' },
```

**QA**:

- Run `npx contentlayer2 build` — must succeed with no schema errors
- Verify generated types include `audioTimestamps?: string` in Blog type

---

### Task 1.2: Update `generate-audio.mjs` to use timestamps endpoint

**File**: `scripts/generate-audio.mjs`
**Action**: Replace the `generateTTS` function and add word boundary computation

**Changes**:

1. **Replace `generateTTS` function** (lines 35-61) to call `/with-timestamps` endpoint:
   - Change URL from `/v1/text-to-speech/${VOICE_ID}` to `/v1/text-to-speech/${VOICE_ID}/with-timestamps`
   - Change `Accept` header from `audio/mpeg` to `application/json`
   - Parse JSON response: `{ audio_base64, alignment: { characters, character_start_times_seconds, character_end_times_seconds } }`
   - Return `{ audioBuffer: Buffer.from(audio_base64, 'base64'), alignment }` instead of just `response.arrayBuffer()`

2. **Add `computeWordTimestamps(text, alignment)` function**:
   - Input: the text string sent to ElevenLabs + the character-level alignment
   - Logic: Walk through `alignment.characters` array. Track character index. When encountering a space (or sequence of non-word characters), emit a word entry with `{ word, start: character_start_times_seconds[wordStartCharIdx], end: character_end_times_seconds[wordEndCharIdx] }`. Handle punctuation attached to words (e.g., "world." → word is "world", punctuation is skipped for timing but word end is at the last letter).
   - Use a proper tokenizer approach: iterate characters, accumulate word buffer, emit on whitespace/punctuation boundaries. Do NOT use naive `split(' ')`.
   - Output: `{ version: 1, words: [...], sourceText: text }`

3. **Update `processFile` function** (lines 63-119):
   - After generating TTS, extract `audioBuffer` and `alignment` from new return format
   - Call `computeWordTimestamps(textToRead, alignment)` to get word timestamps
   - Upload MP3 to R2 (same as before, using the decoded audioBuffer)
   - Upload JSON to R2 as `${slug}-timestamps.json` with `ContentType: 'application/json'`
   - Update frontmatter to include both `audio` and `audioTimestamps` URLs:
     ```
     parsed.data.audio = `${PUBLIC_AUDIO_URL_BASE}/${slug}.mp3`
     parsed.data.audioTimestamps = `${PUBLIC_AUDIO_URL_BASE}/${slug}-timestamps.json`
     ```

**QA**:

- Run `node scripts/generate-audio.mjs data/blog/hello-world.mdx` (after temporarily removing existing `audio` frontmatter field to force regeneration)
- Verify stdout shows "Successfully processed"
- Verify frontmatter now has both `audio` and `audioTimestamps` URLs
- Fetch the timestamps JSON URL and verify:
  - Has `version: 1`
  - `words` array has >10 entries
  - Each word has `word` (string), `start` (number), `end` (number)
  - `start` < `end` for each word
  - Words are in chronological order (`words[n].start <= words[n+1].start`)
  - `sourceText` is present and non-empty

---

## Task Wave 2: React Infrastructure — Audio Context

### Task 2.1: Create `AudioHighlightProvider` React Context

**New file**: `components/AudioHighlightContext.tsx`
**Action**: Create a React context that shares audio playback state between InlineAudio and HighlightableContent

```typescript
'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

interface WordTimestamp {
  word: string
  start: number
  end: number
}

interface TimestampData {
  version: number
  words: WordTimestamp[]
  sourceText: string
}

interface AudioHighlightContextValue {
  currentTime: number
  isPlaying: boolean
  timestampData: TimestampData | null
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setTimestampData: (data: TimestampData | null) => void
  activeWordIndex: number
}

const AudioHighlightContext = createContext<AudioHighlightContextValue | null>(null)

export function useAudioHighlight() {
  return useContext(AudioHighlightContext)
}

export function AudioHighlightProvider({
  children,
  timestampUrl
}: {
  children: ReactNode
  timestampUrl?: string
}) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timestampData, setTimestampData] = useState<TimestampData | null>(null)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)
  const lastIndexRef = useRef(-1)

  // Fetch timestamp data on mount if URL provided
  // useEffect to fetch timestampUrl → setTimestampData
  // Include error handling: if fetch fails, set null (graceful degradation)

  // Compute activeWordIndex via binary search whenever currentTime changes
  // Use requestAnimationFrame-driven updates, not on every setCurrentTime call
  // Binary search: find the word where word.start <= currentTime < word.end
  // Optimization: start search from lastIndexRef.current (likely nearby)

  return (
    <AudioHighlightContext.Provider value={{
      currentTime, isPlaying, timestampData,
      setCurrentTime, setIsPlaying, setTimestampData,
      activeWordIndex
    }}>
      {children}
    </AudioHighlightContext.Provider>
  )
}
```

**Key implementation details**:

- `activeWordIndex` computation: Use binary search on `words` array. Given `currentTime`, find `i` where `words[i].start <= currentTime < words[i].end`. Use `lastIndexRef` as search hint (sequential playback means next word is usually `lastIndex + 1`).
- Timestamp fetch: `useEffect` with `timestampUrl` dependency. Fetch JSON, validate `version === 1`, set state. On error, log warning and set `null`.
- The provider is a no-op wrapper when `timestampUrl` is undefined — all consumers get `null` context, which triggers graceful degradation.

**QA**:

- Import and render in a test page. Verify no build errors.
- Verify `useAudioHighlight()` returns `null` when outside provider.
- Verify provider fetches timestamp JSON correctly (mock or use actual URL from hello-world).

---

### Task 2.2: Enhance `InlineAudio` to report to context (backward-compatible)

**File**: `components/InlineAudio.tsx`
**Action**: Optionally report `currentTime` and `isPlaying` to `AudioHighlightContext` when available

**Changes**:

- Import `useAudioHighlight` from `AudioHighlightContext`
- In the component body, call `const highlightCtx = useAudioHighlight()`
- In `handleTimeUpdate`: after `setCurrentTime(audio.currentTime)`, also call `highlightCtx?.setCurrentTime(audio.currentTime)`
- In `handlePlay`: also call `highlightCtx?.setIsPlaying(true)`
- In `handlePause` and `handleEnded`: also call `highlightCtx?.setIsPlaying(false)`

**Critical**: This must be backward-compatible. When `InlineAudio` is rendered OUTSIDE an `AudioHighlightProvider` (e.g., on the homepage in `Main.tsx`), `useAudioHighlight()` returns `null`, and the optional chaining (`?.`) ensures no error. Existing behavior is 100% preserved.

**QA**:

- `yarn build` must succeed
- Homepage (`/`) with InlineAudio must render and play audio without errors
- Blog post page with InlineAudio inside provider must report currentTime to context
- Verify no console errors on either page

---

## Task Wave 3: Highlighting Component

### Task 3.1: Create `HighlightableContent` component

**New file**: `components/HighlightableContent.tsx`
**Action**: A component that wraps MDX children and applies word-level highlighting based on audio context

**Architecture**:
This component uses a DOM-based approach (not MDX component replacement) because:

- MDX is rendered by pliny's `MDXLayoutRenderer` which we don't control
- The rendered HTML is standard prose (p, h2, h3, ul, li, a, code, pre, etc.)
- We wrap the rendered children in a container and post-process text nodes

**Implementation approach**:

```typescript
'use client'

import { useRef, useEffect, ReactNode } from 'react'
import { useAudioHighlight } from './AudioHighlightContext'

export default function HighlightableContent({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const highlightCtx = useAudioHighlight()
  const wordSpansRef = useRef<HTMLSpanElement[]>([])
  const prevActiveRef = useRef<number>(-1)

  // Phase 1: On mount, walk the DOM tree and wrap text words in <span> elements
  // - Skip <pre>, <code> elements (code blocks)
  // - For each text node, split into words using regex
  // - Replace text node with sequence of <span class="audio-word" data-word-index={i}>{word}</span>
  //   and text nodes for whitespace
  // - Collect all word spans into wordSpansRef.current array

  // Phase 2: On activeWordIndex change, update highlight class
  // - Use requestAnimationFrame for smooth updates
  // - Remove 'audio-word-active' class from prevActiveRef span
  // - Add 'audio-word-active' class to current span
  // - Update prevActiveRef

  // Graceful degradation: if highlightCtx is null, just render children normally
  if (!highlightCtx || !highlightCtx.timestampData) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}
```

**Key details**:

- **Word wrapping**: Must happen ONCE after initial render (useEffect with empty deps). Use `TreeWalker` API to efficiently find all text nodes. Skip nodes inside `<pre>`, `<code>`, and any element with `data-no-highlight` attribute.
- **Word counting**: The word index in the DOM must match the word index in the timestamp JSON. Use the SAME tokenization logic as `computeWordTimestamps` in the generation script. This is the canonical tokenizer contract:
  - Strip the title prefix ("=Title: ...") from sourceText before matching
  - Normalize unicode quotes, em-dashes, etc.
  - Words are sequences of `\w` characters (letters, digits, underscore) or apostrophe-containing contractions
  - Punctuation-only tokens are skipped
  - Headings in MDX (## Who I am) are included in the word sequence
- **Performance**: Don't re-render React on every frame. Use direct DOM manipulation (`classList.add/remove`) via refs. Only the active word changes class, so it's O(1) per frame.
- **Seek handling**: When user seeks audio, `activeWordIndex` may jump. The component handles this naturally since it just removes old highlight + adds new one.

**QA**:

- Render a blog post with timestamp data. Verify word spans are created (inspect DOM).
- Verify `<pre>` and `<code>` blocks do NOT contain highlight spans.
- Verify word count in DOM matches word count in timestamp JSON (critical alignment check).
- Play audio and verify highlighting moves through words.
- Pause and verify highlight freezes on current word.
- Seek forward and verify highlight jumps correctly.

---

### Task 3.2: Add highlight CSS styles

**File**: `css/tailwind.css`
**Action**: Add styles for the active word highlight

Add these styles:

```css
/* Audio text highlighting */
.audio-word-active {
  background-color: oklch(0.85 0.15 210);
  border-radius: 2px;
  transition: background-color 0.15s ease;
}

:is(.dark .audio-word-active) {
  background-color: oklch(0.35 0.15 210);
}
```

**Design rationale**: Use a soft blue highlight (matches the site's primary color family). The `oklch` color space provides consistent perceptual brightness across themes. The `border-radius: 2px` gives a gentle rounded pill effect. The `transition` ensures smooth appearance.

**Alternative considered**: Using the site's existing `primary-500`/`primary-600` colors. However, those are used for links and interactive elements — using them for passive highlighting would create visual confusion. A distinct but harmonious highlight color is better.

**QA**:

- Inspect a highlighted word in both light and dark mode.
- Verify the highlight is visible but not distracting.
- Verify it doesn't clash with link colors or code highlighting.

---

## Task Wave 4: Integration — Wire It All Together

### Task 4.1: Integrate AudioHighlightProvider + HighlightableContent into PostLayout

**File**: `layouts/PostLayout.tsx`
**Action**: Wrap the audio + content area with the provider and highlightable wrapper

**Changes**:

1. Import `AudioHighlightProvider` and `HighlightableContent`
2. Extract `audioTimestamps` from `content` (alongside existing `audio`)
3. When `audio` exists, wrap the InlineAudio + children section with `AudioHighlightProvider`:

```tsx
{
  audio ? (
    <AudioHighlightProvider timestampUrl={audioTimestamps}>
      <div className="pt-10 pb-4">
        <InlineAudio src={audio} />
      </div>
      <div className="prose dark:prose-invert max-w-none pt-2 pb-8">
        <HighlightableContent>{children}</HighlightableContent>
      </div>
    </AudioHighlightProvider>
  ) : (
    <div className="prose dark:prose-invert max-w-none pt-10 pb-8">{children}</div>
  )
}
```

**Critical**: When `audioTimestamps` is undefined (old posts not yet regenerated), the provider still works but `HighlightableContent` degrades gracefully (renders children without highlight spans).

**QA**:

- Blog post with audio + timestamps: highlighting works
- Blog post with audio but NO timestamps: plays audio normally, no highlighting, no errors
- Blog post with no audio: renders as before

---

### Task 4.2: Integrate into PostBanner layout

**File**: `layouts/PostBanner.tsx`
**Action**: Same pattern as Task 4.1

Extract `audioTimestamps` from content. Wrap the audio+content block (lines 43-50) with `AudioHighlightProvider` + `HighlightableContent` when audio exists.

**QA**: Same as Task 4.1 but for PostBanner layout.

---

### Task 4.3: Integrate into PostSimple layout

**File**: `layouts/PostSimple.tsx`
**Action**: Same pattern as Task 4.1

Extract `audioTimestamps` from content. Wrap the audio+content block (lines 46-55) with `AudioHighlightProvider` + `HighlightableContent` when audio exists.

**QA**: Same as Task 4.1 but for PostSimple layout.

---

## Task Wave 5: Backfill Existing Posts

### Task 5.1: Create backfill script for existing posts

**New file**: `scripts/backfill-timestamps.mjs`
**Action**: A script that regenerates audio WITH timestamps for posts that have `audio` but no `audioTimestamps`

**Logic**:

1. Scan `data/blog/*.mdx` files
2. For each file with `audio` frontmatter but no `audioTimestamps`:
   - Extract plain text (same as `generate-audio.mjs`)
   - Call `/with-timestamps` endpoint
   - Compute word timestamps
   - Upload new MP3 + timestamps JSON to R2 (overwrites existing MP3)
   - Update frontmatter with `audioTimestamps` URL
3. Support `--dry-run` flag to preview which files would be processed

**Important**: This re-generates the audio. Since the same model + voice + settings are used, the audio quality should be identical. However, the exact audio will differ slightly from the original (non-deterministic TTS). This is acceptable since timestamps must correspond to the exact audio file.

**Alternative considered**: Using ElevenLabs' "Forced Alignment" API to generate timestamps from existing audio without re-generating. However, this is a separate API with different auth/pricing and returns different data formats. Regenerating is simpler and ensures perfect alignment.

**QA**:

- Run `node scripts/backfill-timestamps.mjs --dry-run` — should list all posts needing backfill
- Run `node scripts/backfill-timestamps.mjs data/blog/hello-world.mdx` — should process and update
- Verify the new audio sounds correct
- Verify timestamps JSON is valid and uploaded

---

## Final Verification Wave

### Task 6.1: Full build and integration test

**Action**: Verify the complete pipeline works end-to-end

```bash
# 1. Build succeeds
yarn build
# Must complete with no errors

# 2. Start dev server and verify pages load
yarn dev &
sleep 5

# 3. Verify blog post with timestamps renders
curl -s http://localhost:3000/blog/hello-world | grep -q "audio-word"
# Should find word spans if timestamps were loaded

# 4. Verify homepage still works (InlineAudio without provider)
curl -s http://localhost:3000 | grep -q "InlineAudio"
# Should render without errors

# 5. Verify blog post without timestamps degrades gracefully
# (pick a post with audio but no audioTimestamps)
curl -s http://localhost:3000/blog/{slug-without-timestamps}
# Should render normally with no JS errors
```

### Task 6.2: Visual polish check

**Action**: Manual verification of highlighting appearance

- Open a blog post with audio + timestamps in browser
- Press play, observe word-by-word highlighting
- Test dark mode toggle — highlight color should adapt
- Test pause/resume — highlighting should freeze/resume
- Test seeking (click on progress circle or skip ahead) — highlighting should jump
- Verify code blocks are never highlighted
- Verify headings ARE highlighted when their text is spoken
- Check mobile viewport — highlighting should work on small screens

---

## Files Modified (Summary)

| File                                   | Action                                                                |
| -------------------------------------- | --------------------------------------------------------------------- |
| `contentlayer.config.ts`               | Add `audioTimestamps` field                                           |
| `scripts/generate-audio.mjs`           | Switch to `/with-timestamps` endpoint, add word timestamp computation |
| `components/AudioHighlightContext.tsx` | **NEW** — React context for audio-highlight sync                      |
| `components/InlineAudio.tsx`           | Report to context (backward-compatible)                               |
| `components/HighlightableContent.tsx`  | **NEW** — DOM-based word highlighting                                 |
| `css/tailwind.css`                     | Add highlight styles                                                  |
| `layouts/PostLayout.tsx`               | Wrap with provider + highlightable                                    |
| `layouts/PostBanner.tsx`               | Wrap with provider + highlightable                                    |
| `layouts/PostSimple.tsx`               | Wrap with provider + highlightable                                    |
| `scripts/backfill-timestamps.mjs`      | **NEW** — Backfill existing posts                                     |

## Guardrails (from Metis)

1. **Canonical tokenizer contract**: The SAME word-splitting logic MUST be used in `generate-audio.mjs` (Task 1.2) and `HighlightableContent.tsx` (Task 3.1). Extract to a shared utility if possible, or document the exact algorithm clearly enough to replicate.
2. **Graceful degradation**: Every component MUST handle missing timestamp data without errors. `audioTimestamps` is optional everywhere.
3. **Backward compatibility**: `InlineAudio` on homepage (`Main.tsx` line 191) MUST continue working. It renders outside any provider — `useAudioHighlight()` returns `null`, optional chaining handles it.
4. **Performance**: Direct DOM manipulation for highlighting (classList), not React re-renders. Binary search for word lookup. No long tasks >200ms during playback.
5. **Exclusion zones**: `<pre>`, `<code>`, elements with `data-no-highlight` are never wrapped in highlight spans.

## Defaults Applied

- Highlight color: Soft blue (`oklch(0.85 0.15 210)` light / `oklch(0.35 0.15 210)` dark) — distinct from link color
- Auto-scroll: Deferred to Phase 2 (not in scope)
- Timestamp format version: `1` (for future-proofing)
- Audio regeneration strategy: Full regeneration (not forced alignment) for simplicity
