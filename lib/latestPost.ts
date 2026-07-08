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
