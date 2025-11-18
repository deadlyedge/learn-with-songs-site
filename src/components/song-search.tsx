'use client'

import { FormEvent, useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SongResult = {
	id: string
	title: string
	artist: string
	album?: string | null
	releaseDate?: string | null
	artworkUrl?: string | null
	language?: string | null
	url?: string | null
	path?: string | null
}

type Source = 'database' | 'genius' | 'mixed'

type SearchResponse = {
	source: Source
	songs: SongResult[]
	canSearchGenius?: boolean
	performedGenius?: boolean
	autoContinued?: boolean
}

export const SongSearch = () => {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<SongResult[]>([])
	const [source, setSource] = useState<Source | null>(null)
	const [lastQuery, setLastQuery] = useState('')
	const [hasSearched, setHasSearched] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [canSearchGenius, setCanSearchGenius] = useState(false)
	const [autoContinued, setAutoContinued] = useState(false)
	const [isPending, startTransition] = useTransition()

	const getReleaseYear = (value?: string | null) => {
		if (!value) {
			return null
		}

		const parsed = new Date(value)
		return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear()
	}

	const requestSearch = async (searchParams: URLSearchParams) => {
		const currentQuery = searchParams.get('q')?.trim() ?? ''

		if (currentQuery) {
			setLastQuery(currentQuery)
		}

		setHasSearched(true)
		setError(null)
		setCanSearchGenius(false)
		setAutoContinued(false)

		try {
			const response = await fetch(`/api/songs?${searchParams.toString()}`, {
				method: 'GET',
			})
			const payload = (await response.json()) as Partial<SearchResponse> & {
				error?: string
			}

			if (!response.ok || !payload.songs) {
				throw new Error(payload.error ?? '搜索失败，请稍后重试。')
			}

			setResults(payload.songs)
			setSource(payload.source ?? null)
			setCanSearchGenius(payload.canSearchGenius ?? false)
			setAutoContinued(Boolean(payload.autoContinued))
		} catch (fetchError) {
			console.error(fetchError)
			setResults([])
			setSource(null)
			setCanSearchGenius(false)
			setAutoContinued(false)
			setError((fetchError as Error).message)
		}
	}

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const trimmed = query.trim()

		if (!trimmed) {
			setError('请输入歌曲名或艺人名后再搜索。')
			return
		}

		setLastQuery(trimmed)

		startTransition(() => {
			const params = new URLSearchParams({ q: trimmed })
			void requestSearch(params)
		})
}

	const handleGeniusSearch = () => {
		if (!lastQuery) {
			return
		}

		startTransition(() => {
			const params = new URLSearchParams({ q: lastQuery, source: 'genius' })
			void requestSearch(params)
		})
	}

	return (
		<section className="space-y-6">
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
					{isPending ? '搜索中...' : '搜索'}
				</Button>
			</form>

			{error ? (
				<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{error}
				</p>
			) : null}

			{hasSearched && results.length === 0 && !isPending ? (
				<p className="text-sm text-muted-foreground">暂无匹配结果，换个关键词试试。</p>
			) : null}

	{source || canSearchGenius ? (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			{source ? (
				<p className="text-xs uppercase tracking-wide text-muted-foreground">
					数据来源：
					{source === 'database'
						? '本地缓存'
						: source === 'genius'
							? 'Genius API'
							: '本地缓存 + Genius'}
				</p>
			) : null}
			{canSearchGenius ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleGeniusSearch}
					disabled={isPending}
				>
					{isPending ? '搜索中...' : '通过 Genius 继续搜索'}
				</Button>
			) : null}
		</div>
	) : null}

	{autoContinued ? (
		<p className="text-xs text-muted-foreground">
			本地结果较少，已自动通过 Genius 扩展搜索。
		</p>
	) : null}

			<ul className="grid gap-3">
				{results.map((song) => {
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
										dateTime={song.releaseDate ?? undefined}
									>
										发行：{releaseYear}
									</time>
								) : null}
							</div>
							{song.album ? (
								<p className="text-xs text-muted-foreground">专辑：{song.album}</p>
							) : null}
						</>
					)

					return (
						<li
							key={song.id}
							className="group rounded-lg border border-border/70 bg-background/80 p-4 transition hover:border-primary/70 hover:bg-primary/5"
						>
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
