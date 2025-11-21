import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { VocabularyList } from '@/components/vocabulary-list'

export default async function VocabularyPage() {
	const user = await currentUser()

	if (!user) {
		return <div className="p-4 text-sm text-muted-foreground">请先登录</div>
	}

	const dbUser = await prisma.user.findUnique({
		where: { email: user.emailAddresses.at(0)?.emailAddress },
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

	const transformedNewWords = vocabulary
		.filter((entry) => entry.mastered === false)
		.map((entry) => ({
			id: entry.id,
			word: entry.word,
			line: entry.line,
			lineNumber: entry.lineNumber,
			result: entry.result,
			songPath: entry.songPath,
			songTitle: entry.song?.title ?? '歌曲',
			songArtworkUrl: entry.song?.artworkUrl ?? null,
			mastered: entry.mastered,
			songId: entry.song?.id ?? '',
		}))

	const transformedHistoryWords = vocabulary
		.filter((entry) => entry.mastered === true)
		.map((entry) => ({
			id: entry.id,
			word: entry.word,
			line: entry.line,
			lineNumber: entry.lineNumber,
			result: entry.result,
			songPath: entry.songPath,
			songTitle: entry.song?.title ?? '歌曲',
			songArtworkUrl: entry.song?.artworkUrl ?? null,
			mastered: entry.mastered,
			songId: entry.song?.id ?? '',
		}))

	return (
		<main className="container mx-auto">
			<header className="space-y-2 p-4">
				<h1 className="text-2xl font-semibold">我的生词本</h1>
				<p className="text-sm text-muted-foreground">
					这里展示你收藏的单词/短语，点击复习即可重新打开选中位置
				</p>
			</header>
			<VocabularyList
				initialNewWords={transformedNewWords}
				initialHistoryWords={transformedHistoryWords}
			/>
		</main>
	)
}
