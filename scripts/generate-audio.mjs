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

async function generateTTS(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2', // Or default model
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

  return response.arrayBuffer()
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

  const title = parsed.data.title || 'Untitled'
  const plainTextContent = await extractPlainText(parsed.content)

  // Format matching n8n logic
  const textToRead = `=Title: ${title}.\n\n${plainTextContent}`
  console.log(`Text to generate (first 100 chars): ${textToRead.substring(0, 100)}...`)

  // Ensure API keys are present
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not defined in environment variables.')
  }

  // 1. Generate audio via ElevenLabs
  console.log('Calling ElevenLabs API...')
  const audioBuffer = await generateTTS(textToRead)

  // 2. Upload to Cloudflare R2
  const slug = path.basename(filePath, path.extname(filePath))
  const objectKey = `${slug}.mp3`

  console.log(`Uploading to R2 as ${objectKey}...`)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: Buffer.from(audioBuffer),
      ContentType: 'audio/mpeg',
    })
  )

  // 3. Update the markdown file
  const audioUrl = `${PUBLIC_AUDIO_URL_BASE}/${objectKey}`
  parsed.data.audio = audioUrl

  const newFileContent = matter.stringify(parsed.content, parsed.data)
  await fs.writeFile(filePath, newFileContent, 'utf-8')

  console.log(`Successfully processed ${filePath} and updated frontmatter.`)
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
