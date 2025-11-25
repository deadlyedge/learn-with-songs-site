import Link from 'next/link'
import Image from 'next/image'

import type { FeaturedSong } from '@/types'
import { getFeaturedSongs } from '@/actions/featured-songs'
import { Suspense } from 'react'

function SongListItem({
	song,
	numberFormatter,
}: {
	song: FeaturedSong
	numberFormatter: Intl.NumberFormat
}) {
	return (
		<Link
			href={`/song${song.geniusPath}`}
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
				<span className="uppercase tracking-wide text-[10px]">浏览</span>
			</div>
		</Link>
	)
}

export async function FeaturedSongs() {
	const featuredSongs = await getFeaturedSongs()
	const numberFormatter = new Intl.NumberFormat('zh-CN')

	if (featuredSongs.length === 0) {
		return null
	}

	return (
		<section className="space-y-4 px-2 xl:px-0">
			<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold">其他收录歌曲</h2>
					<p className="text-sm text-muted-foreground">
						可以快速打开的本地歌曲列表。
					</p>
				</div>
				<p className="text-xs text-muted-foreground">根据 Genius 浏览量排列</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{featuredSongs.map((song) => (
					<Suspense key={song.id} fallback={<SongListItemSkeleton />}>
						<SongListItem
							key={song.id}
							song={song}
							numberFormatter={numberFormatter}
						/>
					</Suspense>
				))}
			</div>
		</section>
	)
}

export function SongListItemSkeleton() {
	return (
		<div className="animate-pulse group flex items-center gap-3 rounded-lg border border-border/70 bg-background/80 p-3">
			<div className="h-16 w-16 rounded-md bg-muted" />
			<div className="flex-1 space-y-2">
				<div className="h-4 w-3/4 rounded bg-muted" />
				<div className="h-3 w-1/2 rounded bg-muted" />
				<div className="h-3 w-1/3 rounded bg-muted" />
			</div>
			<div className="space-y-2 text-right">
				<div className="h-4 w-12 rounded bg-muted" />
				<div className="h-3 w-8 rounded bg-muted" />
			</div>
		</div>
	)
}
