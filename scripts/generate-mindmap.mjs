import { config } from 'dotenv'
config()

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { remark } from 'remark'
import strip from 'strip-markdown'
import { buildPrompt } from './lib/mindmap-prompt.mjs'
import { validateMindmapGraph } from './lib/mindmap-schema.mjs'
import { renderMindmapSVG } from './lib/mindmap-renderer.mjs'
import { renderMindmapPNG } from './lib/mindmap-png.mjs'

async function extractPlainText(markdown) {
  // Strip JSX tags before processing with strip-markdown since strip-markdown doesn't fully remove complex JSX
  const noJsx = markdown.replace(/<[^>]+>/g, '')
  const file = await remark().use(strip).process(noJsx)
  return String(file).trim()
}

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4.6'

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables.')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter returned empty response')

  try {
    return JSON.parse(content)
  } catch {
    const fenced = String(content).match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    const candidate = fenced?.[1] || String(content)
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('OpenRouter returned non-JSON content')
    }
    return JSON.parse(candidate.slice(start, end + 1))
  }
}

async function processFile(filePath, force = false) {
  const fileContent = await fs.readFile(filePath, 'utf-8')
  const parsed = matter(fileContent)

  // Skip if already has mindmap (idempotent) unless --force
  if (parsed.data.mindmap && !force) {
    console.log(`Skipping ${filePath} — mindmap already exists.`)
    return false
  }

  // Skip drafts
  if (parsed.data.draft) {
    console.log(`Skipping ${filePath} — draft post.`)
    return false
  }

  const slug = path.basename(filePath, path.extname(filePath))
  const title = parsed.data.title || slug
  const plainText = await extractPlainText(parsed.content)

  // Build prompt and call AI
  const prompt = buildPrompt(title, plainText)
  console.log(`Calling OpenRouter for ${slug}...`)

  let graph
  try {
    graph = await callOpenRouter(prompt)
  } catch (err) {
    console.warn(`Warning: AI call failed for ${slug}: ${err.message}`)
    return false
  }

  // Validate schema — retry once
  let validation = validateMindmapGraph(graph)
  if (!validation.valid) {
    console.warn(`Warning: Invalid graph for ${slug} (attempt 1): ${validation.errors.join(', ')}`)
    try {
      graph = await callOpenRouter(prompt)
      validation = validateMindmapGraph(graph)
    } catch (err) {
      console.warn(`Warning: Retry failed for ${slug}: ${err.message}`)
      return false
    }
    if (!validation.valid) {
      console.warn(
        `Warning: Invalid graph for ${slug} (attempt 2): ${validation.errors.join(', ')}. Skipping.`
      )
      return false
    }
  }

  const outputDir = 'public/static/mindmaps'
  await fs.mkdir(outputDir, { recursive: true })

  // Render SVG (inline mode)
  const inlineSvg = renderMindmapSVG(graph, 'inline')
  const svgPath = `public/static/mindmaps/${slug}.svg`
  await fs.writeFile(svgPath, inlineSvg, 'utf-8')

  // Render PNG (OG mode)
  const ogSvg = renderMindmapSVG(graph, 'og')
  const pngBuffer = await renderMindmapPNG(ogSvg)
  const pngPath = `public/static/mindmaps/${slug}-og.png`
  await fs.writeFile(pngPath, pngBuffer)

  // Update frontmatter
  const mindmapUrl = `/static/mindmaps/${slug}.svg`
  const ogPngUrl = `/static/mindmaps/${slug}-og.png`

  parsed.data.mindmap = mindmapUrl

  // Prepend mindmap PNG to images array
  const existingImages = Array.isArray(parsed.data.images)
    ? parsed.data.images
    : parsed.data.images
      ? [parsed.data.images]
      : []
  parsed.data.images = [ogPngUrl, ...existingImages.filter((img) => img !== ogPngUrl)]

  const newContent = matter.stringify(parsed.content, parsed.data)
  await fs.writeFile(filePath, newContent, 'utf-8')

  console.log(`✓ Generated mindmap for ${slug}`)
  console.log(`  SVG: ${svgPath}`)
  console.log(`  PNG: ${pngPath}`)
  return true
}

async function main() {
  // Check API key early
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('Error: OPENROUTER_API_KEY is not set. Cannot generate mindmaps.')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const slugIndex = args.indexOf('--slug')
  const targetSlug = slugIndex !== -1 ? args[slugIndex + 1] : null

  let files
  if (targetSlug) {
    files = [`data/blog/${targetSlug}.mdx`]
  } else {
    const blogDir = 'data/blog'
    const allFiles = await fs.readdir(blogDir)
    files = allFiles
      .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
      .map((f) => path.join(blogDir, f))
  }

  let updatedCount = 0
  for (const file of files) {
    if (file.startsWith('data/blog/') && (file.endsWith('.mdx') || file.endsWith('.md'))) {
      try {
        const updated = await processFile(file, force)
        if (updated) updatedCount++
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message)
        // Don't exit — continue to next file
      }
    }
  }

  console.log(`\nDone. Generated ${updatedCount} mindmap(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
