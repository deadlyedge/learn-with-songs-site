# 从 Server Actions 迁移到 TanStack Query + Hono

## 背景

当前项目使用 Next.js Server Actions 来处理数据获取和操作，但在部署环境中，由于频繁的版本更替和缓存应用，导致 Server Actions 变得不稳定。因此，我们决定迁移到 TanStack Query + Hono 的组合，以提高系统的稳定性和可维护性。

## 当前架构分析

### Server Actions 现状
- **位置**: `src/actions/` 目录下有 8 个文件
- **功能**: 涵盖搜索、收藏、词汇、歌词、推荐等核心业务逻辑
- **调用方式**: 组件直接在服务器端调用 Server Actions 函数
- **示例**:
  ```typescript
  // 在组件中直接调用
  const isCollected = songId ? await isSongCollected(songId) : false
  ```

### 技术栈
- **前端**: Next.js 16, React 19
- **数据库**: Prisma + PostgreSQL
- **认证**: Clerk
- **其他**: Zustand (状态管理)

## 迁移目标

### 目标架构
```
Client (React) ←→ TanStack Query ←→ Hono API Routes ←→ Database
```

### 优势
1. **稳定部署**: API 路由比 Server Actions 更稳定，减少缓存相关问题
2. **类型安全**: Hono 提供强大的 TypeScript 支持
3. **可扩展性**: 更好的错误处理和中间件支持
4. **客户端控制**: TanStack Query 提供强大的客户端缓存和同步机制
5. **开发体验**: 更好的调试和开发工具支持

## 详细迁移计划

### 阶段 1: 依赖安装和配置

#### 1.1 安装依赖
```bash
npm install @tanstack/react-query @hono/zod-validator hono zod
```

#### 1.2 配置 TanStack Query Provider
创建 `src/lib/query-client.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})
```

创建 `src/providers/query-provider.tsx`:
```typescript
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

在 `src/app/layout.tsx` 中添加 Provider。

#### 1.3 配置 Hono
创建 `src/lib/hono.ts`:
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

app.use('*', cors())
app.use('*', logger())

export default app
```

### 阶段 2: 创建 Hono API 路由

#### 2.1 API 路由结构
创建以下 API 路由目录结构:
```
src/app/api/
├── collections/
│   ├── route.ts          # GET, POST, DELETE /api/collections
│   └── [songId]/
│       └── route.ts      # GET, POST, DELETE /api/collections/[songId]
├── search/
│   └── route.ts          # GET /api/search
├── songs/
│   ├── route.ts          # GET /api/songs
│   └── [path]/
│       ├── route.ts      # GET /api/songs/[path]
│       ├── lyrics/
│       │   └── route.ts  # GET /api/songs/[path]/lyrics
│       ├── referents/
│       │   └── route.ts  # GET /api/songs/[path]/referents
│       └── details/
│           └── route.ts  # GET /api/songs/[path]/details
├── vocabulary/
│   └── route.ts          # POST /api/vocabulary
├── suggestions/
│   └── route.ts          # GET /api/suggestions
└── featured-songs/
    └── route.ts          # GET /api/featured-songs
```

#### 2.2 迁移 Server Actions 到 Hono Routes

以 `collections.ts` 为例:

**原 Server Actions** (`src/actions/collections.ts`):
```typescript
export async function getUserCollections(): Promise<CollectionSong[] | null>
export async function addSongToUserCollections(songId: string)
export async function removeSongFromUserCollections(songId: string)
export async function isSongCollected(songId: string): Promise<boolean>
```

**迁移到 Hono** (`src/app/api/collections/route.ts`):
```typescript
import { Hono } from 'hono'
import { initialUser } from '@/lib/clerk-auth'
import { prisma } from '@/lib/prisma'
import type { CollectionSong } from '@/types'

const app = new Hono()

// GET /api/collections - 获取用户收藏
app.get('/', async (c) => {
  const user = await initialUser()
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const collections = await prisma.user.findUnique({
    where: { id: user.id },
    include: { collections: { select: { /* fields */ } } }
  })

  return c.json({ collections: collections?.collections || [] })
})

// POST /api/collections - 添加收藏
app.post('/', async (c) => {
  const user = await initialUser()
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { songId } = await c.req.json()
  // validation and logic...

  return c.json({ success: true })
})

export default app
```

#### 2.3 错误处理和验证
使用 Zod 进行请求验证:
```typescript
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const songIdSchema = z.object({
  songId: z.string().min(1, 'Song ID is required')
})

app.post('/', zValidator('json', songIdSchema), async (c) => {
  // validated data is available in c.req.valid('json')
})
```

### 阶段 3: 创建 TanStack Query Hooks

#### 3.1 为每个 API 创建 Query/Mutation Hooks

创建 `src/hooks/` 目录，包含:
- `use-collections.ts`
- `use-search.ts`
- `use-songs.ts`
- `use-vocabulary.ts`
- 等

