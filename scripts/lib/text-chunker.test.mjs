import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { remark } from 'remark'
import strip from 'strip-markdown'
import { chunkText, MAX_CHUNK_CHARS, TARGET_CHUNK_CHARS } from './text-chunker.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

async function realPostTexts() {
  const blogDir = path.resolve(here, '../../data/blog')
  const entries = (await fs.readdir(blogDir)).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))

  return Promise.all(
    entries.map(async (entry) => {
      const parsed = matter(await fs.readFile(path.join(blogDir, entry), 'utf-8'))
      const noJsx = parsed.content.replace(/<[^>]+>/g, '')
      return { entry, text: String(await remark().use(strip).process(noJsx)).trim() }
    })
  )
}

describe('chunkText', () => {
  it('returns nothing for empty input', () => {
    expect(chunkText('')).toEqual([])
  })

  it('keeps short text as a single chunk', () => {
    const text = 'The technology is new. The discipline required to use it well is not.'
    expect(chunkText(text)).toEqual([text])
  })

  it('never exceeds the documented ceiling', () => {
    const paragraph = `${'word '.repeat(400)}\n\n${'other '.repeat(400)}`
    for (const chunk of chunkText(paragraph)) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS)
    }
  })

  it('splits an unbroken run with no whitespace at all', () => {
    const chunks = chunkText('x'.repeat(2500))
    expect(chunks.join('')).toBe('x'.repeat(2500))
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS)
    }
  })

  it('prefers paragraph boundaries', () => {
    const a = 'A'.repeat(500)
    const b = 'B'.repeat(500)
    const chunks = chunkText(`${a}\n\n${b}`)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toBe(`${a}\n\n`)
    expect(chunks[1]).toBe(b)
  })

  it('rejects a target larger than the ceiling', () => {
    expect(() => chunkText('text', { targetChars: 900, maxChars: 800 })).toThrow(RangeError)
  })

  it('round trips every real blog post exactly', async () => {
    const posts = await realPostTexts()
    expect(posts.length).toBeGreaterThan(0)

    for (const { entry, text } of posts) {
      const chunks = chunkText(text)
      expect(chunks.join(''), `round trip failed for ${entry}`).toBe(text)
      for (const chunk of chunks) {
        expect(chunk.length, `chunk too long in ${entry}`).toBeLessThanOrEqual(MAX_CHUNK_CHARS)
      }
    }
  })

  it('keeps whitespace-separated words intact across every real post', async () => {
    const posts = await realPostTexts()

    for (const { entry, text } of posts) {
      const expected = text.split(/\s+/).filter(Boolean)
      // Chunk boundaries must not manufacture or destroy word tokens, because
      // the browser matches these tokens against the timestamp payload.
      const actual = chunkText(text).join('').split(/\s+/).filter(Boolean)
      expect(actual, `word tokens changed for ${entry}`).toEqual(expected)
    }
  })

  it('produces chunks that mostly sit near the target size', async () => {
    const posts = await realPostTexts()
    const longest = posts.sort((a, b) => b.text.length - a.text.length)[0]
    const chunks = chunkText(longest.text)

    expect(chunks.length).toBeGreaterThan(5)
    const average = chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length
    expect(average).toBeGreaterThan(TARGET_CHUNK_CHARS * 0.4)
  })
})
