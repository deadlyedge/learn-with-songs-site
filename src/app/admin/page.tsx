import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

export default async function AdminPage() {
	const user = await currentUser()

	if (!user) {
		redirect('/sign-in')
	}

	const primaryEmail = user.emailAddresses.find(
		(email) => email.id === user.primaryEmailAddressId,
	)
	const fallbackEmail = user.emailAddresses.at(0)
	const resolvedEmail =
		(primaryEmail ?? fallbackEmail)?.emailAddress ??
		`${user.id}@users.clerk.local`

	if (resolvedEmail !== process.env.ADMIN_EMAIL) {
		redirect('/')
	}

	// 获取统计数据
	const songCount = await prisma.song.count()
	const cachedSongCount = await prisma.song.count({
		where: { detailsFetchedAt: { not: null } },
	})
	const userCount = await prisma.user.count()

	// 前5名活跃用户 (按生词条目数排序)
	const topActiveUsers = await prisma.user.findMany({
		select: {
			name: true,
			email: true,
			_count: { select: { vocabularyEntries: true } },
		},
		orderBy: { vocabularyEntries: { _count: 'desc' } },
		take: 5,
	})

	// 前5名收藏最多的歌曲
	const topCollectedSongs = await prisma.song.findMany({
		select: {
			title: true,
			artist: true,
			_count: { select: { collectedBy: true } },
		},
		orderBy: { collectedBy: { _count: 'desc' } },
		take: 5,
	})

	// 前5名生词最多的歌曲
	const topVocabularySongs = await prisma.song.findMany({
		select: {
			title: true,
			artist: true,
			_count: { select: { vocabularyEntries: true } },
		},
		orderBy: { vocabularyEntries: { _count: 'desc' } },
		take: 5,
	})

	// 数据库空间占用
	const dbSizeResult = await prisma.$queryRaw<{ pg_size_pretty: string }[]>`
		SELECT pg_size_pretty(pg_database_size(current_database()))
	`
	const dbSize = dbSizeResult[0]?.pg_size_pretty || 'Unknown'

	return (
		<div className="space-y-6 p-6">
			<h1 className="text-2xl font-bold">管理员面板</h1>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">缓存歌曲量</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{cachedSongCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">用户总数</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{userCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">所有歌曲量</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{songCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">数据库占用</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{dbSize}</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>前5名活跃用户</CardTitle>
				</CardHeader>
				<CardContent>
					{topActiveUsers.length > 0 ? (
						<div className="space-y-2">
							{topActiveUsers.map((user, index) => (
								<div
									key={user.email}
									className="flex justify-between items-center"
								>
									<div>
										<span className="font-medium">
											{index + 1}. {user.name || user.email}
										</span>
										<span className="text-sm text-muted-foreground ml-2">
											({user.email})
										</span>
									</div>
									<span className="text-sm text-muted-foreground">
										{user._count.vocabularyEntries} 个生词
									</span>
								</div>
							))}
						</div>
					) : (
						<p>暂无数据</p>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>收藏最多的歌曲</CardTitle>
					</CardHeader>
					<CardContent>
						{topCollectedSongs.length > 0 ? (
							<div className="space-y-3">
								{topCollectedSongs.map((song, index) => (
									<div key={`${song.title}-${song.artist}`}>
										<p className="font-medium">
											{index + 1}. {song.title}
										</p>
										<p className="text-sm text-muted-foreground">
											艺术家: {song.artist}
										</p>
										<p className="text-sm text-muted-foreground">
											收藏次数: {song._count.collectedBy}
										</p>
									</div>
								))}
							</div>
						) : (
							<p>暂无数据</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>生词最多的歌曲</CardTitle>
					</CardHeader>
					<CardContent>
						{topVocabularySongs.length > 0 ? (
							<div className="space-y-3">
								{topVocabularySongs.map((song, index) => (
									<div key={`${song.title}-${song.artist}`}>
										<p className="font-medium">
											{index + 1}. {song.title}
										</p>
										<p className="text-sm text-muted-foreground">
											艺术家: {song.artist}
										</p>
										<p className="text-sm text-muted-foreground">
											生词数量: {song._count.vocabularyEntries}
										</p>
									</div>
								))}
							</div>
						) : (
							<p>暂无数据</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
