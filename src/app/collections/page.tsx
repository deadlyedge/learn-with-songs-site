import Image from 'next/image'
import Link from 'next/link'

import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { normalizeSongPath } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default async function CollectionsPage() {
	const user = await currentUser()
	if (!user) {
		return <div className="p-4 text-sm text-muted-foreground">请先登录</div>
	}

	const dbUser = await prisma.user.findUnique({
		where: { clerkId: user.id },
		include: {
			collections: {
				orderBy: { title: 'asc' },
			},
		},
	})

	if (!dbUser) {
		return (
			<div className="p-4 text-sm text-muted-foreground">
				用户信息尚未同步，请刷新页面
			</div>
		)
	}

	const collections = dbUser.collections ?? []

	if (collections.length === 0) {
		return (
			<section className="space-y-4 p-4">
				<header className="space-y-1">
					<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
						我的收藏
					</p>
					<h1 className="text-2xl font-semibold">还没有收藏的歌曲</h1>
					<p className="text-sm text-muted-foreground">
						在歌词页点击“收藏”即可将歌曲加入这里，记录你值得反复听的作品。
					</p>
				</header>
				<Button variant="outline" size="sm" asChild>
					<Link href="/">去搜索歌曲</Link>
				</Button>
			</section>
		)
	}

	return (
		<section className="space-y-6 p-4">
			<header className="space-y-2">
				<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
					我的收藏
				</p>
				<h1 className="text-3xl font-semibold">收藏的歌曲</h1>
				<p className="text-sm text-muted-foreground">
					展示你特别想回味的歌词，有歌词页的歌曲可以直接打开复习。
				</p>
			</header>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{collections.map((song) => {
					const releaseYear = song.releaseDate
						? new Date(song.releaseDate).getFullYear()
						: null
					const normalizedPath = normalizeSongPath(song.geniusPath ?? undefined)
					const hasSongPage = Boolean(normalizedPath)

					return (
						<article
							key={song.id}
							className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm transition hover:border-primary/60 hover:bg-primary/5">
							<div className="flex items-center gap-4">
								{song.artworkUrl ? (
									<Image
										src={song.artworkUrl}
										alt={`${song.title} 封面`}
										width={96}
										height={96}
										className="h-24 w-24 object-cover"
									/>
								) : (
									<div className="flex h-24 w-24 items-center justify-center rounded-xl border border-border/60 bg-muted text-[11px] text-muted-foreground">
										暂无封面
									</div>
								)}
								<div className="flex-1 space-y-1">
									<div>
										<h2 className="text-lg font-semibold">{song.title}</h2>
										<p className="text-xs text-muted-foreground">
											{song.artist}
										</p>
										{song.album ? (
											<p className="text-xs text-muted-foreground/80">
												专辑：{song.album}
											</p>
										) : null}
									</div>
									{releaseYear ? (
										<time
											className="text-muted-foreground/80 text-xs"
											dateTime={song.releaseDate?.toISOString()}>
											发行：{releaseYear}
										</time>
									) : null}
								</div>
							</div>

							<div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-xs text-muted-foreground">
								{hasSongPage ? (
									<Link
										href={`/song${normalizedPath}`}
										className="text-primary hover:underline">
										打开歌词页
									</Link>
								) : null}

								{song.url ? (
									<a
										href={song.url}
										target="_blank"
										rel="noreferrer"
										className="text-primary/80 hover:underline">
										在 Genius 查看
									</a>
								) : null}

								{!hasSongPage && !song.url ? (
									<span className="text-muted-foreground/70">
										暂无可跳转的页面
									</span>
								) : null}
							</div>
						</article>
					)
				})}
			</div>
		</section>
	)
}
