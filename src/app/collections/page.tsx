'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { ArrowUpRightIcon, SquircleDashedIcon } from 'lucide-react'

import { useUserDataStore } from '@/stores/user-data'
import { CollectionsList } from '@/components/collections'

export default function CollectionsPage() {
	const { collections, loading, error, fetchCollections } = useUserDataStore()

	useEffect(() => {
		// Initialize data on mount if not already loaded
		if (collections.length === 0) {
			fetchCollections()
		}
	}, [collections.length, fetchCollections])

	// if (loading && collections.length === 0) {
	// 	return (
	// 		<main className="container mx-auto">
	// 			<div className="p-4">
	// 				<PageHeader
	// 					title={COLLECTION_TITLE}
	// 					description={COLLECTION_DESCRIPTION}
	// 				/>
	// 			</div>
	// 			<div className="flex items-center justify-center p-8">
	// 				<div className="text-sm text-muted-foreground">
	// 					正在加载收藏列表...
	// 				</div>
	// 			</div>
	// 		</main>
	// 	)
	// }

	// if (error) {
	// 	return (
	// 		<main className="container mx-auto">
	// 			<div className="p-4">
	// 				<PageHeader
	// 					title={COLLECTION_TITLE}
	// 					description={COLLECTION_DESCRIPTION}
	// 				/>
	// 				<p className="text-sm text-destructive">{error}</p>
	// 				<button
	// 					onClick={fetchCollections}
	// 					className="text-sm text-primary hover:underline mt-2">
	// 					重试
	// 				</button>
	// 			</div>
	// 		</main>
	// 	)
	// }

	// if (collections.length === 0) {
	// 	return (
	// 		<section className="space-y-4 p-4">
	// 			<PageHeader
	// 				title={EMPTY_TITLE}
	// 				description={EMPTY_DESCRIPTION}
	// 				className="space-y-1"
	// 			/>
	// 			<Button variant="outline" size="sm" asChild>
	// 				<Link href="/">去搜索歌曲</Link>
	// 			</Button>
	// 		</section>
	// 	)
	// }

	return (
		<section className="space-y-6 p-4">
			<h1 className="text-2xl font-semibold">收藏的歌曲</h1>
			<p className="text-sm text-muted-foreground">
				在歌词页点击[收藏]即可将歌曲加入这里，记录你值得反复听的作品。
			</p>
			{loading ? (
				<div className="flex items-center justify-center p-8">
					<div className="flex text-sm text-muted-foreground">
						正在加载收藏列表
						<Spinner />
					</div>
				</div>
			) : collections.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<SquircleDashedIcon />
						</EmptyMedia>
						<EmptyTitle>还没有添加收藏</EmptyTitle>
						<EmptyDescription>
							在歌词页点击[收藏]即可将歌曲加入这里
						</EmptyDescription>
						<Link href="/">
							<span className="flex">
								去搜索歌曲
								<ArrowUpRightIcon />
							</span>
						</Link>
					</EmptyHeader>
				</Empty>
			) : error ? (
				<div className="flex items-center justify-center p-8">
					<p className="text-sm text-destructive">{error}</p>
					<Button
						onClick={fetchCollections}
						className="text-sm text-primary hover:underline mt-2">
						重试
					</Button>
				</div>
			) : (
				<CollectionsList collections={collections} />
			)}
		</section>
	)
}
