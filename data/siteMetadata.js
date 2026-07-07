/** @type {import("pliny/config").PlinyConfig } */
const siteMetadata = {
  title: 'Adão Feliz',
  author: 'Adão',
  headerTitle: 'adaofeliz',
  description:
    'CTO, builder, and engineering leader. Writing about distributed systems, AI, and the craft of building.',
  language: 'en-us',
  theme: 'system', // system, dark or light
  siteUrl: 'https://www.adaofeliz.com',
  siteLogo: `${process.env.BASE_PATH || ''}/static/images/logo.png`,
  email: 'hello@vianapinto.pt',
  locale: 'en-US',
  // set to true if you want a navbar fixed to the top
  stickyNav: false,
}

module.exports = siteMetadata
