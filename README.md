# AI Music Playlist Generator

A web application that connects to your Spotify account, analyzes your listening history, and uses Claude (Anthropic) to generate ~25 curated song recommendations as a new private Spotify playlist.

## Architecture

- **Frontend** (`packages/frontend`): React SPA (TypeScript), served via Firebase Hosting
- **Backend** (`packages/backend`): Node.js / TypeScript on Google Cloud Run
- **Database**: Google Cloud Firestore
- **Auth**: Spotify OAuth 2.0 with PKCE
- **AI**: Anthropic Claude API (structured JSON via tool-use)

## Prerequisites

- Node.js 20 (use `nvm use` to switch automatically)
- npm 10+

## Getting started

```bash
# Install all workspace dependencies
npm install

# Run both packages in dev mode (requires turbo)
npm run dev

# Run all tests
npm test

# Type-check all packages
npm run typecheck

# Lint all packages
npm run lint

# Format all files
npm run format
```

## Workspace layout

```
packages/
  frontend/   # React SPA
  backend/    # Node.js / Express API
```

## Environment variables

See each package's `README.md` or `.env.example` for required variables. Secrets (Spotify client secret, Claude API key, JWT signing key, refresh-token encryption key) are loaded from Google Secret Manager at backend startup — never set them as environment variables in production.
