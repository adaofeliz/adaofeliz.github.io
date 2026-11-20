/**
 * Long-form narration in the author's own cloned voice, generated locally.
 *
 * Replaces the ElevenLabs pipeline. Synthesis runs Fish S2 Pro on Apple
 * Silicon through scripts/tts/synthesize.py, which also force-aligns each
 * chunk's known text against its audio to produce word timestamps for the
 * karaoke highlight.
 *
 * Everything downstream of synthesis is unchanged from the hosted pipeline:
 * chunks are joined as raw PCM, offset by their decoded length, normalized
 * once and encoded once.
 *
 * Chunking still matters for a local model. Fish S2 Pro is autoregressive, so
 * very long generations drift and risk hitting the token budget mid-sentence.
 * Short chunks keep every request close to the reference voice.
 */

import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { chunkText } from './text-chunker.mjs'
import { decodeToPcm, normalizeFile, wrapPcmAsWav, DEFAULT_TARGET_LUFS } from './audio-loudness.mjs'

export const DEFAULT_MODEL = 'fish-s2-pro'

/**
 * Smaller than the ElevenLabs ceiling. Roughly 25 to 30 seconds of speech per
 * chunk, which stays well inside the token budget below.
 */
export const CHUNK_OPTIONS = { maxChars: 500, targetChars: 400 }

/**
 * Fish S2 Pro emits about 21.5 codec frames per second of audio, so 2048
 * frames is ~95 s: over three times the longest chunk. The library default of
 * 1024 would truncate a full 800 character chunk.
 */
const MAX_NEW_TOKENS = 2048

/** Fixed so a chunk regenerates identically, which is what makes the cache sound. */
const DEFAULT_SEED = 42

const TTS_PROJECT_DIR = 'scripts/tts'

/** Gitignored. The voice sample is personal data and must never be published. */
const DEFAULT_REFERENCE_AUDIO = '.voice/reference.wav'
const DEFAULT_REFERENCE_TEXT = '.voice/reference.txt'

/**
 * Locate the voice sample and its transcript.
 *
 * Env vars override the defaults: TTS_REFERENCE_AUDIO is a path, and
 * TTS_REFERENCE_TEXT is the transcript itself rather than a path to it.
 */
export async function resolveVoiceReference() {
  const referenceAudio = process.env.TTS_REFERENCE_AUDIO || DEFAULT_REFERENCE_AUDIO

  try {
    await fs.access(referenceAudio)
  } catch {
    throw new Error(
      `Voice reference not found at ${referenceAudio}. Record 10 to 30 seconds of yourself ` +
        `reading and save it there (or set TTS_REFERENCE_AUDIO).`
    )
  }

  let referenceText = process.env.TTS_REFERENCE_TEXT
  if (!referenceText) {
    try {
      referenceText = await fs.readFile(DEFAULT_REFERENCE_TEXT, 'utf-8')
    } catch {
      throw new Error(
        `Voice reference transcript not found at ${DEFAULT_REFERENCE_TEXT}. Save exactly what ` +
          `you said in the recording there (or set TTS_REFERENCE_TEXT).`
      )
    }
  }

  referenceText = referenceText.trim()
  if (!referenceText) throw new Error('Voice reference transcript is empty.')

  return { referenceAudio: path.resolve(referenceAudio), referenceText }
}

/**
 * Cache of generated chunks, keyed by content.
 *
 * Local generation is free but slow, about 1.7x real time, so a long post is
 * a quarter of an hour of compute. A run that dies partway through resumes
 * from here. The voice sample's bytes are part of the key, so re-recording
 * the reference regenerates everything.
 */
function cacheKey({ chunk, model, seed, voiceHash, referenceText }) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ chunk, model, seed, voiceHash, referenceText, MAX_NEW_TOKENS }))
    .digest('hex')
}

async function readCache(cacheDir, key) {
  if (!cacheDir) return null
  try {
    const meta = JSON.parse(await fs.readFile(path.join(cacheDir, `${key}.json`), 'utf-8'))
    const wavPath = path.join(cacheDir, `${key}.wav`)
    await fs.access(wavPath)
    return { ...meta, wavPath }
  } catch {
    return null
  }
}

/**
 * Run the Python synthesizer once for every missing chunk, reporting each
 * chunk as it lands so long posts show progress.
 */
