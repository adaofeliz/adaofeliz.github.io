/**
 * Backfill word timestamps for posts that have audio but no timestamp payload.
 *
 * Generating alignment data requires a fresh synthesis, so this script spends
 * credits. It therefore goes through the same chunked, normalized, cached
 * pipeline as generate-audio.mjs.
 *
 * That matters. This script used to carry its own copy of the old
 * single-request synthesis at stability 0.5, which meant that any post reaching
 * it would silently get audio with the 14 to 21 dB volume decay reintroduced,
 * overwriting a good file. Routing it through the shared library removes both
 * the duplication and that hazard.
 */

import { assertFfmpegAvailable, formatLoudness } from './lib/audio-loudness.mjs'
import { synthesizeLongText, DEFAULT_VOICE_SETTINGS } from './lib/elevenlabs.mjs'
import { extractPlainText, listPostFiles, readPost, slugFor, writePost } from './lib/blog-posts.mjs'
import { hasR2Credentials, publicUrlFor, putAudio, putTimestamps } from './lib/r2.mjs'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

/** Shared with generate-audio.mjs so a resumed run never pays twice. */
const CACHE_DIR = '.cache/audio-tts'

/**
 * A post needs backfilling when it has audio but no timestamps, unless forced.
 */
function needsBackfill(frontmatter, force = false) {
  if (!frontmatter.audio) return false
  if (frontmatter.audioTimestamps && !force) return false
  if (frontmatter.draft) return false
  return true
}

async function processFile(filePath, dryRun = false, force = false) {
  const parsed = await readPost(filePath)

  if (!needsBackfill(parsed.data, force)) {
    return { status: 'skipped', reason: 'does not need backfill' }
  }

  const title = parsed.data.title || 'Untitled'
  const textToRead = await extractPlainText(parsed.content)

  if (dryRun) {
    return {
      status: 'dry-run',
      title,
      textPreview: `${textToRead.substring(0, 100)}...`,
      currentAudio: parsed.data.audio,
    }
  }

  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not defined in environment variables.')
  }

  console.log(`  Synthesizing in chunks (keeps volume consistent)...`)

  const { audioBuffer, timestamps, stats } = await synthesizeLongText(textToRead, {
    apiKey: ELEVENLABS_API_KEY,
    cacheDir: CACHE_DIR,
    onProgress: ({ index, total, chars, seconds, fromCache }) => {
      const origin = fromCache ? 'cached, no credits spent' : 'generated'
      console.log(`    [${index}/${total}] ${chars} chars -> ${seconds.toFixed(1)}s (${origin})`)
    },
  })

  console.log(`  ${stats.generated} chunk(s) generated, ${stats.reused} reused from cache.`)
  console.log(
    `  loudness ${formatLoudness(stats.loudness.before)} -> ${formatLoudness(stats.loudness.after)} ` +
      `(gain ${stats.loudness.gainDb} dB)`
  )

  const slug = slugFor(filePath)
  const mp3Key = `${slug}.mp3`
  const timestampsKey = `${slug}-timestamps.json`

  console.log(`  Uploading MP3 to R2 as ${mp3Key}...`)
  await putAudio(mp3Key, audioBuffer)

  console.log(`  Uploading timestamps to R2 as ${timestampsKey}...`)
  await putTimestamps(timestampsKey, timestamps)

  // The audio was regenerated, so point at both objects rather than assuming
  // the existing mp3 still matches the new alignment.
  parsed.data.audio = publicUrlFor(mp3Key)
  parsed.data.audioTimestamps = publicUrlFor(timestampsKey)
  await writePost(filePath, parsed)

  return {
    status: 'success',
    title,
    audioUrl: parsed.data.audio,
    timestampsUrl: parsed.data.audioTimestamps,
    wordCount: timestamps.words.length,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')

  if (dryRun) {
    console.log('=== DRY RUN MODE ===')
    console.log('No changes will be made.\n')
  }
  if (force) {
    console.log('=== FORCE MODE ===')
    console.log('Will overwrite existing timestamps.\n')
  }

  const mdxFiles = await listPostFiles()
  console.log(`Scanning ${mdxFiles.length} blog posts...\n`)

  const results = { toBackfill: [], skipped: [], errors: [] }

  for (const file of mdxFiles) {
    try {
      const parsed = await readPost(file)

      if (needsBackfill(parsed.data, force)) {
        results.toBackfill.push({ file, title: parsed.data.title, audio: parsed.data.audio })
      } else if (parsed.data.draft) {
        results.skipped.push({ file, reason: 'draft' })
      } else if (!parsed.data.audio) {
        results.skipped.push({ file, reason: 'no audio' })
      } else {
        results.skipped.push({ file, reason: 'already has timestamps' })
      }
    } catch (error) {
      results.errors.push({ file, error: error.message })
    }
  }

  console.log('=== SCAN RESULTS ===')
  console.log(`Files needing backfill: ${results.toBackfill.length}`)
  results.toBackfill.forEach((f) => {
    console.log(`  - ${f.file}`)
    console.log(`    Title: ${f.title}`)
    console.log(`    Audio: ${f.audio}`)
  })

  console.log(`\nFiles skipped: ${results.skipped.length}`)
  results.skipped.forEach((f) => console.log(`  - ${f.file} (${f.reason})`))

  if (results.errors.length > 0) {
    console.log(`\nErrors: ${results.errors.length}`)
    results.errors.forEach((e) => console.log(`  - ${e.file}: ${e.error}`))
  }

  if (dryRun) {
    console.log('\n=== DRY RUN COMPLETE ===')
    console.log(`Would process ${results.toBackfill.length} files.`)
    return
  }

  if (results.toBackfill.length === 0) {
    console.log('\nNo files to process.')
    return
  }

  // Only reached when real work is pending, so the guards stay out of the way
  // of the common no-op run in CI.
  await assertFfmpegAvailable()
  if (!hasR2Credentials) {
    throw new Error('R2 credentials are required to upload regenerated audio.')
  }

  console.log('\n=== PROCESSING ===')
  console.log(`Voice settings: ${JSON.stringify(DEFAULT_VOICE_SETTINGS)}`)
  let successCount = 0

  for (const item of results.toBackfill) {
    console.log(`\nProcessing: ${item.file}`)
    try {
      const result = await processFile(item.file, false, force)
      if (result.status === 'success') {
        successCount++
        console.log(`  Success: ${result.wordCount} words timestamped`)
        console.log(`    Timestamps: ${result.timestampsUrl}`)
      }
    } catch (error) {
      console.error(`  Error: ${error.message}`)
      results.errors.push({ file: item.file, error: error.message })
    }
  }

  console.log('\n=== SUMMARY ===')
  console.log(`Processed: ${successCount}/${results.toBackfill.length}`)
  if (results.errors.length > 0) {
    console.log(`Errors: ${results.errors.length}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
