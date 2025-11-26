import Image from 'next/image'
import Link from 'next/link'

import { normalizeSongPath } from '@/lib/utils'
import { CollectionSong } from '@/types'

interface CollectionItemProps {
	song: CollectionSong
}

export function CollectionItem({ song }: CollectionItemProps) {
	const releaseYear = song.releaseDate
		? new Date(song.releaseDate).getFullYear()
		: null
	const normalizedPath = normalizeSongPath(song.geniusPath ?? undefined)
	const hasSongPage = Boolean(normalizedPath)
	const releaseDateIso = song.releaseDate ?? undefined

	return (
		<article className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm transition hover:border-primary/60 hover:bg-primary/5">
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
						<p className="text-xs text-muted-foreground">{song.artist}</p>
						{song.album ? (
							<p className="text-xs text-muted-foreground/80">
								专辑：{song.album}
							</p>
						) : null}
					</div>
					{releaseYear ? (
						<time
							className="text-muted-foreground/80 text-xs"
							dateTime={releaseDateIso}>
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
					<span className="text-muted-foreground/70">暂无可跳转的页面</span>
				) : null}
			</div>
		</article>
	)
}

interface CollectionsListProps {
	collections: CollectionSong[]
}

export function CollectionsList({ collections }: CollectionsListProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
			{collections.map((song) => (
				<CollectionItem key={song.id} song={song} />
			))}
		</div>
	)
}
