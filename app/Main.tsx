'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import { formatDate } from 'pliny/utils/formatDate'
import { ALLOWED_CATEGORIES, type Category, getPostCategory } from '@/lib/categories'

const POSTS_PER_PAGE = 5
const ALL_CATEGORIES: Category[] = [...ALLOWED_CATEGORIES]

interface HomeProps {
  posts: CoreContent<Blog>[]
}

function HomeContent({ posts }: HomeProps) {
  const searchParams = useSearchParams()
  const [postsPerPage] = useState(POSTS_PER_PAGE)

  const rawTag = searchParams?.get('tag')
  const activeTag =
    rawTag && ALL_CATEGORIES.includes(rawTag as Category) ? (rawTag as Category) : null

  const rawPage = searchParams?.get('page')
  const parsedPage = rawPage ? Number.parseInt(rawPage, 10) : 1

  const filteredPosts = useMemo(() => {
    if (!activeTag) return posts
    return posts.filter((post) => getPostCategory(post.tags) === activeTag)
  }, [posts, activeTag])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage))
  const currentPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, totalPages) : 1
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages

  const displayPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage
    return filteredPosts.slice(startIndex, startIndex + postsPerPage)
  }, [filteredPosts, currentPage, postsPerPage])

  const getHref = (tag: Category | null, page = 1) => {
    const params = new URLSearchParams()
    if (tag) params.set('tag', tag)
    if (page > 1) params.set('page', String(page))
    const query = params.toString()
    return query ? `/?${query}` : '/'
  }

  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pt-6 pb-8 md:space-y-5">
          <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
            Personal blog about{' '}
            <Link
              href={activeTag === 'technology' ? '/' : '/?tag=technology'}
              className={activeTag === 'technology' ? 'underline underline-offset-4' : ''}
            >
              technology
            </Link>
            ,{' '}
            <Link
              href={activeTag === 'fitness' ? '/' : '/?tag=fitness'}
              className={activeTag === 'fitness' ? 'underline underline-offset-4' : ''}
            >
              fitness
            </Link>
            ,{' '}
            <Link
              href={activeTag === 'life' ? '/' : '/?tag=life'}
              className={activeTag === 'life' ? 'underline underline-offset-4' : ''}
            >
              life
            </Link>
            , and{' '}
            <Link
              href={activeTag === 'others' ? '/' : '/?tag=others'}
              className={activeTag === 'others' ? 'underline underline-offset-4' : ''}
            >
              other
            </Link>{' '}
            stuff.
          </p>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {!filteredPosts.length && 'No posts found.'}
          {displayPosts.map((post) => {
            const { slug, date, title, summary, tags } = post
            const category = getPostCategory(tags)
            return (
              <li key={slug} className="py-12">
                <article>
                  <div className="space-y-2 xl:grid xl:grid-cols-4 xl:items-baseline xl:space-y-0">
                    <dl>
                      <dt className="sr-only">Published on</dt>
                      <dd className="text-base leading-6 font-medium text-gray-500 dark:text-gray-400">
                        <time dateTime={date}>{formatDate(date, siteMetadata.locale)}</time>
                      </dd>
                    </dl>
                    <div className="space-y-5 xl:col-span-3">
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-2xl leading-8 font-bold tracking-tight">
                            <Link
                              href={`/blog/${slug}`}
                              className="text-[#1e1e1e] dark:text-gray-100"
                            >
                              {title}
                            </Link>
                          </h2>
                        </div>
                        <div className="prose max-w-none text-gray-500 dark:text-gray-400">
                          {summary}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-base leading-6 font-medium">
                        <Tag text={category} />
                        <span className="text-gray-400 dark:text-gray-500">|</span>
                        <Link
                          href={`/blog/${slug}`}
                          className="text-primary-600 hover:text-primary-700 dark:hover:text-primary-400 dark:hover:text-primary-300"
                          aria-label={`Read more: "${title}"`}
                        >
                          Read more &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
      {filteredPosts.length > postsPerPage && (
        <div className="space-y-2 pt-6 pb-8 md:space-y-5">
          <nav className="flex justify-between">
            {!prevPage && (
              <button className="cursor-auto disabled:opacity-50" disabled={!prevPage}>
                Previous
              </button>
            )}
            {prevPage && (
              <Link href={getHref(activeTag, currentPage - 1)} rel="prev">
                Previous
              </Link>
            )}
            <span>
              {currentPage} of {totalPages}
            </span>
            {!nextPage && (
              <button className="cursor-auto disabled:opacity-50" disabled={!nextPage}>
                Next
              </button>
            )}
            {nextPage && (
              <Link href={getHref(activeTag, currentPage + 1)} rel="next">
                Next
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  )
}

export default function Home(props: HomeProps) {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <HomeContent {...props} />
    </Suspense>
  )
}
