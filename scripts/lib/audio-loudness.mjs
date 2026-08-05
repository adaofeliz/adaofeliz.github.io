/**
 * Loudness measurement and normalization helpers built on ffmpeg.
 *
 * Why this exists: ElevenLabs long-form generations drift quieter the further
 * they get into a single request. A measured example from this blog started at
 * -23.8 LUFS and decayed to -41.5 LUFS by the five minute mark, a ~17 dB
 * collapse that made the second half of the post unlistenable even at max
 * speaker volume.
 *
 * A single static gain cannot repair that, because the defect is *inside* the
 * file: raising everything uniformly keeps the tail 17 dB below the head. The
 * chain below instead flattens the envelope over time, then sets the target
 * loudness, then guards the peaks.
 *
 * Chain, in order, and why each stage is there:
 *   highpass=f=70   remove sub-bass rumble that would otherwise eat headroom
 *   afftdn          denoise BEFORE any gain. The tail needs ~+25 dB, which
 *                   would also lift the noise floor by 25 dB. Measured on a
 *                   real post, skipping this pushed pause noise from -35 dB to
 *                   -9 dB (dynaudnorm) or -5 dB (speechnorm), clearly audible
 *                   hiss. With it, pause noise landed at -37 dB, quieter than
 *                   the source.
 *   dynaudnorm      the actual fix. Gaussian-smoothed over f*g = ~15.5 s so it
 *                   tracks the slow drift without pumping individual syllables.
 *   volume          static offset onto the measured target
 *   alimiter        catch the residual peaks so nothing clips
 *
 * Post-processing restores loudness but cannot restore signal-to-noise that was
 * never generated. Chunking at generation time is the primary fix; this module
 * is the repair path and the final consistency net.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/** EBU R128 target for spoken-word content, in LUFS. */
export const DEFAULT_TARGET_LUFS = -16

/** Ceiling for the output limiter, in dBTP. Keeps a little headroom for lossy encode. */
export const DEFAULT_TRUE_PEAK_DB = -1.5

/**
 * Envelope-flattening stages applied before any gain is added.
 * Kept as a single string so the measure pass and the apply pass are guaranteed
 * to see identical audio, which is what makes the computed gain correct.
 */
const FLATTEN_CHAIN = [
  'highpass=f=70',
  'afftdn=nr=12:nf=-50',
  'dynaudnorm=f=500:g=31:p=0.7:m=20:r=0.10:n=0',
].join(',')

/**
 * Run ffmpeg/ffprobe and resolve with its output. ffmpeg writes its measurement
 * reports to stderr, so both streams are captured.
 */
function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d) => {
      stdout += d
    })
    child.stderr.on('data', (d) => {
      stderr += d
    })
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error(`${bin} not found on PATH. Install ffmpeg to normalize audio.`))
        return
      }
      reject(error)
    })
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${bin} exited with code ${code}:\n${stderr.slice(-2000)}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

/**
 * Verify ffmpeg is usable before we start spending time or credits.
 */
export async function assertFfmpegAvailable() {
  await run('ffmpeg', ['-hide_banner', '-version'])
}

function matchFloat(text, label) {
  const match = text.match(new RegExp(`${label}:\\s*(-?\\d+(?:\\.\\d+)?)`))
  return match ? Number.parseFloat(match[1]) : null
}

/**
 * Measure integrated loudness, loudness range and true peak of a file.
 * Optionally measures through a filter chain, used by the two-pass gain calc.
 */
export async function measureLoudness(filePath, { filters = null } = {}) {
  const chain = filters
    ? `${filters},ebur128=peak=true:framelog=quiet`
    : 'ebur128=peak=true:framelog=quiet'
  const { stderr } = await run('ffmpeg', [
    '-hide_banner',
    '-i',
    filePath,
    '-af',
    chain,
    '-f',
    'null',
    '-',
  ])

  // The summary block repeats the "I:" label, so scope to the tail of the log.
  const summary = stderr.slice(stderr.lastIndexOf('Integrated loudness'))
  const peakBlock = stderr.slice(stderr.lastIndexOf('True peak'))

  return {
    integrated: matchFloat(summary, 'I'),
    loudnessRange: matchFloat(stderr.slice(stderr.lastIndexOf('Loudness range')), 'LRA'),
    truePeak: matchFloat(peakBlock, 'Peak'),
  }
}

/**
 * Read a file's duration in seconds.
 */
export async function getDuration(filePath) {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    filePath,
  ])
  return Number.parseFloat(stdout.trim())
}

/**
 * Measure loudness in fixed windows across a file to expose drift over time.
 *
 * This is the diagnostic that proves whether the decay is present. A healthy
 * narration file holds a range under ~3 dB. The broken generations measured
 * 17+ dB.
 */
