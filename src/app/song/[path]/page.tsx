import { Suspense } from 'react'
import { HeaderSection } from '@/components/song-page/header-section'
import { LyricsSection } from '@/components/song-page/lyrics-section'
import { AnnotationsSection } from '@/components/song-page/annotations-section'
import { SelectText } from '@/components/song-page/select-text'

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
		const detailsResponse = await fetch(
			`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/songs/details/${path}`
		)
		if (detailsResponse.ok) {
			const data = await detailsResponse.json()
			songId = data.songId
		}
	} catch (error) {
		console.error('Failed to fetch song details for coordination:', error)
	}

	return (
		<article className="space-y-6 pb-6 relative">
			<Suspense fallback={<HeaderSkeleton />}>
				<HeaderSection path={path} />
			</Suspense>

			<section className="flex flex-col md:flex-row gap-4">
				<Suspense fallback={<LyricsSkeleton />}>
					<LyricsSection path={path} />
					<SelectText songId={songId} songPath={path} />
				</Suspense>

				<Suspense fallback={<AnnotationsSkeleton />}>
					<AnnotationsSection songId={songId} />
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
