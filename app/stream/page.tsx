import { allStreams } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { formatDate } from 'pliny/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'
import { coreContent } from 'pliny/utils/contentlayer'

export const metadata = {
  title: 'Stream - ' + siteMetadata.title,
  description: 'Micro-journaling, server logs, and quick thoughts.',
}

export default function StreamPage() {
  const sortedStreams = [...allStreams].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="mx-auto max-w-3xl divide-y divide-gray-200 dark:divide-gray-700">
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
          Stream
        </h1>
        <p className="font-mono text-lg text-sm leading-7 text-gray-500 dark:text-gray-400">
          {'> tail -f /var/log/mind/thoughts.log'}
        </p>
      </div>

      <div className="py-8">
        <div className="relative ml-3 border-l border-gray-200 md:ml-4 dark:border-gray-700">
          {sortedStreams.map((stream, idx) => {
            return (
              <div key={stream.path} className="mb-10 ml-6">
                <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 ring-8 ring-white dark:bg-blue-900 dark:ring-gray-900"></span>

                <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {stream.title}
                  </h3>
                  <time className="mb-1 font-mono text-sm leading-none font-normal text-gray-400 sm:mb-0 dark:text-gray-500">
                    {formatDate(stream.date, siteMetadata.locale)}
                  </time>
                </div>

                {stream.tags && stream.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {stream.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="prose dark:prose-invert mt-3 max-w-none rounded-md border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-800 shadow-inner dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                  <MDXLayoutRenderer code={stream.body.code} components={components} />
                </div>
              </div>
            )
          })}
        </div>
        {sortedStreams.length === 0 && (
          <div className="mt-10 text-center font-mono text-sm text-gray-500 dark:text-gray-400">
            [No entries found in stream log]
          </div>
        )}
      </div>
    </div>
  )
}