export async function analyzeDrift(filePath, { windowSeconds = 30 } = {}) {
  const duration = await getDuration(filePath)
  const windows = []

  for (let start = 0; start + windowSeconds <= duration; start += windowSeconds) {
    const { stderr } = await run('ffmpeg', [
      '-hide_banner',
      '-ss',
      String(start),
      '-t',
      String(windowSeconds),
      '-i',
      filePath,
      '-af',
      'ebur128=framelog=quiet',
      '-f',
      'null',
      '-',
    ])
    const summary = stderr.slice(stderr.lastIndexOf('Integrated loudness'))
    const lufs = matchFloat(summary, 'I')
    if (lufs !== null && Number.isFinite(lufs)) {
      windows.push({ start, lufs })
    }
  }

  if (windows.length === 0) {
    return { duration, windows, min: null, max: null, range: null }
  }

  const values = windows.map((w) => w.lufs)
  const min = Math.min(...values)
  const max = Math.max(...values)

  return { duration, windows, min, max, range: Number((max - min).toFixed(2)) }
}

/**
 * Normalize a file: flatten the envelope, land on the target loudness, limit peaks.
 *
 * Two passes are required. The first measures loudness *through* the flattening
 * chain, because flattening changes the integrated value. Only then can the
 * static gain be computed correctly.
 */
export async function normalizeFile(
  inputPath,
  outputPath,
  { targetLufs = DEFAULT_TARGET_LUFS, truePeakDb = DEFAULT_TRUE_PEAK_DB, bitrate = '128k' } = {}
) {
  const before = await measureLoudness(inputPath)
  const flattened = await measureLoudness(inputPath, { filters: FLATTEN_CHAIN })

  if (flattened.integrated === null || !Number.isFinite(flattened.integrated)) {
    throw new Error(`Could not measure loudness of ${inputPath}. Is it silent or corrupt?`)
  }

  const gainDb = (targetLufs - flattened.integrated).toFixed(2)
  // alimiter takes a linear amplitude ceiling, not dB.
  const limit = Math.pow(10, truePeakDb / 20).toFixed(4)

  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-v',
    'error',
    '-i',
    inputPath,
    '-af',
    `${FLATTEN_CHAIN},volume=${gainDb}dB,alimiter=limit=${limit}:attack=5:release=50:level=disabled`,
    '-c:a',
    'libmp3lame',
    '-b:a',
    bitrate,
    '-ar',
    '44100',
    '-ac',
    '1',
    outputPath,
  ])

  const after = await measureLoudness(outputPath)

  return { before, after, gainDb: Number(gainDb) }
}

/**
 * Normalize an in-memory MP3 buffer. Convenience wrapper for the generation
 * pipeline, which holds audio in memory before uploading to R2.
 */
export async function normalizeBuffer(buffer, options = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-audio-'))
  const inputPath = path.join(dir, 'in.mp3')
  const outputPath = path.join(dir, 'out.mp3')

  try {
    await fs.writeFile(inputPath, buffer)
    const stats = await normalizeFile(inputPath, outputPath, options)
    const normalized = await fs.readFile(outputPath)
    return { buffer: normalized, ...stats }
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

/**
 * Format a measurement for console output.
 */
export function formatLoudness(measurement) {
  const value = (n, unit) => (n === null || !Number.isFinite(n) ? 'n/a' : `${n.toFixed(1)} ${unit}`)
  return `${value(measurement.integrated, 'LUFS')} (peak ${value(measurement.truePeak, 'dBTP')})`
}

/** Working format for stitching TTS chunks together. */
export const PCM_SAMPLE_RATE = 44100
const PCM_BYTES_PER_SAMPLE = 2

/**
 * Decode any audio file to headerless 16-bit mono PCM.
 *
 * Chunks are joined in raw PCM rather than by concatenating MP3s. Every MP3
 * carries encoder delay and padding, so appending encoded files inserts a small
 * gap per boundary that accumulates across a dozen chunks and slowly desyncs
 * the word timestamps. Raw PCM concatenation is exact, and the byte length
 * gives the true duration needed to offset each chunk's alignment.
 */
export async function decodeToPcm(inputPath, outputPath) {
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-v',
    'error',
    '-i',
    inputPath,
    '-f',
    's16le',
    '-acodec',
    'pcm_s16le',
    '-ar',
    String(PCM_SAMPLE_RATE),
    '-ac',
    '1',
    outputPath,
  ])

  const { size } = await fs.stat(outputPath)
  return { bytes: size, seconds: size / (PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE) }
}

/**
 * Wrap raw PCM in a WAV container so later stages can read it as normal audio.
 * Lossless, so the pipeline still performs exactly one lossy encode at the end.
 */
export async function wrapPcmAsWav(rawPath, wavPath) {
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-v',
    'error',
    '-f',
    's16le',
    '-ar',
    String(PCM_SAMPLE_RATE),
    '-ac',
    '1',
    '-i',
    rawPath,
    '-c:a',
    'pcm_s16le',
    wavPath,
  ])
}
