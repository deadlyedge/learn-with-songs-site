'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { SearchSongDTO } from '@/types'
import { useSearchStore } from '@/stores/searchStore'

export const SearchResults = () => {
	const {
		searchState,
		// lastQuery,
		isPending,
		handleGeniusSearch,
		getReleaseYear,
	} = useSearchStore()

	const {
		error,
		hasSearched,
		results,
		source,
		canSearchGenius,
		autoContinued,
	} = searchState

	return (
		<>
			{error ? (
				<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{error}
				</p>
			) : null}

			{hasSearched && results.length === 0 && !isPending ? (
				<p className="text-sm text-muted-foreground">暂无匹配结果...</p>
			) : null}

			{source || canSearchGenius ? (
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					{source ? (
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							Source:
							{source === 'database'
								? 'Local'
								: source === 'genius'
								? 'Genius API'
								: source === 'cache'
								? 'Cached results'
								: 'Local + Genius'}
						</p>
					) : null}
					{canSearchGenius ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleGeniusSearch}
							disabled={isPending}>
							{isPending ? 'Searching...' : 'Search via Genius'}
						</Button>
					) : null}
				</div>
			) : null}

			{autoContinued ? (
				<p className="text-xs text-muted-foreground">
					本地结果较少，已自动通过 Genius 扩展搜索。
				</p>
			) : null}

			<ul className="grid sm:grid-cols-2 gap-3">
				{results.map((song: SearchSongDTO) => {
					const releaseYear = getReleaseYear(song.releaseDate)
					const songHref = song.path ? `/song${song.path}` : null

					const cardBody = (
						<>
							<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<h3 className="text-lg font-semibold group-hover:text-primary">
										{song.title}
									</h3>
									<p className="text-sm text-muted-foreground">{song.artist}</p>
								</div>
								{releaseYear ? (
									<time
										className="text-xs text-muted-foreground"
										dateTime={song.releaseDate ?? undefined}>
										发行：{releaseYear}
									</time>
								) : null}
							</div>
							{song.album ? (
								<p className="text-xs text-muted-foreground">
									专辑：{song.album}
								</p>
							) : null}
						</>
					)

					return (
						<li
							key={song.id}
							className="group rounded-lg border border-border/70 bg-background/80 p-4 transition hover:border-primary/70 hover:bg-primary/5">
							{songHref ? (
								<Link href={songHref} className="block space-y-2">
									{cardBody}
								</Link>
							) : (
								<div className="block space-y-2">
									{cardBody}
									<p className="text-xs text-muted-foreground/80">
										该歌曲暂无歌词页可跳转
									</p>
								</div>
							)}
						</li>
					)
				})}
			</ul>
		</>
	)
}
