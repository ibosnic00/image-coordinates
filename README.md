# Image Coordinates Editor

A modern web application for editing and managing image coordinates, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- Modern, responsive UI built with shadcn/ui components
- Image coordinate editing capabilities
- Theme switching (light/dark mode)
- Mobile-responsive design
- Built with Next.js 15 and React 19

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Build for GitHub Pages
npm run build:gh-pages
```

## Deployment

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

### GitHub Pages Setup

1. The project is configured with `output: 'export'` in `next.config.mjs` for static site generation
2. GitHub Actions workflow automatically builds and deploys on push to main branch
3. The site will be available at: `https://ibosnic00.github.io/image-coordinates/`

### Cloudflare Proxy Setup

To proxy the site through Cloudflare to `coordinates.afterfive.hr`:

1. Add a CNAME record in Cloudflare DNS:
   - Name: `coordinates`
   - Target: `ibosnic00.github.io`
   - Proxy status: Proxied (orange cloud)

2. Configure Cloudflare Page Rules if needed for SSL/TLS settings

## Project Structure

```
├── app/                 # Next.js app directory
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Custom components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── public/              # Static assets
└── styles/              # Global styles
```

## Technologies Used

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Deployment**: GitHub Pages + GitHub Actions
- **Package Manager**: npm
