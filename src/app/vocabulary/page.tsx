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
import { VocabularyList } from '@/components/vocabulary-list'

export default function VocabularyPage() {
	const { vocabulary, loading, error, fetchVocabulary } = useUserDataStore()

	useEffect(() => {
		// Initialize data on mount if not already loaded
		if (vocabulary.length === 0) {
			fetchVocabulary()
		}
	}, [vocabulary.length, fetchVocabulary])

	return (
		<section className="space-y-6 p-4">
			<h1 className="text-2xl font-semibold">我的生词本</h1>
			<p className="text-sm text-muted-foreground">
				这里展示你收藏的单词/短语，点击复习即可查看解释和例句。
			</p>
			{loading ? (
				<div className="flex items-center justify-center p-8">
					<div className="flex text-sm text-muted-foreground">
						正在加载生词本
						<Spinner />
					</div>
				</div>
			) : vocabulary.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<SquircleDashedIcon />
						</EmptyMedia>
						<EmptyTitle>还没有添加生词</EmptyTitle>
						<EmptyDescription>
							点击歌词中的单词即可收藏
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
						onClick={fetchVocabulary}
						className="text-sm text-primary hover:underline mt-2">
						重试
					</Button>
				</div>
			) : (
				<VocabularyList />
			)}
		</section>
	)
}
