# Search Optimization Ideas

- Start by instrumenting the search flow: capture query logs, popularity, and whether results came from the DB or Genius. That lets you understand how often users type partial titles vs full matches and whether they leave due to empty results.
- Improve the query layer:
  1. Use trigram/fts indexes on title + artist so shorter fragments still match in Prisma/DB without requiring Genius fallback.
  2. Normalize user input (trim, lowercase, punctuation) and persist a phonetic or fuzzy index to tolerate typos; Postgres pg_trgm or fuzzystrmatch are great for this.
  3. Prioritize exact matches first, then fuzzy results; cache repeated Genius fallback responses and re-use them to avoid waiting on external calls.
- Front-end UX tweaks:
  1. Add an “auto-complete” list driven by the cached search results or a lightweight endpoint that returns top hits for prefixes.
  2. Show immediate feedback (“searching…” and “no results, try shortening”) so the user knows the app is still working.
- Consider proactively syncing a small subset of Genius data (popular tracks) into your DB so the first 2–3 keystrokes can hit the local store. That makes Genius fallback rare and faster.


If you want, I can dig into the existing search action and help refactor indexes, caching, or query strategies next.

## More to explore:

- Query tuning:
  *Add a LOWER()/unaccent() normalized column (or a generated column) and index it so even partially typed strings hit the DB before we reach out to Genius.
  *In Postgres, pg_trgm gives percent similarity; you can query SIMILARITY(title, query) > 0.2 for very short input and sort by similarity.
  *Extend the Prisma query to combine exact matches, prefix matches (startsWith), and fuzzy matches in one go so the action returns richer results with a single DB call.

- Caching + prefetching:
  *Cache the Genius fallback results for a given query (or song id) so future queries hitting the same text don’t wait on the remote call.
  *When users open the search page, prefetch a shortlist of popular songs/genres and keep them in a lightweight in-memory cache for autocomplete.

- UI refinements:
  *Debounce input (200–300ms) and show a “searching…” state; cancel stale requests if newer keystrokes arrive to avoid redundant Genius lookups.
  *Display inline “did you mean…” suggestions derived from the SearchSongDTO results or previous successful queries.

- Metrics:
  *Log source and query length in searchSongs so you can adjust thresholds (e.g., if most Genius hits happen for <3 chars, you can expand local search or cache even more aggressively).

## Search Action Review

- searchSongs currently only looks for query as a substring on title or artist (src/actions/search.ts (lines 48-67)). That means short inputs (“love”) or typo-prone queries rely on Genius fallback, which adds latency and requires extra user typing.
- Fallback kicks in whenever the DB returns fewer than three matches (needsGenius logic at src/actions/search.ts (lines 79-99)), so most “fast” results still wait for Genius if local coverage is thin. The upsertNormalizedSong writes Genius hits back into the DB, but you still need the remote call first and Thrive rely on substring matches.

## Opportunities

1. Better DB matching

   - Add a normalized/searchable column (e.g., LOWER(title) + LOWER(artist) stored as an indexed generated column). Then extend where to include startsWith, endsWith, or pg_trgm similarity for faster fuzzy matches without hitting Genius. You could do this inside Prisma by adding a raw filter using Prisma.sql or a where: { title: { search: ... } } once the DB schema supports it.
   - Prioritize exact/prefix matches first and bump them to the top of the songs list before falling back to Genius.

2. Cache & prefetch Genius responses

   - Instead of always calling searchGeniusSongs when DB hits <3, cache Genius results per query (maybe keep them in Redis or a new “search_cache” table) so frequent queries (e.g., popular song titles) hit the cache immediately.
   - Preload trending/popular songs on the client so the first keystroke can show suggestions without waiting on the action.

3. Improve heuristics

   - Track query length and response source in telemetry (the action already knows responseSource, performedGenius, autoContinued). Use that to adjust the needsGenius threshold or add a small delay (debounce) so super short queries trigger Genius less often.
   - Consider adding a lightweight “suggestions” table that stores normalized titles/aliases for rapid autocomplete; this can be seeded from Genius metadata.

4. UI-side feedback

   - Cancel stale searches (if a new keystroke triggers searchSongs before the prior promise resolves) and show “searching…” states so users know the system is still working.
   - Display metadata (e.g., “From Genius fallback”) using the source field so users know why results popped in.