#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const blogDir = path.join(__dirname, '../data/blog')

const ALLOWED_CATEGORIES = ['technology', 'fitness', 'life', 'others']

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return null
  }

  const frontmatterText = match[1]
  const tagsMatch = frontmatterText.match(/^tags:\s*\[(.*?)\]$/m)

  if (!tagsMatch) {
    return { tags: null }
  }

  const tagsContent = tagsMatch[1].trim()

  // Parse tags - handle both quoted and unquoted values
  const tagValues = []
  const tagMatches = tagsContent.match(/['"]?([^'",\s]+)['"]?/g)

  if (tagMatches) {
    tagMatches.forEach((tag) => {
      const cleaned = tag.replace(/['"\s]/g, '')
      if (cleaned) {
        tagValues.push(cleaned)
      }
    })
  }

  return { tags: tagValues }
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const frontmatter = extractFrontmatter(content)
  const fileName = path.basename(filePath)

  if (!frontmatter) {
    return {
      valid: false,
      error: `${fileName}: No frontmatter found`,
    }
  }

  if (!frontmatter.tags) {
    return {
      valid: false,
      error: `${fileName}: Missing 'tags' in frontmatter`,
    }
  }

  if (frontmatter.tags.length === 0) {
    return {
      valid: false,
      error: `${fileName}: 'tags' array is empty`,
    }
  }

  if (frontmatter.tags.length > 1) {
    return {
      valid: false,
      error: `${fileName}: 'tags' must contain exactly one value, found ${frontmatter.tags.length}: [${frontmatter.tags.join(', ')}]`,
    }
  }

  const tag = frontmatter.tags[0]

  if (tag === 'learning') {
    return {
      valid: false,
      error: `${fileName}: 'learning' tag is no longer allowed. Use one of: ${ALLOWED_CATEGORIES.join(', ')}`,
    }
  }

  if (!ALLOWED_CATEGORIES.includes(tag)) {
    return {
      valid: false,
      error: `${fileName}: Invalid tag '${tag}'. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
    }
  }

  return { valid: true }
}

function main() {
  if (!fs.existsSync(blogDir)) {
    console.error(`Error: Blog directory not found at ${blogDir}`)
    process.exit(1)
  }

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.mdx'))

  if (files.length === 0) {
    console.log('No MDX files found in data/blog/')
    process.exit(0)
  }

  const errors = []

  files.forEach((file) => {
    const filePath = path.join(blogDir, file)
    const result = validateFile(filePath)

    if (!result.valid) {
      errors.push(result.error)
    }
  })

  if (errors.length > 0) {
    console.error('Category validation failed:\n')
    errors.forEach((error) => console.error(`  ✗ ${error}`))
    console.error(`\nTotal errors: ${errors.length}`)
    process.exit(1)
  }

  console.log(`✓ Category validation passed (${files.length} files checked)`)
  process.exit(0)
}

main()
