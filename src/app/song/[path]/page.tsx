import { Suspense } from 'react'
import Link from 'next/link'
// import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fetchLyricsFromPath } from '@/lib/lyrics'
import { fetchGeniusReferents } from '@/lib/genius'
import { ensureSongDetails } from '@/lib/song-details'
import { hexToRgb01 } from '@/lib/utils'
import {
	cacheReferentsForSong,
	mapDbReferentsToNormalized,
	normalizeReferents,
	type NormalizedReferent,
} from '@/lib/referents'

import { Button } from '@/components/ui/button'
import { GeniusSongInfo } from '@/types/songsAPI'

import { Header } from '@/components/song-page/header'
import { Lyric } from '@/components/song-page/lyric'
import { Annotations } from '@/components/song-page/annotations'

type SongPageProps = {
	params: Promise<{
		path: string
	}>
}

const splitLyrics = (content: string) => {
	// 保留原始格式：按换行分割并保留每一行的原始内容。
	// 如果某行（忽略前导空白）以 '[' 开头（通常是节或注释），
	// 且之前一行不是空行，则在它前面插入一个空行以便视觉分隔。
	const lines = content.split(/\r?\n/)
	const normalized: string[] = []

	for (const rawLine of lines) {
		// 保留行的原始内容，不 trim
		const line = rawLine

		// 如果当前行（忽略前导空白）以 '[' 开头
		if (line.trimStart().startsWith('[')) {
			// 如果前一行存在且不是空行，则插入一个空行作为分隔
			if (normalized.length > 0 && normalized[normalized.length - 1] !== '') {
				normalized.push('')
			}
			normalized.push(line)
			continue
		}

		// 普通行直接保留（包括空字符串）
		normalized.push(line)
	}

	return normalized
}

async function SongDetailContent({ params }: SongPageProps) {
	const { path } = await params
	const geniusPath = `/${path}`
	const songRecord = await prisma.song.findUnique({
		where: { geniusPath },
		include: {
			lyrics: true,
			referents: {
				include: {
					annotations: true,
				},
			},
		},
	})

	if (!songRecord) {
		// notFound()
		return (
			<div className="flex flex-col items-center justify-center gap-4">
				<h1 className="text-2xl font-semibold">歌曲未找到</h1>
				<p className="text-muted-foreground">
					歌曲不存在或已被删除。请检查路径是否正确。
				</p>
				<Button asChild>
					<Link href="/">返回搜索</Link>
				</Button>
			</div>
		)
	}

	let song = songRecord

	try {
		const { song: syncedSong } = await ensureSongDetails(songRecord)
		song = {
			...songRecord,
			...syncedSong,
			lyrics: songRecord.lyrics,
		}
	} catch (error) {
		console.error('Failed to sync song details', error)
	}

	let lyricRecord = song.lyrics
	let lyricsError: string | null = null
	let referents: NormalizedReferent[] = []

	if (!lyricRecord) {
		try {
			const fetchedLyrics = await fetchLyricsFromPath(geniusPath)
			lyricRecord = await prisma.lyric.upsert({
				where: { songId: song.id },
				update: {
					content: fetchedLyrics,
					provider: 'lyrics.zick.me',
					updatedAt: new Date(),
				},
				create: {
					songId: song.id,
					content: fetchedLyrics,
					provider: 'lyrics.zick.me',
				},
			})
		} catch (error) {
			console.error(error)
			lyricsError = '歌词拉取失败，请稍后再试。'
		}
	}

	const lyricLines = lyricRecord ? splitLyrics(lyricRecord.content) : []
	const details = (song.details ?? null) as GeniusSongInfo | null
	const referentsTargetId =
		song.geniusId ?? (typeof details?.id === 'number' ? details.id : undefined)

	const cachedReferents = songRecord.referents ?? []
	const hasCachedReferents = cachedReferents.length > 0
	const hasFetchedReferents = Boolean(songRecord.referentsFetchedAt)

	if (hasCachedReferents) {
		referents = mapDbReferentsToNormalized(cachedReferents)
	} else if (referentsTargetId && !hasFetchedReferents) {
		try {
			const referentsResponse = await fetchGeniusReferents(referentsTargetId)
			referents = normalizeReferents(referentsResponse)
			await cacheReferentsForSong(song.id, referents)
		} catch (error) {
			console.error('Failed to fetch Genius referents', error)
		}
	}

	const colorArray = details?.song_art_primary_color
		? hexToRgb01(details.song_art_primary_color)
		: ([0.5, 0.1, 0.2] as [number, number, number])
	const headerContents = {
		title: song.title,
		artist: song.artist,
		album: song.album as string,
		releaseDate: details?.release_date_for_display as string,
		description: details?.description as string,
		language: song.language as string,
		contributors: String(details?.stats?.contributors),
		pageviews: String(details?.stats?.pageviews),
		url: song.url as string,
		artworkUrl: song.artworkUrl as string,
		backgroundColor: colorArray,
	}

	return (
		<article className="space-y-6 pb-6 relative">
			<Header headerContents={headerContents} />
			<section id="contents" className="flex flex-col md:flex-row gap-4">
				<Lyric
					error={lyricsError}
					lyricLines={lyricLines}
					songId={song.id}
					songPath={song.geniusPath ?? geniusPath}
				/>

				<Annotations referents={referents} />
			</section>
		</article>
	)
}

const SongDetailFallback = () => (
	<article className="space-y-6 pb-6">
		<div className="rounded-2xl border bg-muted/20 p-4 shadow-sm animate-pulse space-y-4">
			<div className="h-4 w-24 rounded bg-muted" />
			<div className="h-8 w-3/4 rounded bg-muted" />
			<div className="grid gap-4 md:grid-cols-[1fr,192px]">
				<div className="space-y-3">
					<div className="h-4 w-32 rounded bg-muted" />
					<div className="h-20 rounded bg-muted/60" />
				</div>
				<div className="h-48 w-48 rounded-xl bg-muted/60" />
			</div>
		</div>
		<section className="space-y-3">
			<div className="h-6 w-32 rounded bg-muted" />
			<div className="space-y-2">
				<div className="h-4 w-full rounded bg-muted/80" />
				<div className="h-4 w-5/6 rounded bg-muted/60" />
				<div className="h-4 w-2/3 rounded bg-muted/40" />
			</div>
		</section>
	</article>
)

export default async function SongDetailPage(props: SongPageProps) {
	return (
		<Suspense fallback={<SongDetailFallback />}>
			<SongDetailContent {...props} />
		</Suspense>
	)
}
