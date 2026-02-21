# AdBlog

Personal blog for Adão, built on Next.js, Tailwind CSS, and Contentlayer. Deployed to GitHub Pages.

## Features

- MDX-based content with Contentlayer
- Tags and categories
- Dark/light mode
- RSS feeds
- Comments via Giscus (GitHub Discussions)
- Search functionality

## Local Development

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build for production (static export)
EXPORT=1 UNOPTIMIZED=1 yarn build

# Serve production build locally
yarn start
```

## Writing Posts

Create MDX files in `data/blog/`:

```markdown
---
title: My Post Title
date: 2024-01-15
tags: ['Personal', 'Technology']
summary: A short summary for the post listing.
---

Your content here...
```

## Deployment

The site deploys automatically via GitHub Actions when you push to `main`.

1. Go to **Settings → Pages** in your GitHub repo
2. Set **Source** to **GitHub Actions**
3. Push to `main` to trigger deployment

### Environment Variables

For comments (Giscus), add these to your build:
- `NEXT_PUBLIC_GISCUS_REPO`
- `NEXT_PUBLIC_GISCUS_REPOSITORY_ID`
- `NEXT_PUBLIC_GISCUS_CATEGORY`
- `NEXT_PUBLIC_GISCUS_CATEGORY_ID`

## Disclaimer

All opinions expressed on this blog are my own and do not represent those of my employer.
