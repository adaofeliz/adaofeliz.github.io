import { assertFfmpegAvailable, formatLoudness } from './lib/audio-loudness.mjs'
import { synthesizeLongText, DEFAULT_VOICE_SETTINGS } from './lib/elevenlabs.mjs'
import { chunkText } from './lib/text-chunker.mjs'
import { extractPlainText, listPostFiles, readPost, slugFor, writePost } from './lib/blog-posts.mjs'
import { publicUrlFor, putAudio, putTimestamps } from './lib/r2.mjs'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

/**
 * Cached chunk responses. A run that dies partway through resumes from here
 * rather than re-buying audio that was already generated.
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
  const plannedChunks = chunkText(textToRead)

  if (options.dryRun) {
    console.log(
      `  DRY RUN: ${textToRead.length} chars -> ${plannedChunks.length} request(s). No API calls, no credits.`
    )
    plannedChunks.forEach((c, i) => console.log(`    chunk ${i + 1}: ${c.length} chars`))
    return false
  }

  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not defined in environment variables.')
  }

  console.log(
    `  ${textToRead.length} chars -> ${plannedChunks.length} chunks (keeps volume consistent)`
  )

  const { audioBuffer, timestamps, stats } = await synthesizeLongText(textToRead, {
    apiKey: ELEVENLABS_API_KEY,
    cacheDir: CACHE_DIR,
    onProgress: ({ index, total, chars, seconds, fromCache }) => {
      const origin = fromCache ? 'cached, no credits' : 'generated'
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
    console.log(`Voice settings: ${JSON.stringify(DEFAULT_VOICE_SETTINGS)}`)
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

  // To let GitHub actions know if it needs to commit
  console.log(`::set-output name=updated::${updatedCount > 0}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
