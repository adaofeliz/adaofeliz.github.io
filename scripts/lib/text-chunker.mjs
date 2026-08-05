/**
 * Split long post text into ElevenLabs-sized request chunks.
 *
 * ElevenLabs documents that quality degrades on long generations and that the
 * mitigation is to "break text into sections under 800 characters", which is
 * what keeps volume consistent. Sending a whole post in one request is what
 * caused published audio to decay by 14 to 21 dB from start to finish.
 *
 * The one invariant that must never break: joining the returned chunks
 * reproduces the input byte for byte. Word timestamps are matched against
 * `sourceText` in the browser, so losing or altering a single space would
 * desynchronise the karaoke highlighting.
 */

/** ElevenLabs' documented quality ceiling for a single generation. */
export const MAX_CHUNK_CHARS = 800

/** Preferred size, leaving room to finish a sentence rather than split it. */
export const TARGET_CHUNK_CHARS = 700

/**
 * Break text into segments whose concatenation is identical to the input.
 * Separators stay attached to the segment they follow, which is what preserves
 * the round trip.
 */
function splitKeepingSeparators(text, pattern) {
  const parts = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const end = match.index + match[0].length
    parts.push(text.slice(lastIndex, end))
    lastIndex = end
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.filter((p) => p.length > 0)
}

/** Hard fallback for a single unbroken run longer than the ceiling. */
function splitOnWidth(segment, maxChars) {
  const pieces = []

  for (let offset = 0; offset < segment.length; offset += maxChars) {
    pieces.push(segment.slice(offset, offset + maxChars))
  }

  return pieces
}

/**
 * Reduce a segment to pieces that each fit under maxChars, trying the least
 * damaging boundary first: sentences, then words, then raw width.
 */
function enforceCeiling(segment, maxChars) {
  if (segment.length <= maxChars) return [segment]

  const bySentence = splitKeepingSeparators(segment, /[.!?:](?=\s|$)\s*/g)
  const result = []

  for (const sentence of bySentence) {
    if (sentence.length <= maxChars) {
      result.push(sentence)
      continue
    }

    const byWord = splitKeepingSeparators(sentence, /\s+/g)
    let buffer = ''

    for (const word of byWord) {
      if (word.length > maxChars) {
        if (buffer) {
          result.push(buffer)
          buffer = ''
        }
        result.push(...splitOnWidth(word, maxChars))
        continue
      }

      if (buffer.length + word.length > maxChars) {
        result.push(buffer)
        buffer = word
      } else {
        buffer += word
      }
    }

    if (buffer) result.push(buffer)
  }

  return result
}

/**
 * Chunk post text for sequential TTS requests.
 *
 * Paragraph boundaries are preferred, because a paragraph break is where the
 * narration would naturally pause anyway.
 */
export function chunkText(
  text,
  { maxChars = MAX_CHUNK_CHARS, targetChars = TARGET_CHUNK_CHARS } = {}
) {
  if (typeof text !== 'string') {
    throw new TypeError('chunkText expects a string')
  }
  if (targetChars > maxChars) {
    throw new RangeError('targetChars cannot exceed maxChars')
  }
  if (text.length === 0) return []

  const paragraphs = splitKeepingSeparators(text, /\n{2,}/g)
  const units = paragraphs.flatMap((p) => enforceCeiling(p, maxChars))

  const chunks = []
  let current = ''

  for (const unit of units) {
    if (current === '') {
      current = unit
      continue
    }

    const combined = current.length + unit.length

    // Grow past the target only when doing so still respects the hard ceiling
    // and the current chunk is short enough that a lone fragment would sound
    // clipped on its own.
    if (combined <= targetChars || (combined <= maxChars && current.length < targetChars / 2)) {
      current += unit
      continue
    }

    chunks.push(current)
    current = unit
  }

  if (current) chunks.push(current)

  const rejoined = chunks.join('')
  if (rejoined !== text) {
    throw new Error(
      `chunkText lost content: rebuilt ${rejoined.length} chars from a ${text.length} char input. ` +
        'Word timestamps would desynchronise, so refusing to continue.'
    )
  }

  return chunks
}
