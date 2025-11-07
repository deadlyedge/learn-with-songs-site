import Image from 'next/image'
import Link from 'next/link'
// import dynamic from 'next/dynamic'

import { prisma } from '@/lib/prisma'
import type { GeniusSongInfo } from '@/types'
import { SongSearch } from '@/components/song-search'
import { cacheLife } from 'next/cache'

// const SongSearch = dynamic(
// 	() => import('@/components/song-search').then((mod) => mod.SongSearch),
// 	{ suspense: true }
// )

type FeaturedSong = {
	id: string
	title: string
	artist: string
	album?: string
	artworkUrl?: string
	pageviews: number
	geniusPath: string
}

const getFeaturedSongs = async (): Promise<FeaturedSong[]> => {
	'use cache'
	cacheLife('hours')

	const songs = await prisma.song.findMany({
		where: {
			lyrics: {
				isNot: null,
			},
		},
		select: {
			id: true,
			title: true,
			artist: true,
			album: true,
			artworkUrl: true,
			geniusPath: true,
			details: true,
		},
	})

	return songs
		.map((song) => {
			const details = (song.details ?? null) as GeniusSongInfo | null
			const pageviews = details?.stats?.pageviews

			if (!details || !song.geniusPath || !pageviews) {
				return null
			}

			return {
				id: song.id,
				title: song.title,
				artist: song.artist,
				album: song.album ?? undefined,
				artworkUrl: song.artworkUrl ?? undefined,
				pageviews,
				geniusPath: song.geniusPath,
			}
		})
		.filter((value): value is FeaturedSong => value !== null)
		.sort((a, b) => b.pageviews - a.pageviews)
		.slice(0, 6)
}

// const SongSearchFallback = () => {
// 	return (
// 		<section className="space-y-6 animate-pulse">
// 			<div className="flex flex-col gap-3 sm:flex-row">
// 				<div className="h-11 rounded-md bg-muted" />
// 				<div className="h-11 w-28 rounded-md bg-muted" />
// 			</div>
// 			<div className="space-y-3">
// 				<div className="h-4 w-40 rounded bg-muted" />
// 				<div className="grid gap-2">
// 					<div className="h-20 rounded-lg border border-dashed border-muted-foreground/40" />
// 					<div className="h-20 rounded-lg border border-dashed border-muted-foreground/40" />
// 				</div>
// 			</div>
// 		</section>
// 	)
// }

export default async function HomePage() {
	const featuredSongs = await getFeaturedSongs()
	const numberFormatter = new Intl.NumberFormat('zh-CN')

	return (
		<div className="space-y-12 pb-10 pt-6">
			<section className="rounded-2xl bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-8 shadow-sm">
				<h1 className="text-3xl font-semibold sm:text-4xl">
					看歌词，学英语 —— Learning English with Songs
				</h1>
				<p className="mt-3 max-w-2xl text-base text-muted-foreground">
					输入歌曲或歌手名称，快速找到歌词，配合注释与学习记录开启你的音乐英语之旅。
				</p>
			</section>

			{featuredSongs.length > 0 ? (
				<section className="space-y-4">
					<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<h2 className="text-xl font-semibold">热门收录歌曲</h2>
							<p className="text-sm text-muted-foreground">
								根据 Genius 浏览量挑选的精选列表。
							</p>
						</div>
						<p className="text-xs text-muted-foreground">
							统计基于 Genius stats.pageviews
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{featuredSongs.map((song) => (
							<Link
								key={song.id}
								href={`/songs${song.geniusPath}`}
								className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background/80 p-3 transition hover:border-primary/60 hover:bg-primary/5">
								{song.artworkUrl ? (
									<Image
										src={song.artworkUrl}
										alt={`${song.title} 封面`}
										width={64}
										height={64}
										className="h-16 w-16 rounded-md object-cover"
									/>
								) : (
									<div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-[11px] text-muted-foreground">
										无封面
									</div>
								)}
								<div className="flex-1 space-y-1">
									<p className="text-sm font-semibold group-hover:text-primary">
										{song.title}
									</p>
									<p className="text-xs text-muted-foreground">{song.artist}</p>
									{song.album ? (
										<p className="text-[11px] text-muted-foreground/80">
											专辑：{song.album}
										</p>
									) : null}
								</div>
								<div className="text-right text-xs text-muted-foreground">
									<span className="block text-sm font-semibold text-foreground">
										{numberFormatter.format(song.pageviews)}
									</span>
									<span className="uppercase tracking-wide text-[10px]">
										浏览
									</span>
								</div>
							</Link>
						))}
					</div>
				</section>
			) : null}

			<SongSearch />
		</div>
	)
}
