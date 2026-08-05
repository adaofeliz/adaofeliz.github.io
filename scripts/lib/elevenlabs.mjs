/**
 * Long-form ElevenLabs synthesis that does not lose volume as it goes.
 *
 * ElevenLabs' troubleshooting guide states that audio quality degrades during
 * extended conversions and that the fix is to "break text into sections under
 * 800 characters". Sending a whole post as one request produced published audio
 * that fell 14 to 21 dB from opening to close. Their own SDK repository carries
 * an issue titled "Generated audio volume declines towards end of speech".
 *
 * So the post is chunked, each chunk is generated as its own request, and the
 * chunks are conditioned on their neighbours via request stitching so the
 * narration still sounds continuous across boundaries.
 *
 * Two defences, because they solve different problems:
 *   chunking      stops the model's own decay from accumulating
 *   normalization evens out the ordinary chunk-to-chunk level differences
 *                 that the API gives no way to control
 */

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chunkText } from './text-chunker.mjs'
import { decodeToPcm, normalizeFile, wrapPcmAsWav, DEFAULT_TARGET_LUFS } from './audio-loudness.mjs'

export const DEFAULT_VOICE_ID = 'gOop052Ev3p3s5kkvprq'

/**
 * Kept at multilingual v2 deliberately. ElevenLabs describes it as their most
 * stable model for long-form generation, and it is the only relevant model that
 * supports request stitching (v3 does not).
 */
export const DEFAULT_MODEL_ID = 'eleven_multilingual_v2'

/**
 * Preserved from the existing pipeline rather than changed silently. ElevenLabs
 * documents 0.5 as their common setting and warns that high stability trends
 * monotone, so this is worth revisiting, but delivery is an authorial choice.
 */
export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.85,
  similarity_boost: 0.75,
}

/** ElevenLabs caps each stitching array at three request ids. */
const MAX_STITCH_IDS = 3

const API_BASE = 'https://api.elevenlabs.io/v1/text-to-speech'

/** Transient statuses worth retrying rather than abandoning a paid run. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * POST with bounded exponential backoff.
 *
 * A long post is a dozen sequential billed requests. Letting a single rate limit
 * abort the run would strand chunks that were already paid for, so transient
 * failures are retried before giving up.
 */
async function postWithRetry(url, init, { attempts = 4 } = {}) {
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, init)
      if (response.ok) return response

      const detail = await response.text()
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === attempts) {
        throw new Error(`ElevenLabs API error: ${response.status} ${detail}`)
      }
      lastError = new Error(`ElevenLabs API error: ${response.status} ${detail}`)
    } catch (error) {
      lastError = error
      if (attempt === attempts) throw error
    }

    await sleep(1000 * 2 ** (attempt - 1))
  }

  throw lastError
}

/**
 * Cache of raw API responses, keyed by content.
 *
 * Regenerating audio costs real money, so a failure partway through a thirteen
 * chunk post must not force paying for the whole post again. Chunks already
 * generated are replayed from disk and only the missing ones are purchased.
 */
function cacheKey({ chunk, voiceId, modelId, voiceSettings, previousText, nextText }) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        chunk,
        voiceId,
        modelId,
        voiceSettings,
        // Neighbour text is part of the key because it changes the generated
        // audio. Request ids are not, since they differ on every run and would
        // make the cache useless.
        previousText,
        nextText,
      })
    )
    .digest('hex')
}

async function readCache(cacheDir, key) {
  if (!cacheDir) return null
  try {
    return JSON.parse(await fs.readFile(path.join(cacheDir, `${key}.json`), 'utf-8'))
  } catch {
    return null
  }
}

async function writeCache(cacheDir, key, payload) {
  if (!cacheDir) return
  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(path.join(cacheDir, `${key}.json`), JSON.stringify(payload), 'utf-8')
}

/**
 * Generate one chunk.
 *
 * `previous_request_ids` conditions this chunk on real generated audio, which
 * gives the smoothest joins. When ids are unavailable, because the run resumed
 * from cache or ids aged out after roughly two hours, `previous_text` supplies
 * the same context linguistically. ElevenLabs ignores the text form when ids
 * are present, so both are safe to send.
 */
