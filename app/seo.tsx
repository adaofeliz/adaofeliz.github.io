import { Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'

interface PageSEOProps {
  title: string
  description?: string
  image?: string
  canonical?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export function genPageMetadata({
  title,
  description,
  image,
  canonical,
  ...rest
}: PageSEOProps): Metadata {
  const resolvedDescription = description || siteMetadata.description
  const resolvedImage = image || `${siteMetadata.siteUrl}/static/images/logo.png`
  const resolvedCanonical = canonical || siteMetadata.siteUrl

  return {
    title,
    description: resolvedDescription,
    alternates: {
      canonical: resolvedCanonical,
    },
    openGraph: {
      title: `${title} | ${siteMetadata.title}`,
      description: resolvedDescription,
      url: resolvedCanonical,
      siteName: siteMetadata.title,
      images: [
        {
          url: resolvedImage,
          width: 1200,
          height: 630,
          alt: `${title} | ${siteMetadata.title}`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteMetadata.title}`,
      description: resolvedDescription,
      images: [resolvedImage],
    },
    ...rest,
  }
}
