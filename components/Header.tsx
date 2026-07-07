import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'
import MobileNav from './MobileNav'
import ThemeSwitch from './ThemeSwitch'

const Header = () => {
  let headerClass = 'flex items-center w-full bg-white dark:bg-gray-950 justify-between py-10'
  if (siteMetadata.stickyNav) {
    headerClass += ' sticky top-0 z-50'
  }

  return (
    <header className={headerClass}>
      <Link href="/" aria-label={siteMetadata.headerTitle}>
        <div className="flex items-center gap-1 font-mono">
          <span className="text-primary-500 text-2xl font-semibold">$</span>
          <span className="hidden text-2xl font-semibold text-[#1e1e1e] sm:inline dark:text-gray-100">
            ~/_adflz
          </span>
          <span className="inline text-2xl font-semibold text-[#1e1e1e] sm:hidden dark:text-gray-100">
            ~/_
          </span>
          <span
            aria-hidden="true"
            className="bg-primary-500 inline-block h-5 w-2 animate-pulse motion-reduce:animate-none"
          />
        </div>
      </Link>
      <div className="flex items-center space-x-4 leading-5 sm:-mr-6 sm:space-x-6">
        <div className="no-scrollbar hidden max-w-40 items-center gap-x-4 overflow-x-auto sm:flex md:max-w-72 lg:max-w-96">
          {headerNavLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="hover:text-primary-600 dark:hover:text-primary-400 m-1 font-medium text-[#1e1e1e] dark:text-gray-100"
            >
              {link.title}
            </Link>
          ))}
        </div>
        <ThemeSwitch />
        <MobileNav />
      </div>
    </header>
  )
}

export default Header
