import { sortPosts, allCoreContent } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Main from '../Main'

export const metadata = {
  title: 'Blog — Adão Feliz',
  description: 'Writing about distributed systems, AI, infrastructure, and the craft of building.',
}

export default async function Page() {
  const sortedPosts = sortPosts(allBlogs)
  const posts = allCoreContent(sortedPosts)
  return <Main posts={posts} basePath="/blog" />
}
