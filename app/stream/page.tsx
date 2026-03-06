import { allStreams } from 'contentlayer/generated'
import type { Metadata } from 'next'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { formatDate } from 'pliny/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'
import { roadmapData } from '@/data/stream/roadmap'

export const metadata: Metadata = {
  title: 'Stream - ' + siteMetadata.title,
  description: 'Micro-journaling, server logs, and the live AI roadmap kernel.',
}

export default function StreamPage() {
  const sortedStreams = [...allStreams].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const doneRoadmap = [...roadmapData.done].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const inProgressRoadmap = [...roadmapData.inProgress].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="mx-auto max-w-3xl font-mono">
      <div className="space-y-2 border-b border-gray-200 pt-6 pb-8 md:space-y-5 dark:border-gray-800">
        <p className="flex items-center gap-2 text-lg text-gray-500 dark:text-gray-400">
          <span className="text-primary-500">$</span>
          <span className="whitespace-pre-wrap">
            cat ~/.stream/secret-roadmap.bin | ai-decode --mode omniscient
          </span>
          <span className="bg-primary-500 inline-block h-5 w-2 animate-pulse"></span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="text-primary-500">→</span> Live kernel: done / in-progress / future
          experiments.
        </p>
      </div>

      <div className="py-8">
        <div className="mb-10 space-y-5 rounded-sm border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/50">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs tracking-wider text-gray-500 uppercase dark:text-gray-400">
              <span className="text-primary-500">$</span> roadmapctl status --all
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-sm border border-emerald-200/60 bg-emerald-50/30 p-3 dark:border-emerald-900/80 dark:bg-emerald-950/10">
                <h2 className="mb-3 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  [done]
                </h2>
                <ul className="space-y-3">
                  {doneRoadmap.map((item) => (
                    <li key={item.title} className="space-y-1">
                      <p className="text-gray-900 dark:text-gray-100">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.date}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{item.why}</p>
                      <p className="text-primary-700 dark:text-primary-400 text-xs">{item.stack}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-sm border border-amber-200/60 bg-amber-50/40 p-3 dark:border-amber-900/80 dark:bg-amber-950/10">
                <h2 className="mb-3 text-sm font-bold text-amber-700 dark:text-amber-300">
                  [in-progress]
                </h2>
                <ul className="space-y-3">
                  {inProgressRoadmap.map((item) => (
                    <li key={item.title} className="space-y-1">
                      <p className="text-gray-900 dark:text-gray-100">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.date}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{item.why}</p>
                      <p className="text-primary-700 dark:text-primary-400 text-xs">{item.stack}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <section className="rounded-sm border border-gray-200 p-3 dark:border-gray-700">
            <h2 className="mb-3 text-sm font-bold text-gray-800 dark:text-gray-200">[future]</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {roadmapData.future.map((item) => (
                <li key={item} className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="text-primary-500">::</span> {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

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
