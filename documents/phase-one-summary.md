# 第一阶段总结：歌曲详情采集

## 阶段目标
- 搜索后点击歌曲时，同时补充抓取 Genius 上的歌曲详情数据。
- 通过数据库缓存避免重复请求外部 API，为后续详情展示打基础。

## 已完成事项
- **数据库结构**：在 `Song` 模型上新增 `details`（Json）与 `detailsFetchedAt` 字段，用于存放原始歌曲详情以及记录抓取时间；重新生成 Prisma Client，保证类型对齐。
- **Genius 详情流程**：新增 `src/lib/song-details.ts`，提供 `ensureSongDetails` 及 `ensureSongDetailsByGeniusId` 两个入口，优先命中数据库缓存，未命中时再调用 `fetchGeniusSongDetails`。
- **页面整合**：在歌曲详情页加载流程中接入 `ensureSongDetails`，首次访问时自动抓取并入库，但暂不在界面渲染详情字段。

## 后续建议
1. 挑选并格式化 `details` 中需要展示的字段，规划 UI 呈现。
2. 对 `description.dom` 等富文本字段进行清洗与持久化方案设计（如转 Markdown/纯文本）。
3. 视需求增加失效策略（例如定期刷新或手动触发详情更新）。
