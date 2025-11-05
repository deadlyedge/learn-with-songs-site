import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fetchLyricsFromPath } from '@/lib/lyrics'

type SongPageProps = {
	params: Promise<{
		id: string
	}>
}

const splitLyrics = (content: string) => {
	const lines = content.split(/\r?\n/)
	const normalized: string[] = []

	for (const rawLine of lines) {
		const line = rawLine.trim()

		if (!line) {
			if (normalized.length > 0 && normalized[normalized.length - 1] !== '') {
				normalized.push('')
			}

			continue
		}

		normalized.push(line)
	}

	return normalized
}

export default async function SongDetailPage({ params }: SongPageProps) {
	const { id } = await params
	const song = await prisma.song.findUnique({
		where: { id },
		include: { lyrics: true },
	})

	if (!song) {
		notFound()
	}

	let lyricRecord = song.lyrics
	let lyricsError: string | null = null

	if (!lyricRecord) {
		if (!song.geniusPath) {
			lyricsError = '当前歌曲缺少歌词来源，请稍后再试。'
		} else {
			try {
				const fetchedLyrics = await fetchLyricsFromPath(song.geniusPath)
				lyricRecord = await prisma.lyric.upsert({
					where: { songId: song.id },
					update: {
						content: fetchedLyrics,
						provider: 'lyrics.zick.me',
						fetchedAt: new Date(),
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
	}

	const lyricLines = lyricRecord ? splitLyrics(lyricRecord.content) : []

	return (
		<article className="space-y-10 pb-12 pt-4">
			<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<Link
						href="/"
						className="text-sm font-medium text-primary underline-offset-4 hover:underline">
						← 返回搜索
					</Link>
					<h1 className="text-3xl font-semibold">{song.title}</h1>
					<p className="text-lg text-muted-foreground">{song.artist}</p>
					<div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
						{song.album ? <span>专辑：{song.album}</span> : null}
						{song.releaseDate ? (
							<time dateTime={song.releaseDate.toISOString()}>
								发行：{song.releaseDate.getFullYear()}
							</time>
						) : null}
						{song.language ? <span>语言：{song.language}</span> : null}
					</div>
					{song.url ? (
						<Link
							href={song.url}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex text-sm text-primary underline-offset-4 hover:underline">
							在 Genius 上查看
						</Link>
					) : null}
				</div>

				{song.artworkUrl ? (
					<div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-sm">
						<Image
							fill
							src={song.artworkUrl}
							alt={`${song.title} 封面`}
							className="object-cover"
							sizes="192px"
							priority
						/>
					</div>
				) : null}
			</div>

			<section className="space-y-4">
				<h2 className="text-xl font-semibold">歌词</h2>
				{lyricsError ? (
					<p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{lyricsError}
					</p>
				) : (
					<div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
						{lyricLines.length > 0 ? (
							<ul className="space-y-3">
								{lyricLines.map((line, index) => (
									<li
										key={`${index}-${line}`}
										className="text-base leading-relaxed">
										{line}
									</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-muted-foreground">
								歌词加载中或暂不可用。
							</p>
						)}
					</div>
				)}
			</section>
		</article>
	)
}
