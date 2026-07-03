# Meally Delicious

Shazam for restaurant dishes. Snap a photo of a menu, get a plain-English breakdown of every dish (taste, ingredients, allergens, difficulty), then pick one and get a streamed copycat recipe to make it at home.

## Stack

- Next.js (App Router) + Tailwind
- `@anthropic-ai/sdk` — `claude-opus-4-8` with vision + structured output (`zodOutputFormat`) for menu analysis, streaming for recipe generation
- PWA manifest + icons so it installs to an iPhone home screen like a native app

## Running locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If no camera/upload is available, use the "Preview with a sample menu" link on the upload screen.

## Deploying

```bash
npx vercel deploy --prod
```

Set `ANTHROPIC_API_KEY` as an environment variable on the Vercel project (not committed — see `.gitignore`).