async function requestChunk({
  apiKey,
  voiceId,
  modelId,
  voiceSettings,
  chunk,
  previousText,
  nextText,
  previousRequestIds,
}) {
  const body = {
    text: chunk,
    model_id: modelId,
    voice_settings: voiceSettings,
  }

  if (previousRequestIds.length > 0) {
    body.previous_request_ids = previousRequestIds.slice(-MAX_STITCH_IDS)
  }
  if (previousText) body.previous_text = previousText
  if (nextText) body.next_text = nextText

  const response = await postWithRetry(`${API_BASE}/${voiceId}/with-timestamps`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  return {
    audioBase64: data.audio_base64,
    // `alignment` tracks the original input text. `normalized_alignment` tracks
    // the spoken normalization, where "42" may become "forty-two", so its
    // indices do not correspond to the source and cannot drive highlighting.
    alignment: data.alignment ?? null,
    requestId: response.headers.get('request-id'),
  }
}

/**
 * Shift a chunk's character timings into whole-file time.
 */
function offsetAlignment(alignment, offsetSeconds) {
  return {
    characters: alignment.characters,
    character_start_times_seconds: alignment.character_start_times_seconds.map(
      (t) => t + offsetSeconds
    ),
    character_end_times_seconds: alignment.character_end_times_seconds.map(
      (t) => t + offsetSeconds
    ),
  }
}

/**
 * Collapse character-level alignment into whitespace-delimited words.
 *
 * Splitting on whitespace only is deliberate: it has to match the browser's
 * tokenization of `sourceText` exactly, or the karaoke highlight drifts off the
 * words it is meant to track.
 */
export function computeWordTimestamps(text, alignment) {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment

  const words = []
  let currentWord = ''
  let wordStart = null
  let wordEnd = null

  const flush = () => {
    if (currentWord.trim()) {
      words.push({ word: currentWord.trim(), start: wordStart, end: wordEnd })
    }
    currentWord = ''
    wordStart = null
    wordEnd = null
  }

  for (let i = 0; i < characters.length; i++) {
    if (/\s/.test(characters[i])) {
      flush()
      continue
    }
    if (wordStart === null) wordStart = character_start_times_seconds[i]
    wordEnd = character_end_times_seconds[i]
    currentWord += characters[i]
  }

  flush()

  return { version: 1, words, sourceText: text }
}

/**
 * Synthesize a whole post: chunk, generate, stitch, normalize, encode once.
 *
 * Returns the finished MP3 plus word timestamps aligned to it.
 */
export async function synthesizeLongText(
  text,
  {
    apiKey,
    voiceId = DEFAULT_VOICE_ID,
    modelId = DEFAULT_MODEL_ID,
    voiceSettings = DEFAULT_VOICE_SETTINGS,
    targetLufs = DEFAULT_TARGET_LUFS,
    cacheDir = null,
    onProgress = () => {},
  } = {}
) {
  if (!apiKey) throw new Error('ElevenLabs API key is required.')

  const chunks = chunkText(text)
  if (chunks.length === 0) throw new Error('Nothing to synthesize: the post produced no text.')

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-chunks-'))

  try {
    const requestIds = []
    const alignments = []
    const pcmParts = []
    let offsetSeconds = 0
    let generated = 0
    let reused = 0

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]
      const previousText = index > 0 ? chunks[index - 1] : undefined
      const nextText = index < chunks.length - 1 ? chunks[index + 1] : undefined

      const key = cacheKey({ chunk, voiceId, modelId, voiceSettings, previousText, nextText })
      let result = await readCache(cacheDir, key)
      const fromCache = result !== null

      if (fromCache) {
        reused++
      } else {
        result = await requestChunk({
          apiKey,
          voiceId,
          modelId,
          voiceSettings,
          chunk,
          previousText,
          nextText,
          previousRequestIds: requestIds,
        })
        await writeCache(cacheDir, key, result)
        generated++
      }

      if (result.requestId) requestIds.push(result.requestId)
      if (!result.alignment) {
        throw new Error(`Chunk ${index + 1}/${chunks.length} returned no alignment data.`)
      }

      const mp3Path = path.join(workDir, `chunk-${index}.mp3`)
      const pcmPath = path.join(workDir, `chunk-${index}.pcm`)
      await fs.writeFile(mp3Path, Buffer.from(result.audioBase64, 'base64'))

      const { seconds } = await decodeToPcm(mp3Path, pcmPath)

      alignments.push(offsetAlignment(result.alignment, offsetSeconds))
      pcmParts.push(pcmPath)
      // Offset by the decoded length rather than the last character end time,
      // so trailing silence in a chunk is not silently swallowed.
      offsetSeconds += seconds

      onProgress({
        index: index + 1,
        total: chunks.length,
        chars: chunk.length,
        seconds,
        fromCache,
      })
    }

    const joinedPcm = path.join(workDir, 'joined.pcm')
    await fs.writeFile(
      joinedPcm,
      Buffer.concat(await Promise.all(pcmParts.map((p) => fs.readFile(p))))
    )

    const joinedWav = path.join(workDir, 'joined.wav')
    await wrapPcmAsWav(joinedPcm, joinedWav)

    const finalMp3 = path.join(workDir, 'final.mp3')
    const loudness = await normalizeFile(joinedWav, finalMp3, { targetLufs })

    const stitched = {
      characters: alignments.flatMap((a) => a.characters),
      character_start_times_seconds: alignments.flatMap((a) => a.character_start_times_seconds),
      character_end_times_seconds: alignments.flatMap((a) => a.character_end_times_seconds),
    }

    return {
      audioBuffer: await fs.readFile(finalMp3),
      timestamps: computeWordTimestamps(text, stitched),
      stats: { chunks: chunks.length, generated, reused, seconds: offsetSeconds, loudness },
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }
}
