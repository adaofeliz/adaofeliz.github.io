import HomePage from './HomePage'
import { allBlogs } from 'contentlayer/generated'
import siteMetadata from '@/data/siteMetadata'
import { getLatestPost } from '@/lib/latestPost'
import type { LatestPostInput } from '@/lib/latestPost'
import homeQuotes from '@/data/homeQuotes'

const title = '$ ~/_adflz'
const description =
  'Personal website of Adão Feliz. CTO at Powerdot. Building EV infrastructure, AI systems, and engineering teams across Europe.'
const url = siteMetadata.siteUrl
const image = `${siteMetadata.siteUrl}/static/images/logo.png`

export const metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: url,
  },
  openGraph: {
    title,
    description,
    url,
    siteName: siteMetadata.title,
    images: [{ url: image, width: 1200, height: 630, alt: title }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title,
    description,
    images: [image],
  },
}

export default function Page() {
  const posts: readonly LatestPostInput[] = allBlogs.map((post) => ({
    title: post.title,
    slug: post.slug,
    date: post.date,
    listed: post.listed,
    draft: post.draft,
  }))

  const latestPosts = getLatestPost(posts, 3)

  return <HomePage latestPost={latestPosts} quotes={homeQuotes} />
}
