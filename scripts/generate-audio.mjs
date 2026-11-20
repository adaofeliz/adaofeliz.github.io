import { assertFfmpegAvailable, formatLoudness } from './lib/audio-loudness.mjs'
import {
  CHUNK_OPTIONS,
  DEFAULT_MODEL,
  resolveVoiceReference,
  synthesizeLongText,
} from './lib/local-tts.mjs'
import { chunkText } from './lib/text-chunker.mjs'
import { extractPlainText, listPostFiles, readPost, slugFor, writePost } from './lib/blog-posts.mjs'
import { publicUrlFor, putAudio, putTimestamps } from './lib/r2.mjs'

/**
 * Cached generated chunks. A run that dies partway through resumes from here
 * rather than regenerating audio that already exists.
 */
const CACHE_DIR = '.cache/audio-tts'

function parseArgs(argv) {
  const only = argv.find((a) => a.startsWith('--only='))

  return {
    files: argv.filter((a) => !a.startsWith('--')),
    only: only ? only.split('=')[1] : null,
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
  }
}

async function processFile(filePath, options) {
  console.log(`Processing file: ${filePath}`)

  const parsed = await readPost(filePath)

  if (parsed.data.audio && !options.force) {
    console.log(`Skipping ${filePath} - audio already exists.`)
    return false
  }

  if (parsed.data.draft) {
    console.log(`Skipping ${filePath} - draft post.`)
    return false
  }

  const textToRead = await extractPlainText(parsed.content)
  const plannedChunks = chunkText(textToRead, CHUNK_OPTIONS)

  if (options.dryRun) {
    console.log(
      `  DRY RUN: ${textToRead.length} chars -> ${plannedChunks.length} chunk(s). Nothing generated.`
    )
    plannedChunks.forEach((c, i) => console.log(`    chunk ${i + 1}: ${c.length} chars`))
    return false
  }

  console.log(
    `  ${textToRead.length} chars -> ${plannedChunks.length} chunks (keeps volume consistent)`
  )

  const { audioBuffer, timestamps, stats } = await synthesizeLongText(textToRead, {
    ...options.voice,
    cacheDir: CACHE_DIR,
    onProgress: ({ index, total, chars, seconds, fromCache }) => {
      const origin = fromCache ? 'cached' : 'generated'
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

  parsed.data.audio = publicUrlFor(mp3Key)
  parsed.data.audioTimestamps = publicUrlFor(timestampsKey)

  await writePost(filePath, parsed)

  console.log(`Successfully processed ${filePath} and updated frontmatter.`)
  console.log(`  - Audio: ${parsed.data.audio}`)
  console.log(`  - Timestamps: ${parsed.data.audioTimestamps} (${timestamps.words.length} words)`)
  return true
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  await assertFfmpegAvailable()

  let files = options.files

  if (files.length === 0) {
    console.log('No files passed, scanning data/blog directory...')
    files = await listPostFiles()
  }

  if (options.only) {
    files = files.filter((f) => slugFor(f) === options.only)
    if (files.length === 0) {
      throw new Error(`No blog post matched --only=${options.only}`)
    }
  }

  if (files.length === 0) {
    console.log('No files to process.')
    return
  }

  if (!options.dryRun) {
    // Fail before any generation rather than after the first post.
    options.voice = await resolveVoiceReference()
    console.log(`Model: ${DEFAULT_MODEL}, voice: ${options.voice.referenceAudio}`)
  }

  let updatedCount = 0
  for (const file of files) {
    if (file.startsWith('data/blog/') && (file.endsWith('.mdx') || file.endsWith('.md'))) {
      try {
        const updated = await processFile(file, options)
        if (updated) updatedCount++
      } catch (error) {
        console.error(`Error processing file ${file}:`, error)
        process.exit(1)
      }
    } else {
      console.log(`Skipping non-blog file: ${file}`)
    }
  }

  console.log(`${updatedCount} post(s) updated.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
