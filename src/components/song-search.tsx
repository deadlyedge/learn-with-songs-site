'use client'

import { FormEvent, useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from './ui/spinner'
import { searchSongs } from '@/actions/search'
import { SearchSongDTO, SongSearchResponse } from '@/types'

type SearchState = {
	results: SearchSongDTO[]
	source: SongSearchResponse['source'] | null
	hasSearched: boolean
	error: string | null
	canSearchGenius: boolean
	autoContinued: boolean
}

const initialSearchState: SearchState = {
	results: [],
	source: null,
	hasSearched: false,
	error: null,
	canSearchGenius: false,
	autoContinued: false,
}

export const SongSearch = () => {
	const [query, setQuery] = useState('')
	const [searchState, setSearchState] =
		useState<SearchState>(initialSearchState)
	const [lastQuery, setLastQuery] = useState('')
	const [isPending, startTransition] = useTransition()

	const getReleaseYear = (value?: string | null) => {
		if (!value) {
			return null
		}

		const parsed = new Date(value)
		return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear()
	}

	const resetSearchState = () => ({
		...initialSearchState,
		hasSearched: true,
	})

	const updateSearchState = (updates: Partial<SearchState>) => {
		setSearchState((prevState) => ({ ...prevState, ...updates }))
	}

	const requestSearch = async (query: string, source?: string | null) => {
		setLastQuery(query)
		setSearchState(resetSearchState())

		try {
			const payload = await searchSongs({ query, source })

			updateSearchState({
				results: payload.songs,
				source: payload.source,
				canSearchGenius: payload.canSearchGenius,
				autoContinued: payload.autoContinued,
			})
		} catch (fetchError) {
			console.error(fetchError)
			setSearchState({
				...resetSearchState(),
				error: (fetchError as Error).message,
			})
		}
	}

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const trimmed = query.trim()

		if (!trimmed) {
			updateSearchState({
				error: '请输入歌曲名或艺人名后再搜索。',
				hasSearched: false,
			})
			return
		}

		startTransition(() => {
			void requestSearch(trimmed)
		})
	}

	const handleGeniusSearch = () => {
		if (!lastQuery) {
			return
		}

		startTransition(() => {
			void requestSearch(lastQuery, 'genius')
		})
	}

	return (
		<section className="space-y-6 px-1.5">
			<form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
				<label className="sr-only" htmlFor="search">
					歌曲或艺人
				</label>
				<Input
					id="search"
					placeholder="输入歌曲或艺人名称..."
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					className="h-11"
				/>
				<Button type="submit" className="h-11 px-6" disabled={isPending}>
					{isPending ? (
						<span className="flex items-center">
							搜索中 <Spinner />
						</span>
					) : (
						'搜索'
					)}
				</Button>
			</form>

			{searchState.error ? (
				<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{searchState.error}
				</p>
			) : null}

			{searchState.hasSearched &&
			searchState.results.length === 0 &&
			!isPending ? (
				<p className="text-sm text-muted-foreground">
					暂无匹配结果...
					{/* <Spinner /> */}
				</p>
			) : null}

			{searchState.source || searchState.canSearchGenius ? (
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					{searchState.source ? (
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							Source:
							{searchState.source === 'database'
								? 'Local'
								: searchState.source === 'genius'
								? 'Genius API'
								: searchState.source === 'cache'
								? 'Cached results'
								: 'Local + Genius'}
						</p>
					) : null}
					{searchState.canSearchGenius ? (
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

			{searchState.autoContinued ? (
				<p className="text-xs text-muted-foreground">
					本地结果较少，已自动通过 Genius 扩展搜索。
				</p>
			) : null}

			<ul className="grid sm:grid-cols-2 gap-3">
				{searchState.results.map((song: SearchSongDTO) => {
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
		</section>
	)
}
