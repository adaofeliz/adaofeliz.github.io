import HomePage from './HomePage'
import siteMetadata from '@/data/siteMetadata'

const title = 'Adão Feliz — CTO, builder, engineering leader'
const description =
  'Personal website of Adão Feliz. CTO at Powerdot. Building EV infrastructure, AI systems, and engineering teams across Europe.'
const url = siteMetadata.siteUrl
const image = `${siteMetadata.siteUrl}/static/images/logo.png`

export const metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: url,
  },
  openGraph: {
    title,
    description,
    url,
    siteName: siteMetadata.title,
    images: [{ url: image, width: 1200, height: 630, alt: title }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title,
    description,
    images: [image],
  },
}

export default function Page() {
  return <HomePage />
}
