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
 * Format timestamps into our standard format.
 */
function formatTimestamps(timestamps, sourceText) {
  // If timestamps are already in word format [{text, start, end}]
  if (timestamps.length > 0 && 'text' in timestamps[0]) {
    return {
      version: 1,
      words: timestamps.map((t) => ({
        word: t.text,
        start: t.start,
        end: t.end,
      })),
      sourceText,
    }
  }

  // If timestamps are in character alignment format
  if (timestamps.length > 0 && 'character' in timestamps[0]) {
    const alignment = {
      characters: timestamps.map((t) => t.character),
      character_start_times_seconds: timestamps.map((t) => t.start_time || t.start),
      character_end_times_seconds: timestamps.map((t) => t.end_time || t.end),
    }
    return computeWordTimestamps(sourceText, alignment)
  }

  // Fallback: return empty timestamps
  return {
    version: 1,
    words: [],
    sourceText,
  }
}

async function processFile(filePath) {
  console.log(`Processing file: ${filePath}`)

  const fileContent = await fs.readFile(filePath, 'utf-8')
  const parsed = matter(fileContent)

  // Skip if it already has an audio url
  if (parsed.data.audio) {
    console.log(`Skipping ${filePath} - audio already exists.`)
    return false
  }

  // Skip drafts or non-blog posts
  if (parsed.data.draft) {
    console.log(`Skipping ${filePath} - draft post.`)
    return false
  }

  const plainTextContent = await extractPlainText(parsed.content)

  const textToRead = plainTextContent
  console.log(`Text to generate (first 100 chars): ${textToRead.substring(0, 100)}...`)

  // Ensure API keys are present
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not defined in environment variables.')
  }

  // 1. Generate audio with timestamps via ElevenLabs
  console.log('Calling ElevenLabs API with timestamps...')
  const { audioBuffer, alignment, sourceText } = await generateTTSWithTimestamps(textToRead)

  // 2. Upload MP3 to Cloudflare R2
  const slug = path.basename(filePath, path.extname(filePath))
  const mp3Key = `${slug}.mp3`

  console.log(`Uploading MP3 to R2 as ${mp3Key}...`)
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

  console.log(`Uploading timestamps to R2 as ${timestampsKey}...`)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: timestampsKey,
      Body: JSON.stringify(formattedTimestamps, null, 2),
      ContentType: 'application/json',
    })
  )

  // 4. Update the markdown file with both URLs
  const audioUrl = `${PUBLIC_AUDIO_URL_BASE}/${mp3Key}`
  const timestampsUrl = `${PUBLIC_AUDIO_URL_BASE}/${timestampsKey}`

  parsed.data.audio = audioUrl
  parsed.data.audioTimestamps = timestampsUrl

  const newFileContent = matter.stringify(parsed.content, parsed.data)
  await fs.writeFile(filePath, newFileContent, 'utf-8')

  console.log(`Successfully processed ${filePath} and updated frontmatter.`)
  console.log(`  - Audio: ${audioUrl}`)
  console.log(`  - Timestamps: ${timestampsUrl} (${formattedTimestamps.words.length} words)`)
  return true
}

async function main() {
  let files = process.argv.slice(2)

  if (files.length === 0) {
    console.log('No files passed, scanning data/blog directory...')
    const blogDir = 'data/blog'
    const allFiles = await fs.readdir(blogDir)
    files = allFiles
      .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
      .map((f) => path.join(blogDir, f))
  }

  if (files.length === 0) {
    console.log('No files to process.')
    return
  }

  let updatedCount = 0
  for (const file of files) {
    if (file.startsWith('data/blog/') && (file.endsWith('.mdx') || file.endsWith('.md'))) {
      try {
        const updated = await processFile(file)
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
  if (updatedCount > 0) {
    console.log(`::set-output name=updated::true`)
  } else {
    console.log(`::set-output name=updated::false`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
