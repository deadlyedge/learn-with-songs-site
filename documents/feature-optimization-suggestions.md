# 当前功能概览

1. **搜索 & 特色歌曲**：`src/app/page.tsx` 将 `SongSearch` 和 `FeaturedSongs` 组合在主页，`SongSearch` 先查本地 `prisma.song`，结果不足再自动回退到 Genius（`src/app/api/songs/route.ts`），并把返回的 `artworkUrl`/`geniusPath` 写入本地缓存。
2. **单首歌曲详情**：`src/app/songs/[path]/page.tsx` 为每个 Genius 路径提供歌词、元数据、Genius referents/annotations、以及通过 `SelectText`/`SelectText` 组件生成的歌词高亮 + AI 解释。
3. **生词卡片**：点击歌词后触发的 `SelectText` 会调用 `learnWordInLine`（`src/lib/openrouter.ts`）、检查是否存在重复（`src/app/actions/vocabulary.ts`），再通过 `addVocabularyEntryAction` 保存于 `prisma.vocabularyEntry`，最终在 `/vocabulary` 页面中由 `VocabularyCard` 展示。

# 优化建议

1. **避免 `song.path` 为 `null` 时产生错误链接**：主页的搜索结果直接将 `song.path` 拼在 `/songs` 后面（`src/components/song-search.tsx:176-205`）。从 Genius 自动写入的记录并不总有 `geniusPath`，因此 `song.path` 可能是 `null`/`undefined`，最终产生 `/songsnull` 这样的链接并导致 404。建议在渲染 `<Link>` 时 fallback 到空字符串或直接跳过没有路径的条目。
2. **为 `learnWordInLine` 增加错误隔离**：`SelectText` 在 `useEffect` 内的 `fetchResult`（`src/components/select-text.tsx:220-274`）直接 `await learnWordInLine`，一旦 OpenRouter API 又出错或超时，这里会抛出未捕获的 promise 拒绝，Dialog 会卡在 loading 状态且控制台会出现错误。需要在调用前后包裹 try/catch，记录错误并给用户提示，例如将 `setDuplicateError` 复用或展示 toast。
3. **Referents 只需要单次保存**：作为英语学习应用，referents 的即时刷新并不是关键功能——只要第一次访问时把解析结果保存下来，后续访问直接读取本地数据库即可。`cacheReferentsForSong` 现在会先 `deleteMany` 再对每条 referent 串行 `upsert`（`src/lib/referents.ts:147-204`），但这仅解决了一次性写入，反而带来额外的数据库操作和复杂度。建议改为“写时判断、读时直接使用”：只在缓存为空或缺失该 song 的 referents 时写入（可以用单个 `createMany` 批量插入），之后就不再触发删除/更新逻辑。后期如果需要刷新，可另外提供显式 refresh endpoint。

# NEXT

1. 优化ai提示词，以期标准化markdown输出格式
2. 优化dialog中的用户体验