function runSynthesizer(request, onChunk) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'uv',
      [
        'run',
        '--quiet',
        '--project',
        TTS_PROJECT_DIR,
        'python',
        `${TTS_PROJECT_DIR}/synthesize.py`,
      ],
      {
        stdio: ['pipe', 'pipe', 'inherit'],
        // The model is public. Without this, an expired cached Hugging Face
        // login turns the public download into a 401.
        env: { ...process.env, HF_HUB_DISABLE_IMPLICIT_TOKEN: '1' },
      }
    )

    const pending = []
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      if (!line.trim()) return
      try {
        pending.push(onChunk(JSON.parse(line)))
      } catch (error) {
        reject(error)
      }
    })

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('uv not found on PATH. Install it with `brew install uv`.'))
        return
      }
      reject(error)
    })
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Local TTS exited with code ${code}. See the output above.`))
        return
      }
      Promise.all(pending).then(resolve, reject)
    })

    child.stdin.end(JSON.stringify(request))
  })
}

function splitWords(text) {
  return text.split(/\s+/).filter(Boolean)
}

/**
 * Synthesize a whole post: chunk, generate, stitch, normalize, encode once.
 *
 * Returns the finished MP3 plus word timestamps aligned to it, in the same
 * shape the ElevenLabs pipeline produced.
 */
export async function synthesizeLongText(
  text,
  {
    referenceAudio,
    referenceText,
    model = DEFAULT_MODEL,
    seed = DEFAULT_SEED,
    targetLufs = DEFAULT_TARGET_LUFS,
    cacheDir = null,
    onProgress = () => {},
  } = {}
) {
  if (!referenceAudio || !referenceText) {
    throw new Error('A voice reference (audio and transcript) is required.')
  }

  const chunks = chunkText(text, CHUNK_OPTIONS)
  if (chunks.length === 0) throw new Error('Nothing to synthesize: the post produced no text.')

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-chunks-'))
  const outDir = cacheDir ?? workDir
  await fs.mkdir(outDir, { recursive: true })

  try {
    const voiceHash = crypto
      .createHash('sha256')
      .update(await fs.readFile(referenceAudio))
      .digest('hex')

    const results = new Array(chunks.length)
    const missing = []
    let reused = 0

    for (let index = 0; index < chunks.length; index++) {
      const key = cacheKey({ chunk: chunks[index], model, seed, voiceHash, referenceText })
      const cached = await readCache(cacheDir, key)

      if (cached) {
        results[index] = cached
        reused++
        onProgress({
          index: index + 1,
          total: chunks.length,
          chars: chunks[index].length,
          seconds: cached.seconds,
          fromCache: true,
        })
      } else {
        missing.push({ index, key })
      }
    }

    if (missing.length > 0) {
      const request = {
        model,
        referenceAudio,
        referenceText,
        seed,
        maxNewTokens: MAX_NEW_TOKENS,
        chunks: missing.map(({ index, key }) => ({
          text: chunks[index],
          out: path.resolve(outDir, `${key}.wav`),
        })),
      }

      await runSynthesizer(request, async ({ index: position, seconds, words }) => {
        const { index, key } = missing[position]
        const meta = { seconds, words }
        // Metadata is written last, so a chunk only counts as cached once
        // both its audio and its alignment are on disk.
        await fs.writeFile(path.join(outDir, `${key}.json`), JSON.stringify(meta), 'utf-8')
        results[index] = { ...meta, wavPath: path.join(outDir, `${key}.wav`) }
        onProgress({
          index: index + 1,
          total: chunks.length,
          chars: chunks[index].length,
          seconds,
          fromCache: false,
        })
      })
    }

    const pcmParts = []
    const words = []
    let offsetSeconds = 0

    for (let index = 0; index < chunks.length; index++) {
      const result = results[index]
      const chunkWords = splitWords(chunks[index])

      if (result.words.length !== chunkWords.length) {
        throw new Error(
          `Chunk ${index + 1}/${chunks.length} aligned ${result.words.length} words, expected ${chunkWords.length}.`
        )
      }

      const pcmPath = path.join(workDir, `chunk-${index}.pcm`)
      const { seconds } = await decodeToPcm(result.wavPath, pcmPath)

      chunkWords.forEach((word, i) => {
        words.push({
          word,
          start: result.words[i].start + offsetSeconds,
          end: result.words[i].end + offsetSeconds,
        })
      })
      pcmParts.push(pcmPath)
      // Offset by the decoded length rather than the last word's end time,
      // so trailing silence in a chunk is not silently swallowed.
      offsetSeconds += seconds
    }

    // Chunk boundaries normally fall on whitespace. If one ever splits a word,
    // the per-chunk word lists stop matching the browser's tokenization.
    const expected = splitWords(text)
    if (words.length !== expected.length || words.some((w, i) => w.word !== expected[i])) {
      throw new Error(
        'Word timestamps do not match the post text, so the highlight would desynchronise. ' +
          'A chunk boundary probably split a word.'
      )
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

    return {
      audioBuffer: await fs.readFile(finalMp3),
      timestamps: { version: 1, words, sourceText: text },
      stats: {
        chunks: chunks.length,
        generated: missing.length,
        reused,
        seconds: offsetSeconds,
        loudness,
      },
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }
}
