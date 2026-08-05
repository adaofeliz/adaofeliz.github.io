/**
 * Shared helpers for reading blog posts and turning them into narration text.
 *
 * Previously duplicated verbatim in generate-audio.mjs and
 * backfill-timestamps.mjs, which meant a fix to the JSX stripping only ever
 * landed in one of them.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { remark } from 'remark'
import strip from 'strip-markdown'

export const BLOG_DIR = 'data/blog'

export async function extractPlainText(markdown) {
  // Strip JSX tags before processing with strip-markdown since strip-markdown doesn't fully remove complex JSX
  const noJsx = markdown.replace(/<[^>]+>/g, '')
  const file = await remark().use(strip).process(noJsx)
  return String(file).trim()
}

export function slugFor(filePath) {
  return path.basename(filePath, path.extname(filePath))
}

export async function readPost(filePath) {
  return matter(await fs.readFile(filePath, 'utf-8'))
}

export async function writePost(filePath, parsed) {
  await fs.writeFile(filePath, matter.stringify(parsed.content, parsed.data), 'utf-8')
}

export async function listPostFiles() {
  const entries = await fs.readdir(BLOG_DIR)
  return entries
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .map((f) => path.join(BLOG_DIR, f))
    .sort()
}
