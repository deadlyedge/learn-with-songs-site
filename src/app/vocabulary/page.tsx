'use client'

import { useEffect } from 'react'
import { VocabularyList } from '@/components/vocabulary-list'
import { useUserDataStore } from '@/stores/user-data'

export default function VocabularyPage() {
	const { vocabulary, loading, error, fetchVocabulary } = useUserDataStore()

	useEffect(() => {
		// Initialize data on mount if not already loaded
		if (vocabulary.length === 0) {
			fetchVocabulary()
		}
	}, [vocabulary.length, fetchVocabulary])

	if (loading && vocabulary.length === 0) {
		return (
			<main className="container mx-auto">
				<header className="space-y-2 p-4">
					<h1 className="text-2xl font-semibold">我的生词本</h1>
					<p className="text-sm text-muted-foreground">
						这里展示你收藏的单词/短语，点击复习即可重新打开选中位置
					</p>
				</header>
				<div className="flex items-center justify-center p-8">
					<div className="text-sm text-muted-foreground">正在加载生词本...</div>
				</div>
			</main>
		)
	}

	if (error) {
		return (
			<main className="container mx-auto">
				<header className="space-y-2 p-4">
					<h1 className="text-2xl font-semibold">我的生词本</h1>
					<p className="text-sm text-muted-foreground">
						这里展示你收藏的单词/短语，点击复习即可重新打开选中位置
					</p>
				</header>
				<div className="p-4">
					<p className="text-sm text-destructive">{error}</p>
					<button
						onClick={fetchVocabulary}
						className="text-sm text-primary hover:underline mt-2">
						重试
					</button>
				</div>
			</main>
		)
	}

	return (
		<main className="container mx-auto">
			<header className="space-y-2 p-4">
				<h1 className="text-2xl font-semibold">我的生词本</h1>
				<p className="text-sm text-muted-foreground">
					这里展示你收藏的单词/短语，点击复习即可重新打开选中位置
				</p>
			</header>
			<VocabularyList />
		</main>
	)
}
