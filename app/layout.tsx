import 'css/tailwind.css'
import 'remark-github-blockquote-alert/alert.css'

import { JetBrains_Mono } from 'next/font/google'
import EasterEggs from '@/components/EasterEggs'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import siteMetadata from '@/data/siteMetadata'
import { ThemeProviders } from './theme-providers'
import { Metadata } from 'next'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: {
    default: '$ ~/_adflz',
    template: `$ ~/_adflz | %s`,
  },
  description: siteMetadata.description,
  authors: [{ name: siteMetadata.author, url: siteMetadata.siteUrl }],
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    url: siteMetadata.siteUrl,
    siteName: siteMetadata.title,
    images: [
      {
        url: `${siteMetadata.siteUrl}/static/images/logo.png`,
        width: 1200,
        height: 630,
        alt: siteMetadata.title,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteMetadata.title,
    description: siteMetadata.description,
    images: [`${siteMetadata.siteUrl}/static/images/logo.png`],
  },
  alternates: {
    canonical: siteMetadata.siteUrl,
    types: {
      'application/rss+xml': `${siteMetadata.siteUrl}/feed.xml`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const basePath = process.env.BASE_PATH || ''

  return (
    <html
      lang={siteMetadata.language}
      className={`${jetbrainsMono.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <link
        rel="apple-touch-icon"
        sizes="76x76"
        href={`${basePath}/static/favicons/apple-touch-icon.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href={`${basePath}/static/favicons/favicon-32x32.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href={`${basePath}/static/favicons/favicon-16x16.png`}
      />
      <link rel="manifest" href={`${basePath}/static/favicons/site.webmanifest`} />
      <link
        rel="mask-icon"
        href={`${basePath}/static/favicons/safari-pinned-tab.svg`}
        color="#2e7d32"
      />
      <meta name="msapplication-TileColor" content="#1e1e1e" />
      <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e1e1e" />
      <link rel="alternate" type="application/rss+xml" href={`${basePath}/feed.xml`} />
      <body className="flex min-h-screen flex-col bg-white pl-[calc(100vw-100%)] text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <ThemeProviders>
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6 xl:max-w-5xl xl:px-0">
            <Header />
            <main className="flex-1">{children}</main>
            <EasterEggs />
            <Footer />
          </div>
        </ThemeProviders>
        {/* Cloudflare Web Analytics */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "4884e99f38b143afa42e99b1d5f12acd"}'
        ></script>
        {/* End Cloudflare Web Analytics */}
      </body>
    </html>
  )
}
