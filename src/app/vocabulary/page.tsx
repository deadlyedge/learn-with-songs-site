import Link from 'next/link'

import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { VocabularyCard } from '@/components/vocabulary-card'

export default async function VocabularyPage() {
	const user = await currentUser()

	if (!user) {
		return <div className="p-4 text-sm text-muted-foreground">请先登录</div>
	}

	const dbUser = await prisma.user.findUnique({
		where: { clerkId: user.id },
	})

	if (!dbUser) {
		return (
			<div className="p-4 text-sm text-muted-foreground">
				用户信息尚未同步，请刷新页面
			</div>
		)
	}

	const vocabulary = await prisma.vocabularyEntry.findMany({
		where: { userId: dbUser.id },
		include: { song: true },
		orderBy: { createdAt: 'desc' },
	})

	if (vocabulary.length === 0) {
		return (
			<section className="p-4">
				<h1 className="text-2xl font-semibold">我的生词本</h1>
				<p className="text-sm text-muted-foreground">
					目前还没有加入，去听一首歌，选中感兴趣的片段吧。
				</p>
			</section>
		)
	}

	return (
		<section className="space-y-6 p-4">
			<header className="space-y-2">
				<h1 className="text-2xl font-semibold">我的生词本</h1>
				<p className="text-sm text-muted-foreground">
					这里展示你收藏的单词/短语，点击复习即可重新打开选中位置
				</p>
			</header>
			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
				{vocabulary.map((entry) => (
					<VocabularyCard
						key={entry.id}
						entry={{
							id: entry.id,
							word: entry.word,
							line: entry.line,
							lineNumber: entry.lineNumber,
							result: entry.result,
							songPath: entry.songPath,
							songTitle: entry.song?.title ?? '歌曲',
							songArtworkUrl: entry.song?.artworkUrl ?? null,
						}}
					/>
				))}
			</div>
			<footer className="text-xs text-muted-foreground">
				<Link href="/songs" className="text-primary hover:underline">
					探索更多歌曲
				</Link>
			</footer>
		</section>
	)
}
