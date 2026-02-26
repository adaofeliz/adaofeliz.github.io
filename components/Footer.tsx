import Link from './Link'
import siteMetadata from '@/data/siteMetadata'

export default function Footer() {
  const disclaimerText =
    'The views and opinions expressed on this blog are my own and do not represent those of my employer.'

  return (
    <footer>
      <div className="mt-16 flex flex-col items-center">
        <div className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {disclaimerText}
        </div>
        <div className="mb-2 flex space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div>{siteMetadata.author}</div>
          <div>{` • `}</div>
          <div>{`© ${new Date().getFullYear()}`}</div>
          <div>{` • `}</div>
          <Link
            href="/"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {siteMetadata.title}
          </Link>
        </div>
      </div>
    </footer>
  )
}
