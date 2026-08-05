/**
 * Repair the loudness of blog audio that is already published, without calling
 * ElevenLabs and without spending a single credit.
 *
 * The generation pipeline used to send an entire post as one ElevenLabs request.
 * Those generations drift quieter as they go. Measured on
 * my-journey-with-vibe-coding-_-agentic-development-at-scale.mp3 the file opened
 * at -23.8 LUFS and fell to -41.5 LUFS, a 17.7 dB collapse. Every post produced
 * that way carries the same defect.
 *
 * This script fetches each published MP3 straight from R2, runs the loudness
 * repair chain locally, and writes the result back to the same object key. The
 * frontmatter is never touched, because the URL does not change.
 *
 * Safety: the untouched original is copied to originals/<slug>.mp3 before the
 * first overwrite. Regenerating audio costs money, so the source is preserved.
 * A normalized object is tagged with metadata so re-runs skip it and never
 * re-encode an already-processed file.
 *
 * Usage:
 *   node scripts/normalize-existing-audio.mjs --analyze      # report only, no writes
 *   node scripts/normalize-existing-audio.mjs --dry-run      # list what would change
 *   node scripts/normalize-existing-audio.mjs                # repair everything pending
 *   node scripts/normalize-existing-audio.mjs --only=the-quiet-layer
 *   node scripts/normalize-existing-audio.mjs --force        # re-process even if tagged
 *   node scripts/normalize-existing-audio.mjs --verify       # measure drift before/after
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  analyzeDrift,
  assertFfmpegAvailable,
  formatLoudness,
  measureLoudness,
  normalizeFile,
  DEFAULT_TARGET_LUFS,
} from './lib/audio-loudness.mjs'
import { listPostFiles, readPost } from './lib/blog-posts.mjs'
import {
  copyObject,
  downloadToFile,
  hasR2Credentials,
  objectExists,
  putAudio,
  readNormalizationMarker,
  NORMALIZATION_VERSION,
} from './lib/r2.mjs'

function parseArgs(argv) {
  const only = argv.find((a) => a.startsWith('--only='))
  const target = argv.find((a) => a.startsWith('--target='))
  return {
    analyze: argv.includes('--analyze'),
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    verify: argv.includes('--verify'),
    only: only ? only.split('=')[1] : null,
    targetLufs: target ? Number.parseFloat(target.split('=')[1]) : DEFAULT_TARGET_LUFS,
  }
}

/**
 * Collect every published post that has audio attached.
 * The slug is derived from the object key in the audio URL rather than the
 * filename, so a renamed post still resolves to the right object.
 */
async function collectPosts(only) {
  const posts = []

  for (const filePath of await listPostFiles()) {
    const parsed = await readPost(filePath)

    if (!parsed.data.audio || parsed.data.draft) continue

    const url = parsed.data.audio
    const key = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''))
    const slug = key.replace(/\.mp3$/, '')

    if (only && slug !== only) continue

    posts.push({ filePath, slug, key, url, title: parsed.data.title ?? slug })
  }

  return posts.sort((a, b) => a.slug.localeCompare(b.slug))
}

/**
 * Copy the pristine original aside exactly once. If a backup already exists it
 * is left alone, so repeated runs can never overwrite a good original with an
 * already-normalized file.
 */
async function backupOriginal(key, slug) {
  const backupKey = `originals/${slug}.mp3`

  if (await objectExists(backupKey)) {
    return { backupKey, created: false }
  }

  await copyObject(key, backupKey)
  return { backupKey, created: true }
}

async function uploadNormalized(key, filePath, targetLufs) {
  await putAudio(key, await fs.readFile(filePath), { 'target-lufs': String(targetLufs) })
}

function describeDrift(label, drift) {
  if (drift.range === null) return `${label}: too short to measure`
  return `${label}: range ${drift.range.toFixed(1)} dB (min ${drift.min.toFixed(1)}, max ${drift.max.toFixed(1)})`
}

