import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Image from '@/components/Image'
import Link from './Link'
import MobileNav from './MobileNav'
import ThemeSwitch from './ThemeSwitch'

const Header = () => {
  let headerClass = 'flex items-center w-full bg-[#f0f0f0] dark:bg-[#1e1e1e] justify-between py-10'
  if (siteMetadata.stickyNav) {
    headerClass += ' sticky top-0 z-50'
  }

  return (
    <header className={headerClass}>
      <Link href="/" aria-label={siteMetadata.headerTitle}>
        <div className="flex items-center justify-between">
          <div className="mr-3 flex h-10 w-10 shrink-0">
            <Image src="/static/images/logo.png" alt="" width={40} height={40} />
          </div>
          {typeof siteMetadata.headerTitle === 'string' ? (
            <div className="hidden h-6 text-2xl font-semibold sm:block">
              {siteMetadata.headerTitle}
            </div>
          ) : (
            siteMetadata.headerTitle
          )}
        </div>
      </Link>
      <div className="flex items-center space-x-4 leading-5 sm:-mr-6 sm:space-x-6">
        <div className="no-scrollbar hidden max-w-40 items-center gap-x-4 overflow-x-auto sm:flex md:max-w-72 lg:max-w-96">
          {headerNavLinks
            .filter((link) => link.href !== '/')
            .map((link) => (
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
