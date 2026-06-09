import Link from '@/components/Link'

interface PostNavFooterProps {
  prev?: { path: string; title: string }
  next?: { path: string; title: string }
}

export default function PostNavFooter({ prev, next }: PostNavFooterProps) {
  if (!prev?.path && !next?.path) return null

  return (
    <footer>
      <div className="flex flex-col text-sm font-medium sm:flex-row sm:justify-between sm:text-base">
        {prev?.path && (
          <div className="pt-4 xl:pt-8">
            <Link
              href={`/${prev.path}`}
              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
              aria-label={`Previous post: ${prev.title}`}
            >
              &larr; {prev.title}
            </Link>
          </div>
        )}
        {next?.path && (
          <div className="pt-4 xl:pt-8">
            <Link
              href={`/${next.path}`}
              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
              aria-label={`Next post: ${next.title}`}
            >
              {next.title} &rarr;
            </Link>
          </div>
        )}
      </div>
    </footer>
  )
}