async function processPost(post, options, workDir) {
  const sourcePath = path.join(workDir, `${post.slug}.src.mp3`)
  const outputPath = path.join(workDir, `${post.slug}.out.mp3`)

  const marker = await readNormalizationMarker(post.key)
  if (marker === NORMALIZATION_VERSION && !options.force) {
    return { status: 'skipped', reason: `already normalized (${marker})` }
  }

  await downloadToFile(post.key, sourcePath, { publicUrl: post.url })

  // Analyze mode is read-only: measure and report, change nothing.
  if (options.analyze) {
    const loudness = await measureLoudness(sourcePath)
    const drift = await analyzeDrift(sourcePath)
    return { status: 'analyzed', loudness, drift }
  }

  const driftBefore = options.verify ? await analyzeDrift(sourcePath) : null

  if (options.dryRun) {
    const loudness = await measureLoudness(sourcePath)
    return { status: 'dry-run', loudness, driftBefore }
  }

  const stats = await normalizeFile(sourcePath, outputPath, { targetLufs: options.targetLufs })
  const driftAfter = options.verify ? await analyzeDrift(outputPath) : null

  const backup = await backupOriginal(post.key, post.slug)
  await uploadNormalized(post.key, outputPath, options.targetLufs)

  return { status: 'normalized', ...stats, backup, driftBefore, driftAfter }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  await assertFfmpegAvailable()

  if (!options.analyze && !options.dryRun && !hasR2Credentials) {
    throw new Error(
      'Repair mode writes to R2 and needs CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY_ID and ' +
        'CLOUDFLARE_SECRET_ACCESS_KEY. Run with --analyze or --dry-run to inspect without credentials.'
    )
  }

  const posts = await collectPosts(options.only)

  if (posts.length === 0) {
    console.log('No published posts with audio found.')
    return
  }

  const mode = options.analyze
    ? 'ANALYZE (read only)'
    : options.dryRun
      ? 'DRY RUN (no writes)'
      : `REPAIR (target ${options.targetLufs} LUFS)`

  console.log(`=== ${mode} ===`)
  console.log(`${posts.length} post(s) with audio. No ElevenLabs credits will be used.\n`)

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-audio-batch-'))
  const failures = []
  let changed = 0

  try {
    for (const post of posts) {
      console.log(`${post.slug}`)
      try {
        const result = await processPost(post, options, workDir)

        if (result.status === 'skipped') {
          console.log(`  - skipped: ${result.reason}`)
          continue
        }

        if (result.status === 'analyzed') {
          console.log(`  loudness: ${formatLoudness(result.loudness)}`)
          console.log(`  ${describeDrift('drift', result.drift)}`)
          continue
        }

        if (result.status === 'dry-run') {
          console.log(`  would repair. current: ${formatLoudness(result.loudness)}`)
          if (result.driftBefore) console.log(`  ${describeDrift('drift', result.driftBefore)}`)
          continue
        }

        changed++
        console.log(`  before: ${formatLoudness(result.before)}`)
        console.log(`  after : ${formatLoudness(result.after)}  (gain ${result.gainDb} dB)`)
        if (result.driftBefore)
          console.log(`  ${describeDrift('drift before', result.driftBefore)}`)
        if (result.driftAfter) console.log(`  ${describeDrift('drift after ', result.driftAfter)}`)
        console.log(
          `  original ${result.backup.created ? 'backed up to' : 'already preserved at'} ${result.backup.backupKey}`
        )
      } catch (error) {
        console.error(`  x failed: ${error.message}`)
        failures.push({ slug: post.slug, error: error.message })
      }
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }

  console.log('\n=== SUMMARY ===')
  if (options.analyze || options.dryRun) {
    console.log(`Inspected ${posts.length} file(s). Nothing was modified.`)
  } else {
    console.log(`Repaired ${changed}/${posts.length} file(s).`)
    if (changed > 0) {
      console.log('Object keys are unchanged, so no frontmatter edits are needed.')
      console.log('Purge the Cloudflare cache for audio.adaofeliz.com to serve the repaired files.')
    }
  }

  if (failures.length > 0) {
    console.log(`Failures: ${failures.length}`)
    failures.forEach((f) => console.log(`  - ${f.slug}: ${f.error}`))
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
