'use client'

import { Suspense } from 'react'
import { Header } from '@/components/song-page/header'
import { Lyric } from '@/components/song-page/lyric'
import { Annotations } from '@/components/song-page/annotations'
import { SelectText } from '@/components/song-page/select-text'
import { useSongDetails } from '@/hooks/use-song-details'
import { useParams } from 'next/navigation'

// Skeleton for individual sections
const HeaderSkeleton = () => (
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
)

const LyricsSkeleton = () => (
	<div className="w-full md:w-1/2 p-4">
		<div className="h-6 w-32 rounded bg-muted mb-4" />
		<div className="space-y-2">
			{Array.from({ length: 8 }, (_, i) => (
				<div
					key={`lyrics-skeleton-${
						// biome-ignore lint/suspicious/noArrayIndexKey: <not now>
						i
					}`}
					className="h-4 w-full rounded bg-muted/80"
				/>
			))}
		</div>
	</div>
)

const AnnotationsSkeleton = () => (
	<div className="w-full md:w-1/2 p-4">
		<div className="h-6 w-32 rounded bg-muted mb-4" />
		<div className="space-y-2">
			<div className="h-4 w-full rounded bg-muted/40" />
			<div className="h-4 w-5/6 rounded bg-muted/60" />
			<div className="h-4 w-2/3 rounded bg-muted/40" />
		</div>
	</div>
)

function SongDetailContent() {
	const params = useParams()
	const path = params.path as string

	const { data, isLoading, error } = useSongDetails(path)

	if (isLoading) {
		return (
			<article className="space-y-6 pb-6">
				<HeaderSkeleton />
				<section className="flex flex-col md:flex-row gap-4">
					<LyricsSkeleton />
					<AnnotationsSkeleton />
				</section>
			</article>
		)
	}

	if (error || !data) {
		return (
			<article className="space-y-6 pb-6">
				<div className="flex h-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-8 text-sm text-destructive text-center">
					<p>加载歌曲详情失败，请稍后重试。</p>
				</div>
			</article>
		)
	}

	const { songId, headerContents } = data

	return (
		<article className="space-y-6 pb-6 relative">
			<Suspense fallback={<HeaderSkeleton />}>
				<Header songId={songId} headerContents={headerContents} />
			</Suspense>

			<section className="flex flex-col md:flex-row gap-4">
				<Suspense fallback={<LyricsSkeleton />}>
					<Lyric path={path} />
					<SelectText songId={songId} songPath={path} />
				</Suspense>

				<Suspense fallback={<AnnotationsSkeleton />}>
					<Annotations path={path} />
				</Suspense>
			</section>
		</article>
	)
}

export default function SongDetailPage() {
	return <SongDetailContent />
}
