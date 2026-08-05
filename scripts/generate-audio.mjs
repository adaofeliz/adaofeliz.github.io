import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { remark } from 'remark'
import strip from 'strip-markdown'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { assertFfmpegAvailable, formatLoudness } from './lib/audio-loudness.mjs'
import { synthesizeLongText, DEFAULT_VOICE_SETTINGS } from './lib/elevenlabs.mjs'
import { chunkText } from './lib/text-chunker.mjs'

// ElevenLabs Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_SECRET_ACCESS_KEY
const BUCKET_NAME = 'adaofeliz-blog-audio'
const PUBLIC_AUDIO_URL_BASE = 'https://audio.adaofeliz.com'
const BLOG_DIR = 'data/blog'

/**
 * Cached chunk responses. A run that dies partway through resumes from here
 * rather than re-buying audio that was already generated.
 */
const CACHE_DIR = '.cache/audio-tts'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

async function extractPlainText(markdown) {
  // Strip JSX tags before processing with strip-markdown since strip-markdown doesn't fully remove complex JSX
  const noJsx = markdown.replace(/<[^>]+>/g, '')
  const file = await remark().use(strip).process(noJsx)
  return String(file).trim()
}

function parseArgs(argv) {
  const only = argv.find((a) => a.startsWith('--only='))

  return {
    files: argv.filter((a) => !a.startsWith('--')),
    only: only ? only.split('=')[1] : null,
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
  }
}

async function uploadObject(key, body, contentType) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Rewritable key, so the CDN has to be able to pick up a corrected file.
      CacheControl: 'public, max-age=86400',
      Metadata: { normalized: 'v1' },
    })
  )
}

async function processFile(filePath, options) {
  console.log(`Processing file: ${filePath}`)

  const parsed = matter(await fs.readFile(filePath, 'utf-8'))

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

  const slug = path.basename(filePath, path.extname(filePath))
  const mp3Key = `${slug}.mp3`
  const timestampsKey = `${slug}-timestamps.json`

  console.log(`  Uploading MP3 to R2 as ${mp3Key}...`)
  await uploadObject(mp3Key, audioBuffer, 'audio/mpeg')

  console.log(`  Uploading timestamps to R2 as ${timestampsKey}...`)
  await uploadObject(timestampsKey, JSON.stringify(timestamps, null, 2), 'application/json')

  parsed.data.audio = `${PUBLIC_AUDIO_URL_BASE}/${mp3Key}`
  parsed.data.audioTimestamps = `${PUBLIC_AUDIO_URL_BASE}/${timestampsKey}`

  await fs.writeFile(filePath, matter.stringify(parsed.content, parsed.data), 'utf-8')

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
    const allFiles = await fs.readdir(BLOG_DIR)
    files = allFiles
      .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
      .map((f) => path.join(BLOG_DIR, f))
  }

  if (options.only) {
    files = files.filter((f) => path.basename(f, path.extname(f)) === options.only)
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
