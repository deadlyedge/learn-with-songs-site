'use client'

import { FormEvent, useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from './ui/spinner'
import { searchSongs } from '@/actions/search'
import { getSearchSuggestions } from '@/actions/suggestions'
import type { SearchSongDTO, SongSearchResponse, Suggestion } from '@/types'
import { SEARCH_DEBOUNCE_DELAY } from '@/constants'

// Debounce hook for search input
function useDebounce<T>(value: T): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value)

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value)
		}, SEARCH_DEBOUNCE_DELAY)

		return () => {
			clearTimeout(handler)
		}
	}, [value])

	return debouncedValue
}

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
	const [suggestions, setSuggestions] = useState<Suggestion[]>([])
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [searchState, setSearchState] =
		useState<SearchState>(initialSearchState)
	const [lastQuery, setLastQuery] = useState('')
	const [isPending, startTransition] = useTransition()

	const debouncedQuery = useDebounce(query)

	// Fetch suggestions based on debounced query
	useEffect(() => {
		const fetchSuggestions = async () => {
			if (debouncedQuery.length >= 2) {
				try {
					const results = await getSearchSuggestions(debouncedQuery)
					setSuggestions(results)
					setShowSuggestions(results.length > 0)
					setSelectedIndex(-1)
				} catch (error) {
					console.error('Failed to fetch suggestions:', error)
					setSuggestions([])
					setShowSuggestions(false)
				}
			} else {
				setSuggestions([])
				setShowSuggestions(false)
			}
		}

		fetchSuggestions()
	}, [debouncedQuery])

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

	const handleSuggestionSelect = (suggestion: Suggestion) => {
		setQuery(suggestion.text)
		setShowSuggestions(false)
		setSelectedIndex(-1)
		// Automatically trigger search
		setTimeout(() => {
			startTransition(() => {
				void requestSearch(suggestion.text)
			})
		}, 0)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!showSuggestions || suggestions.length === 0) return

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				setSelectedIndex((prev) =>
					prev < suggestions.length - 1 ? prev + 1 : 0
				)
				break
			case 'ArrowUp':
				e.preventDefault()
				setSelectedIndex((prev) =>
					prev > 0 ? prev - 1 : suggestions.length - 1
				)
				break
			case 'Enter':
				if (selectedIndex >= 0) {
					e.preventDefault()
					handleSuggestionSelect(suggestions[selectedIndex])
				}
				break
			case 'Escape':
				setShowSuggestions(false)
				setSelectedIndex(-1)
				break
		}
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
					onKeyDown={handleKeyDown}
					onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
					onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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

			{/* Autocomplete Suggestions */}
			{showSuggestions && suggestions.length > 0 && (
				<div className="relative">
					<div className="absolute -top-6 left-0 z-10 w-full max-w-xl">
						<div className="mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
							{suggestions.map((suggestion, index) => (
								<button
									key={`${suggestion.text}-${suggestion.type}-${index}`}
									type="button"
									className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none ${
										index === selectedIndex
											? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
											: 'text-gray-900 dark:text-gray-100'
									}`}
									onClick={() => handleSuggestionSelect(suggestion)}
									onMouseEnter={() => setSelectedIndex(index)}>
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-2">
											<span className="font-medium">{suggestion.text}</span>
											<span
												className={`text-xs px-2 py-0.5 rounded-full ${
													suggestion.type === 'song'
														? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
														: suggestion.type === 'artist'
														? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
														: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
												}`}>
												{suggestion.type}
											</span>
										</div>
										{suggestion.metadata && (
											<div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
												{suggestion.metadata.artist && (
													<span>by {suggestion.metadata.artist}</span>
												)}
												{suggestion.metadata.album && (
													<span>
														{suggestion.metadata.artist ? ' • ' : ''}from{' '}
														{suggestion.metadata.album}
													</span>
												)}
											</div>
										)}
									</div>
								</button>
							))}
						</div>
					</div>
				</div>
			)}

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
