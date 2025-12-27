# Learn English with Songs

Learn English with Songs is a learning hub built on Next.js App Router. It surfaces lyrics from Genius, surfaces Genius annotations, and lets learners gather vocabulary notes while they explore songs. Every search hyphenates a local cache with Genius as a fallback, and authenticated learners can collect AI explanations for any highlighted line.

## Features

- **Song search + fallback:** searches the PostgreSQL-backed catalog first and only hits Genius when local rows are sparse. The same API powers the featured song widgets.
- **Song detail page:** lyrics, metadata, artwork, annotated referents, and a lyric selection tool that passes the context to OpenRouter to return a markdown tip before saving a vocabulary card.
- **Vocabulary tracker:** every saved word is tied to a song and line, and the list is scoped to the signed-in Clerk user.
- **Clerk + Prisma:** Clerk handles authentication, Prisma persists users, songs, lyrics, and vocabulary, and the webhook keeps Clerk users in sync with the local user table.

## Technology

- Next.js **App Router** (v16.x) with React 19 server and client components.
- Clerk for authentication, Prisma for PostgreSQL access.
- Genius API and a lyrics proxy (`lyrics.zick.me`) for metadata and content, OpenRouter for LLML explanations, and the Sonner toaster for notifications.
- Tailwind CSS (v4) plus Lucide UI primitives and shadcn/ui components for layout.
- zustand for state management.

## Getting started

1. Install dependencies:
   ```bash
   bun install   # or npm install / pnpm install if you prefer
   ```
2. Copy `.env.production.example` to `.env` and provide real values for:
   - `DATABASE_URL` (PostgreSQL)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`
   - `GENIUS_API_TOKEN`
   - `OPENROUTER_API_KEY`
   - `LYRICS_ENDPOINT` + `LYRICS_API_TOKEN` (the lyrics proxy used by `fetchLyricsFromPath`)
3. Generate the Prisma client if needed:
   ```bash
   bun run db:generate
   ```
4. Apply schema changes to the database:
   ```bash
   bun run db:push
   ```
5. Run the dev server:
   ```bash
   bun run dev
   ```

> You can also run the equivalent `npm run …` scripts when not using Bun.

## Tests & linting

- `npm run lint` runs ESLint over the app.

## Deployment

Use `npm run build` / `bun run build` followed by `next start` (or let Vercel handle it). Ensure the same environment variables listed above are set in production.

## License

This project is covered by the [MIT License](LICENSE).

## Todo
- Improve error handling and loading states.
- __内容为空或空白__ ← __新增修复__ 修复了lyric为空的重新获取，基于相对稳定的genius api，暂不添加genius api refetch
