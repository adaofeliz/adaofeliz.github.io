import { describe, expect, it } from 'vitest'

import { formatLogTimestamp, getLatestPost } from '@/lib/latestPost'

describe('getLatestPost', () => {
  it('returns the newest post by ISO date', () => {
    const posts = [
      { title: 'Older post', slug: 'older', date: '2024-12-31' },
      { title: 'Fresh post', slug: 'fresh', date: '2025-01-02' },
      { title: 'Middle post', slug: 'middle', date: '2025-01-01' },
    ]

    expect(getLatestPost(posts)).toEqual({
      title: 'Fresh post',
      slug: 'fresh',
      date: '2025-01-02',
    })
  })

  it('filters out listed:false entries', () => {
    const posts = [
      { title: 'Hidden post', slug: 'hidden', date: '2025-01-05', listed: false },
      { title: 'Visible post', slug: 'visible', date: '2025-01-05' },
    ]

    expect(getLatestPost(posts)).toEqual({
      title: 'Visible post',
      slug: 'visible',
      date: '2025-01-05',
    })
  })

  it('filters out draft:true entries', () => {
    const posts = [
      { title: 'Draft post', slug: 'draft', date: '2025-02-01', draft: true },
      { title: 'Published post', slug: 'published', date: '2025-02-01' },
    ]

    expect(getLatestPost(posts)).toEqual({
      title: 'Published post',
      slug: 'published',
      date: '2025-02-01',
    })
  })

  it('returns null for an empty input list', () => {
    expect(getLatestPost([])).toBeNull()
  })

  it('breaks ties by slug alphabetical order', () => {
    const posts = [
      { title: 'Beta', slug: 'beta', date: '2025-03-01' },
      { title: 'Alpha', slug: 'alpha', date: '2025-03-01' },
    ]

    expect(getLatestPost(posts)).toEqual({
      title: 'Alpha',
      slug: 'alpha',
      date: '2025-03-01',
    })
  })
})

describe('formatLogTimestamp', () => {
  it('formats a full ISO datetime as "YYYY-MM-DD HH:MM:SS"', () => {
    expect(formatLogTimestamp('2026-07-07T13:54:05.000Z')).toBe('2026-07-07 13:54:05')
  })

  it('formats a midnight ISO datetime', () => {
    expect(formatLogTimestamp('2026-07-07T00:00:00.000Z')).toBe('2026-07-07 00:00:00')
  })

  it('is stable regardless of the host timezone (pure string slicing)', () => {
    const withOffset = formatLogTimestamp('2026-01-01T23:59:59.000Z')
    expect(withOffset).toBe('2026-01-01 23:59:59')
  })
})
