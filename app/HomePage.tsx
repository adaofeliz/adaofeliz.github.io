import Link from '@/components/Link'
import SectionContainer from '@/components/SectionContainer'
import homepageData from '@/data/homepageData'

export default function HomePage() {
  return (
    <SectionContainer>
      <main className="divide-y divide-gray-200 dark:divide-gray-800">
        <section className="py-16 sm:py-20">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-100">
            {homepageData.hero.tagline}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-500 dark:text-gray-500">
            {homepageData.hero.description}
          </p>
          <p className="mt-2 text-xl text-gray-600 dark:text-gray-400">
            {homepageData.hero.role} · {homepageData.hero.location}
          </p>
        </section>

        <section className="py-16">
          <h2 className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-widest uppercase">
            Focus Areas
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {homepageData.focusAreas.map((area) => (
              <div key={area.id} className="border-l border-gray-200 pl-4 dark:border-gray-800">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">{area.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {area.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <h2 className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-widest uppercase">
            Philosophy
          </h2>
          <blockquote className="border-primary-500 mt-8 border-l-4 pl-4 text-gray-600 italic dark:text-gray-400">
            <p className="text-lg">{homepageData.philosophy.quote}</p>
            <footer className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              {homepageData.philosophy.attribution}
            </footer>
          </blockquote>
        </section>

        <div className="py-16">
          <Link
            href="/blog"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Read the blog →
          </Link>
        </div>
      </main>
    </SectionContainer>
  )
}
