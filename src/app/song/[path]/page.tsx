import { Suspense } from 'react'
import { Header } from '@/components/song-page/header'
import { Lyric } from '@/components/song-page/lyric'
import { Annotations } from '@/components/song-page/annotations'
import { SelectText } from '@/components/song-page/select-text'
import { getSongDetails } from '@/lib/api/song-data'

type SongPageProps = {
	params: Promise<{
		path: string
	}>
}

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
				<div key={i} className="h-4 w-full rounded bg-muted/80" />
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

async function SongDetailContent({ params }: SongPageProps) {
	const { path } = await params

	// Fetch details to get songId
	let songId: string | undefined
	try {
		const details = await getSongDetails(path)
		songId = details.songId
	} catch (error) {
		console.error('Failed to fetch song details for coordination:', error)
	}

	return (
		<article className="space-y-6 pb-6 relative">
			<Suspense fallback={<HeaderSkeleton />}>
				<Header path={path} />
			</Suspense>

			<section className="flex flex-col md:flex-row gap-4">
				<Suspense fallback={<LyricsSkeleton />}>
					<Lyric path={path} />
					<SelectText songId={songId} songPath={path} />
				</Suspense>

				<Suspense fallback={<AnnotationsSkeleton />}>
					<Annotations songId={songId} />
				</Suspense>
			</section>
		</article>
	)
}

const SongDetailFallback = () => (
	<article className="space-y-6 pb-6">
		<HeaderSkeleton />
		<section className="flex flex-col md:flex-row gap-4">
			<LyricsSkeleton />
			<AnnotationsSkeleton />
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
