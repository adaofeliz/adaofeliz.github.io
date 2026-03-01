'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { formatDate } from 'pliny/utils/formatDate'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import {
  ALLOWED_CATEGORIES,
  getPostCategory,
  CATEGORY_LABELS,
  type Category,
} from '@/lib/categories'

interface PaginationProps {
  totalPages: number
  currentPage: number
}
interface ListLayoutProps {
  posts: CoreContent<Blog>[]
  title: string
  initialDisplayPosts?: CoreContent<Blog>[]
  pagination?: PaginationProps
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const basePath = pathname
    .replace(/^\//, '')
    .replace(/\/page\/\d+\/?$/, '')
    .replace(/\/$/, '')
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages

  return (
    <div className="space-y-2 pt-6 pb-8 md:space-y-5">
      <nav className="flex justify-between">
        {!prevPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!prevPage}>
            Previous
          </button>
        )}
        {prevPage && (
          <Link
            href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
            rel="prev"
          >
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
          <Link href={`/${basePath}/page/${currentPage + 1}`} rel="next">
            Next
          </Link>
        )}
      </nav>
    </div>
  )
}

const ALL_CATEGORIES: Category[] = [...ALLOWED_CATEGORIES]

function ListLayoutContent({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}: ListLayoutProps) {
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState('')

  const activeTag = searchParams?.get('tag') as Category | null
  const isValidTag = activeTag && ALL_CATEGORIES.includes(activeTag)

  const categoryFilteredPosts = useMemo(() => {
    if (!isValidTag) return posts
    return posts.filter((post) => {
      const category = getPostCategory(post.tags)
      return category === activeTag
    })
  }, [posts, isValidTag, activeTag])

  const filteredBlogPosts = categoryFilteredPosts.filter((post) => {
    const searchContent = post.title + post.summary + post.tags?.join(' ')
    return searchContent.toLowerCase().includes(searchValue.toLowerCase())
  })

  const displayPosts =
    initialDisplayPosts.length > 0 && !searchValue && !isValidTag
      ? initialDisplayPosts
      : filteredBlogPosts

  const isFiltering = !!searchValue || !!isValidTag
  const filteredCount = filteredBlogPosts.length

  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pt-6 pb-4 md:space-y-5">
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
            {title}
          </h1>

          <div className="flex flex-wrap gap-2 py-2">
            <Link
              href="/blog"
              className={`focus:ring-primary-500 rounded-full px-3 py-1 text-xs font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-900 ${
                !isValidTag
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              All
            </Link>
            {ALL_CATEGORIES.map((category) => (
              <Link
                key={category}
                href={`/blog?tag=${category}`}
                className={`focus:ring-primary-500 rounded-full px-3 py-1 text-xs font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-900 ${
                  isValidTag && activeTag === category
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {CATEGORY_LABELS[category]}
              </Link>
            ))}
          </div>

          <div className="relative max-w-lg">
            <label>
              <span className="sr-only">Search articles</span>
              <input
                aria-label="Search articles"
                type="text"
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search articles"
                className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 bg-[#e8e8e8] px-4 py-2 text-[#1e1e1e] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <svg
              className="absolute top-3 right-3 h-5 w-5 text-gray-400 dark:text-gray-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {isFiltering && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredCount} post{filteredCount !== 1 ? 's' : ''}
              {isValidTag ? ` in "${CATEGORY_LABELS[activeTag]}"` : ''}
              {searchValue ? ` matching "${searchValue}"` : ''}
            </p>
          )}
        </div>
        <ul>
          {!filteredBlogPosts.length && 'No posts found.'}
          {displayPosts.map((post) => {
            const { path, date, title, summary, tags } = post
            const category = getPostCategory(tags)
            return (
              <li key={path} className="py-4">
                <article className="space-y-2 xl:grid xl:grid-cols-4 xl:items-baseline xl:space-y-0">
                  <dl>
                    <dt className="sr-only">Published on</dt>
                    <dd className="text-base leading-6 font-medium text-gray-500 dark:text-gray-400">
                      <time dateTime={date}>{formatDate(date, siteMetadata.locale)}</time>
                    </dd>
                  </dl>
                  <div className="space-y-3 xl:col-span-3">
                    <div>
                      <h3 className="text-2xl leading-8 font-bold tracking-tight">
                        <Link href={`/${path}`} className="text-gray-900 dark:text-gray-100">
                          {title}
                        </Link>
                      </h3>
                    </div>
                    <div className="prose max-w-none text-gray-500 dark:text-gray-400">
                      {summary}
                    </div>
                    <div className="flex items-center gap-2 text-base leading-6 font-medium">
                      <Tag text={category} />
                      <span className="text-gray-400 dark:text-gray-500">|</span>
                      <Link
                        href={`/${path}`}
                        className="text-primary-600 hover:text-primary-700 dark:hover:text-primary-400 dark:hover:text-primary-300"
                        aria-label={`Read more: "${title}"`}
                      >
                        Read more &rarr;
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
      {pagination && pagination.totalPages > 1 && !isFiltering && (
        <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
      )}
    </>
  )
}

export default function ListLayout(props: ListLayoutProps) {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <ListLayoutContent {...props} />
    </Suspense>
  )
}
