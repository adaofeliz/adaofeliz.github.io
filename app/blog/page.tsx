import { sortPosts, allCoreContent } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Main from '../Main'
import siteMetadata from '@/data/siteMetadata'

const title = 'Blog'
const description =
  'Writing about distributed systems, AI, infrastructure, and the craft of building.'
const url = `${siteMetadata.siteUrl}/blog`
const image = `${siteMetadata.siteUrl}/static/images/logo.png`

export const metadata = {
  title,
  description,
  alternates: {
    canonical: url,
    types: {
      'application/rss+xml': `${siteMetadata.siteUrl}/feed.xml`,
    },
  },
  openGraph: {
    title: `${title} | ${siteMetadata.title}`,
    description,
    url,
    siteName: siteMetadata.title,
    images: [{ url: image, width: 1200, height: 630, alt: `${title} | ${siteMetadata.title}` }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: `${title} | ${siteMetadata.title}`,
    description,
    images: [image],
  },
}

export default async function Page() {
  const sortedPosts = sortPosts(allBlogs)
  const posts = allCoreContent(sortedPosts)
  return <Main posts={posts} basePath="/blog" />
}
