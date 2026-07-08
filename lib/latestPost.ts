export interface LatestPostInput {
  title: string
  slug: string
  date: string
  listed?: boolean
  draft?: boolean
}

export interface LatestPost {
  title: string
  slug: string
  date: string
}

export function getLatestPost(posts: readonly LatestPostInput[]): LatestPost | null {
  const visible = posts.filter((post) => post.listed !== false && post.draft !== true)

  if (visible.length === 0) {
    return null
  }

  const sorted = [...visible].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date)
    }

    return a.slug.localeCompare(b.slug)
  })

  const { title, slug, date } = sorted[0]

  return { title, slug, date }
}

/**
 * Formats an ISO date string as a bracketed log-style timestamp, e.g.
 * "2026-07-07T00:00:00.000Z" -> "2026-07-07 00:00:00".
 *
 * Uses plain string slicing (no Date object, no timezone conversion) so the
 * result is identical on the server and the client - required for a
 * hydration-safe SSR render.
 */
export function formatLogTimestamp(isoDate: string): string {
  const datePart = isoDate.slice(0, 10)
  const timePart = isoDate.slice(11, 19)

  return `${datePart} ${timePart}`
}
