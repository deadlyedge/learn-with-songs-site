import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fetchLyricsFromPath } from '@/lib/lyrics'
import { Uncial_Antiqua } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { HeartIcon, Outdent, ShareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Iridescence from '@/components/ui/effects/iridescence'

const uncialAntiqua = Uncial_Antiqua({
	variable: '--font-uncial-antiqua',
	subsets: ['latin'],
	weight: ['400'],
})

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

export default async function SongDetailPage({ params }: SongPageProps) {
	const { path } = await params
	const geniusPath = `/${path}`
	const song = await prisma.song.findUnique({
		where: { geniusPath },
		include: { lyrics: true },
	})

	if (!song) {
		notFound()
	}

	let lyricRecord = song.lyrics
	let lyricsError: string | null = null

	if (!lyricRecord) {
		try {
			const fetchedLyrics = await fetchLyricsFromPath(geniusPath)
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

	const lyricLines = lyricRecord ? splitLyrics(lyricRecord.content) : []

	return (
		<article className="space-y-6 pb-6 relative">
			<div className="relative flex flex-col gap-2 p-2 border-b shadow text-background text-shadow-lg">
				<div className="absolute inset-0 top-0 z-[-2]">
					<Iridescence
						color={[0.5, 0.1, 0.2]}
						mouseReact={false}
						amplitude={0.1}
						speed={0.2}
					/>
				</div>
				{/* <div className='absolute inset-0 top-0 z-[-1] bg-white/80' /> */}

				<Link
					href="/"
					className="text-sm font-medium text-secondary underline-offset-4 hover:underline">
					← 返回搜索
				</Link>
				<h1 className={cn('text-2xl font-semibold', uncialAntiqua.className)}>
					{song.title}
				</h1>
				<div className="flex flex-col md:flex-row gap-4">
					<div className="flex justify-between w-full md:w-1/2">
						<div className="flex flex-col justify-between flex-2">
							<div className="flex flex-col">
								<p
									className={cn(
										'text-lg text-secondary',
										uncialAntiqua.className
									)}>
									{song.artist}
								</p>
								<div className="flex flex-wrap gap-3 text-sm">
									{song.album ? <span>专辑：{song.album}</span> : null}
									{song.releaseDate ? (
										<time dateTime={song.releaseDate.toISOString()}>
											发行：{song.releaseDate.getFullYear()}
										</time>
									) : null}
									{song.geniusId ? (
										<span>GeniusID：{song.geniusId}</span>
									) : null}
									{song.language ? <span>语言：{song.language}</span> : null}
								</div>
							</div>
							<div className="flex flex-col items-end px-2 gap-1">
								<div className="flex text-xs justify-end gap-1">
									<Badge
										variant="buttonLike"
										className="hover:cursor-pointer border-0">
										<ShareIcon />
										分享
									</Badge>
									<Badge
										variant="buttonLike"
										className="hover:cursor-pointer border-0">
										<HeartIcon />
										收藏
									</Badge>
								</div>
								{song.url ? (
									<Link
										href={song.url}
										target="_blank"
										rel="noopener noreferrer"
										className="">
										<Button size="sm" className="rounded-full text-xs">
											在 Genius 上查看
											<Outdent />
										</Button>
									</Link>
								) : null}
							</div>
						</div>
						{song.artworkUrl ? (
							<div className="h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-sm">
								<Image
									src={song.artworkUrl}
									alt={`${song.title} 封面`}
									className="object-cover"
									sizes="192px"
									width={192}
									height={192}
									priority
								/>
							</div>
						) : null}
					</div>
					<div className="w-full md:w-1/2 border rounded-lg bg-amber-100/40 p-2 text-sm">
						{song.geniusPath ? (
							<p className="">歌词来源：{song.geniusPath}</p>
						) : null}
					</div>
				</div>
			</div>

			<section className="space-y-2">
				<h2 className="text-xl font-semibold px-2">歌词 Lyrics</h2>
				<div className="p-4 md:p-6">
					{lyricsError ? (
						<p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{lyricsError}
						</p>
					) : (
						<div className="w-full mb-80">
							{lyricLines.length > 0 ? (
								<ul className="space-y-3">
									{lyricLines.map((line, index) =>
										line === '' ? (
											<li key={`spacer-${index}`} className="h-3" />
										) : (
											<li key={`${index}-${line}`} className="leading-4">
												{line}
											</li>
										)
									)}
								</ul>
							) : (
								<p className="text-sm text-muted-foreground">
									歌词加载中或暂不可用。
								</p>
							)}
						</div>
					)}
					<div
						id="float-annoted"
						className="m-2 fixed bottom-10 left-20 right-0 h-80 md:top-80 md:left-auto md:right-2 md:h-1/2 md:min-h-80 md:w-1/2 md:m-0 flex flex-col gap-2 bg-white/20 shadow-2xl rounded-2xl border border-white/20 p-2 backdrop-blur-sm">
						{lyricRecord ? (
							<>
								<p className="text-sm text-muted-foreground">
									歌词提供者：{lyricRecord.provider}
								</p>
								<p className="text-sm text-muted-foreground">
									歌词拉取时间：{lyricRecord.fetchedAt.toLocaleString()}
								</p>
							</>
						) : null}
					</div>
				</div>
			</section>
		</article>
	)
}
