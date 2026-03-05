import { allStreams } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { formatDate } from 'pliny/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'

export const metadata = {
  title: 'Stream - ' + siteMetadata.title,
  description: 'Micro-journaling, server logs, and quick thoughts.',
}

export default function StreamPage() {
  const sortedStreams = [...allStreams].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="mx-auto max-w-3xl font-mono">
      <div className="space-y-2 border-b border-gray-200 pt-6 pb-8 md:space-y-5 dark:border-gray-800">
        <p className="flex items-center gap-2 text-lg text-gray-500 dark:text-gray-400">
          <span className="text-primary-500">$</span> tail -f ~/.stream/*.log
          <span className="bg-primary-500 inline-block h-5 w-2 animate-pulse"></span>
        </p>
      </div>

      <div className="py-8">
        <div className="relative ml-3 border-l border-dashed border-gray-300 md:ml-4 dark:border-gray-700">
          {sortedStreams.map((stream, idx) => {
            return (
              <div key={stream.path} className="group relative mb-12 ml-8">
                <span className="group-hover:border-primary-500 absolute -left-[44.5px] flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-50 transition-colors dark:border-gray-700 dark:bg-gray-950">
                  <span className="group-hover:bg-primary-500 h-2 w-2 rounded-full bg-gray-400 transition-colors dark:bg-gray-600"></span>
                </span>

                <div className="mb-2 flex flex-col">
                  <time className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(stream.date, siteMetadata.locale)}
                  </time>
                  <h3 className="flex items-baseline gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                    <span className="text-primary-500 text-sm font-normal">
                      [{String(sortedStreams.length - 1 - idx).padStart(3, '0')}]
                    </span>
                    <span className="leading-tight">{stream.title}</span>
                  </h3>
                </div>

                {stream.tags && stream.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {stream.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-primary-600 dark:text-primary-400 text-xs before:content-['#']"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="prose dark:prose-invert mt-4 max-w-none rounded-sm border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/50">
                  <MDXLayoutRenderer code={stream.body.code} components={components} />
                </div>
              </div>
            )
          })}
        </div>
        {sortedStreams.length === 0 && (
          <div className="mt-10 text-center text-gray-500 dark:text-gray-400">
            <span className="text-primary-500">$</span> grep -r "thoughts" /dev/null
            <br />
            [No entries found in stream log]
          </div>
        )}
      </div>
    </div>
  )
}
