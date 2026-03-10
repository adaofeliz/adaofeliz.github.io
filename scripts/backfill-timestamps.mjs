import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { remark } from 'remark'
import strip from 'strip-markdown'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// ElevenLabs Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const VOICE_ID = 'gOop052Ev3p3s5kkvprq'

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_SECRET_ACCESS_KEY
const BUCKET_NAME = 'adaofeliz-blog-audio'
const PUBLIC_AUDIO_URL_BASE = 'https://audio.adaofeliz.com'

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

/**
 * Generate TTS audio with word-level timestamps using ElevenLabs API.
 * Returns both audio buffer and timestamp data.
 */
async function generateTTSWithTimestamps(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()

  // Decode base64 audio to buffer
  const audioBuffer = Buffer.from(data.audio_base64, 'base64')

  // Extract alignment data from response
  // API returns character-level alignment data
  const alignment = data.alignment || null

  return { audioBuffer, alignment, sourceText: text }
}

/**
 * Compute word-level timestamps from character-level alignment data.
 * Used as fallback if API returns character-level data instead of word-level.
 */
function computeWordTimestamps(text, alignment) {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment

  const words = []
  let currentWord = ''
  let wordStart = null
  let wordEnd = null

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i]
    const startTime = character_start_times_seconds[i]
    const endTime = character_end_times_seconds[i]

    // Check if character is a word boundary (whitespace)
    // We only split on whitespace to match the DOM tokenization exactly
    const isWordBoundary = /\s/.test(char)

    if (isWordBoundary) {
      // Save current word if exists
      if (currentWord.trim()) {
        words.push({
          word: currentWord.trim(),
          start: wordStart,
          end: wordEnd,
        })
      }
      currentWord = ''
      wordStart = null
      wordEnd = null
    } else {
      // Build word
      if (wordStart === null) {
        wordStart = startTime
      }
      wordEnd = endTime
      currentWord += char
    }
  }

  // Don't forget the last word
  if (currentWord.trim()) {
    words.push({
      word: currentWord.trim(),
      start: wordStart,
      end: wordEnd,
    })
  }

  return {
    version: 1,
    words,
    sourceText: text,
  }
}

/**
 * Check if a file needs backfilling (has audio but no audioTimestamps).
 */
function needsBackfill(frontmatter, force = false) {
  // Must have audio
  if (!frontmatter.audio) {
    return false
  }
  // Must NOT have audioTimestamps (unless forced)
  if (frontmatter.audioTimestamps && !force) {
    return false
  }
  // Skip drafts
  if (frontmatter.draft) {
    return false
  }
  return true
}

/**
 * Process a single file: regenerate audio with timestamps.
 */
async function processFile(filePath, dryRun = false, force = false) {
  const fileContent = await fs.readFile(filePath, 'utf-8')
  const parsed = matter(fileContent)

  if (!needsBackfill(parsed.data, force)) {
    return { status: 'skipped', reason: 'does not need backfill' }
  }

  const title = parsed.data.title || 'Untitled'
  const plainTextContent = await extractPlainText(parsed.content)

  const textToRead = plainTextContent

  if (dryRun) {
    return {
      status: 'dry-run',
      title,
      textPreview: textToRead.substring(0, 100) + '...',
      currentAudio: parsed.data.audio,
    }
  }

  // Ensure API keys are present
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not defined in environment variables.')
  }

  // 1. Generate audio with timestamps via ElevenLabs
  console.log(`  Calling ElevenLabs API with timestamps...`)
  const { audioBuffer, alignment, sourceText } = await generateTTSWithTimestamps(textToRead)

  // 2. Upload MP3 to Cloudflare R2 (overwrites existing)
  const slug = path.basename(filePath, path.extname(filePath))
  const mp3Key = `${slug}.mp3`

  console.log(`  Uploading MP3 to R2 as ${mp3Key}...`)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: mp3Key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
    })
  )

  // 3. Compute word timestamps from character alignment
  const formattedTimestamps = alignment
    ? computeWordTimestamps(sourceText, alignment)
    : { version: 1, words: [], sourceText }

  const timestampsKey = `${slug}-timestamps.json`

  console.log(`  Uploading timestamps to R2 as ${timestampsKey}...`)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: timestampsKey,
      Body: JSON.stringify(formattedTimestamps, null, 2),
      ContentType: 'application/json',
    })
  )

  // 4. Update the markdown file with timestamps URL
  const timestampsUrl = `${PUBLIC_AUDIO_URL_BASE}/${timestampsKey}`
  parsed.data.audioTimestamps = timestampsUrl

  const newFileContent = matter.stringify(parsed.content, parsed.data)
  await fs.writeFile(filePath, newFileContent, 'utf-8')

  return {
    status: 'success',
    title,
    audioUrl: parsed.data.audio,
    timestampsUrl,
    wordCount: formattedTimestamps.words.length,
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

  // Scan blog directory
  const blogDir = 'data/blog'
  const allFiles = await fs.readdir(blogDir)
  const mdxFiles = allFiles
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .map((f) => path.join(blogDir, f))

  console.log(`Scanning ${mdxFiles.length} blog posts...\n`)

  const results = {
    toBackfill: [],
    skipped: [],
    success: [],
    errors: [],
  }

  // First pass: identify files that need backfilling
  for (const file of mdxFiles) {
    try {
      const fileContent = await fs.readFile(file, 'utf-8')
      const parsed = matter(fileContent)

      if (needsBackfill(parsed.data, force)) {
        results.toBackfill.push({
          file,
          title: parsed.data.title,
          audio: parsed.data.audio,
        })
      } else if (parsed.data.audio && parsed.data.audioTimestamps) {
        results.skipped.push({ file, reason: 'already has timestamps' })
      } else if (!parsed.data.audio) {
        results.skipped.push({ file, reason: 'no audio' })
      } else if (parsed.data.draft) {
        results.skipped.push({ file, reason: 'draft' })
      }
    } catch (error) {
      results.errors.push({ file, error: error.message })
    }
  }

  // Report findings
  console.log('=== SCAN RESULTS ===')
  console.log(`Files needing backfill: ${results.toBackfill.length}`)
  results.toBackfill.forEach((f) => {
    console.log(`  - ${f.file}`)
    console.log(`    Title: ${f.title}`)
    console.log(`    Audio: ${f.audio}`)
  })

  console.log(`\nFiles skipped: ${results.skipped.length}`)
  results.skipped.forEach((f) => {
    console.log(`  - ${f.file} (${f.reason})`)
  })

  if (results.errors.length > 0) {
    console.log(`\nErrors: ${results.errors.length}`)
    results.errors.forEach((e) => {
      console.log(`  - ${e.file}: ${e.error}`)
    })
  }

  // If dry run, stop here
  if (dryRun) {
    console.log('\n=== DRY RUN COMPLETE ===')
    console.log(`Would process ${results.toBackfill.length} files.`)
    return
  }

  // Process files that need backfilling
  if (results.toBackfill.length === 0) {
    console.log('\nNo files to process.')
    return
  }

  console.log('\n=== PROCESSING ===')
  let successCount = 0

  for (const item of results.toBackfill) {
    console.log(`\nProcessing: ${item.file}`)
    try {
      const result = await processFile(item.file, false, force)
      if (result.status === 'success') {
        successCount++
        console.log(`  ✓ Success: ${result.wordCount} words timestamped`)
        console.log(`    Timestamps: ${result.timestampsUrl}`)
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`)
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
