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

## bugs

- 未利用pg相似度
- 未实时反馈

基于您的搜索代码和优化文档分析，我发现了几个关键问题：

## 🎯 **主要性能瓶颈**

### 1. **数据库索引缺失**
```sql
-- 当前只有基础索引
@@index([title, artist])
@@index([artist])

-- 缺少：
-- 1. pg_trgm扩展启用 (代码中使用了similarity但没有对应索引)
-- 2. FULLTEXT SEARCH (GIN/GIST索引)
-- 3. 归一化字段索引 (适用于不敏感搜索)
```

### 2. **查询分层执行效率低下**
- 当前：3个单独的数据库查询（相似度/精确匹配/分词）
- 问题：不能利用数据库的一次查询返回策略，也没有智能排序

### 3. **缓存策略不完整**
- ✅ 缓存本地DB结果
- ❌ 没有缓存Genius API结果
- 当前依赖于`upsertNormalizedSong`写入数据库，但`searchGeniusSongs`的结果没有直接缓存

### 4. **重复API调用风险**
没有防卫机制防止并发相同查询重复触发Genius API调用

## 🚀 **具体优化建议**

### **立即可行的改进 (代码层面)**

1. **调整相似度阈值**
```typescript
// 当前设置可能过于保守
export const SIMILARITY_LOW_THRESHOLD = 0.35  // 建议: 0.2-0.3
export const MIN_CACHE_RESULTS = 3            // 建议: 1或2
```

2. **改进查询合并策略**
- 在同一个查询中结合多个匹配类型
- 使用数据库的智能排序而非应用层排序

### **需要数据库schema更新的改进**

1. **添加pg_trgm索引**
```sql
-- 在Prisma schema中添加
model Song {
  // ... 现有字段
  @@index([title(ops: raw("gin_trgm_ops"))])
  @@index([artist(ops: raw("gin_trgm_ops"))])
}
```

2. **创建FULLTEXT SEARCH索引**
3. **添加归一化生成字段用于不敏感匹配**

### **架构层面优化**

1. **引入Redis/external cache**
   - 缓存Genius API响应
   - 实现分布式锁防止重复请求

2. **添加搜索日志/指标**
   - 查询长度分布
   - 缓存命中率
   - Genius调用频率

3. **客户端优化**
   - 输入防抖 (debounce)
   - 搜索建议/自动完成

您希望我优先解决哪个方面？我可以帮您实现具体的优化方案。.toggle to Act mode.