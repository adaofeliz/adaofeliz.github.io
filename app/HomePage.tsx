import HomeQuotes from '@/components/HomeQuotes'
import HomeSubtitle from '@/components/HomeSubtitle'
import SectionContainer from '@/components/SectionContainer'
import homepageData from '@/data/homepageData'

type HomePageProps = Readonly<{
  latestPost: ReadonlyArray<{
    title: string
    slug: string
    date: string
  }>
  quotes: ReadonlyArray<{
    readonly text: string
    readonly slug: string
    readonly title: string
  }>
}>

export default function HomePage({ latestPost, quotes }: HomePageProps) {
  return (
    <SectionContainer>
      <main className="divide-y divide-gray-200 dark:divide-gray-800">
        <HomeSubtitle latest={latestPost} />

        <HomeQuotes quotes={quotes} />

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
      </main>
    </SectionContainer>
  )
}
