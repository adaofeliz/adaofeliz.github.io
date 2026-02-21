/** @type {import("pliny/config").PlinyConfig } */
const siteMetadata = {
  title: 'AdBlog',
  author: 'Adão',
  headerTitle: 'AdBlog',
  description: 'Personal blog about technology, fitness, and life.',
  language: 'en-us',
  theme: 'system', // system, dark or light
  siteUrl: 'https://www.adaofeliz.com',
  siteRepo: 'https://github.com/adaofeliz/personal-blog',
  siteLogo: `${process.env.BASE_PATH || ''}/static/images/logo.png`,
  socialBanner: `${process.env.BASE_PATH || ''}/static/images/twitter-card.png`,
  email: 'hello@vianapinto.pt',
  locale: 'en-US',
  // set to true if you want a navbar fixed to the top
  stickyNav: false,
}

module.exports = siteMetadata