**示例** (`src/hooks/use-collections.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CollectionSong } from '@/types'

export function useUserCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async (): Promise<CollectionSong[]> => {
      const res = await fetch('/api/collections')
      if (!res.ok) throw new Error('Failed to fetch collections')
      const data = await res.json()
      return data.collections
    },
  })
}

export function useAddToCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (songId: string) => {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      })
      if (!res.ok) throw new Error('Failed to add to collection')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

export function useRemoveFromCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (songId: string) => {
      const res = await fetch(`/api/collections/${songId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove from collection')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

export function useIsSongCollected(songId: string) {
  return useQuery({
    queryKey: ['collections', 'is-collected', songId],
    queryFn: async (): Promise<boolean> => {
      const res = await fetch(`/api/collections/${songId}`)
      if (!res.ok) throw new Error('Failed to check collection status')
      const data = await res.json()
      return data.isCollected
    },
    enabled: !!songId,
  })
}
```

#### 3.2 处理认证和错误
在 hooks 中统一处理认证错误:
```typescript
mutationFn: async (data) => {
  const res = await fetch('/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (res.status === 401) {
    // Redirect to login or handle auth error
    throw new Error('Authentication required')
  }

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Request failed')
  }

  return res.json()
}
```

### 阶段 4: 更新组件使用 TanStack Query

#### 4.1 将 Server Components 转换为 Client Components

**原代码** (`src/components/song-page/header.tsx`):
```typescript
export const Header = async ({ headerContents, songId }: HeaderProps) => {
  const isCollected = songId ? await isSongCollected(songId) : false
  // ...
}
```

**迁移后**:
```typescript
'use client'

import { useIsSongCollected } from '@/hooks/use-collections'

export function Header({ headerContents, songId }: HeaderProps) {
  const { data: isCollected, isLoading } = useIsSongCollected(songId)
  // ...
}
```

#### 4.2 处理加载状态
```typescript
export function CollectButton({ songId }: { songId: string }) {
  const { data: isCollected, isLoading } = useIsSongCollected(songId)
  const addMutation = useAddToCollection()
  const removeMutation = useRemoveFromCollection()

  if (isLoading) {
    return <Spinner />
  }

  const handleToggle = () => {
    if (isCollected) {
      removeMutation.mutate(songId)
    } else {
      addMutation.mutate(songId)
    }
  }

  return (
    <Button onClick={handleToggle} disabled={addMutation.isPending || removeMutation.isPending}>
      {isCollected ? 'Remove' : 'Add'} to Collection
    </Button>
  )
}
```

### 阶段 5: 迁移顺序和优先级

#### 5.1 按复杂度排序的迁移顺序
1. **collections.ts** - 简单的 CRUD 操作，适合作为起点
2. **vocabulary.ts** - 词汇相关功能
3. **featured-songs.ts** - 推荐歌曲
4. **suggestions.ts** - 搜索建议
5. **lyrics.ts** - 歌词获取
6. **referents.ts** - 推荐引用
7. **details.ts** - 歌曲详情
8. **search.ts** - 最复杂的搜索功能，最后处理

#### 5.2 逐步迁移策略
- 每个文件独立迁移
- 先创建 API 路由和 hooks
- 然后更新对应的组件
- 保持向后兼容，直到完全迁移完成

### 阶段 6: 测试和部署

#### 6.1 测试策略
- **单元测试**: 为 hooks 和 API routes 编写测试
- **集成测试**: 测试完整的用户流程
- **E2E 测试**: 使用 Playwright 验证功能

#### 6.2 部署注意事项
- **环境变量**: 确保 API routes 在所有环境中正常工作
- **缓存配置**: 配置适当的缓存头
- **错误监控**: 添加错误追踪和监控

### 阶段 7: 清理和优化

#### 7.1 删除旧代码
迁移完成后:
- 删除 `src/actions/` 目录
- 移除未使用的依赖
- 更新文档

#### 7.2 性能优化
- 配置适当的缓存策略
- 实现请求去重
- 优化查询键设计

## 风险评估和缓解措施

### 风险
1. **向后兼容性**: Server Actions 和 API routes 的行为差异
2. **性能影响**: 客户端请求可能增加延迟
3. **认证处理**: 需要确保 API routes 正确处理认证

### 缓解措施
1. **渐进式迁移**: 逐步替换，避免大爆炸式变更
2. **缓存策略**: 使用 TanStack Query 的缓存优化性能
3. **错误处理**: 统一的错误处理机制
4. **测试覆盖**: 全面的测试确保功能正确性

## 时间估计

- **阶段 1**: 2-3 天 (依赖安装和基础配置)
- **阶段 2**: 5-7 天 (创建所有 API routes)
- **阶段 3**: 3-4 天 (创建 hooks)
- **阶段 4**: 7-10 天 (更新所有组件)
- **阶段 5-7**: 3-5 天 (测试、部署、清理)

**总计**: 20-29 天，取决于复杂度和测试需求。

## 验收标准

1. ✅ 所有 Server Actions 功能正常工作
2. ✅ API routes 响应正确
3. ✅ 客户端缓存工作正常
4. ✅ 错误处理完善
5. ✅ 性能不劣于原有实现
6. ✅ 部署稳定，无缓存相关问题
7. ✅ 代码通过所有测试

## 后续优化

迁移完成后，可以考虑:
- 实现 GraphQL API 替代 REST
- 添加请求压缩和优化
- 实现更好的离线支持
- 添加实时更新功能
