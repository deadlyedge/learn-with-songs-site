'use client'

import { useState } from 'react'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from './ui/collapsible'
import { Button } from './ui/button'
import { ChevronsUpDownIcon } from 'lucide-react'

import { VocabularyCard } from './vocabulary-card'
import { useUserDataStore } from '@/stores/user-data'

export const VocabularyList = () => {
	const { vocabulary, toggleMastered, loading } = useUserDataStore()
	const [isOpen, setIsOpen] = useState(false)

	const handleSwitchMastered = async (entryId: string) => {
		await toggleMastered(entryId)
	}

	const currentNewWords = vocabulary.filter((e) => !e.mastered)
	const currentHistoryWords = vocabulary.filter((e) => e.mastered)

	if (vocabulary.length === 0 || (currentNewWords.length === 0 && currentHistoryWords.length === 0)) {
		if (loading) {
			return (
				<section className="p-4">
					<p className="text-sm text-muted-foreground">
						正在加载生词本内容...
					</p>
				</section>
			)
		}

		return (
			<section className="p-4">
				<p className="text-sm text-muted-foreground">
					目前还没有加入，去听一首歌，选中感兴趣的片段吧。
				</p>
			</section>
		)
	}

	return (
		<section className="space-y-6 p-4">
			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
				{currentNewWords.map((entry) => (
					<VocabularyCard
						key={entry.id}
						entry={entry}
						handleSwitchMastered={handleSwitchMastered}
					/>
				))}
			</div>
			{currentHistoryWords.length > 0 && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen}>
					<CollapsibleTrigger asChild>
						<Button
							variant="outline"
							className="w-full rounded-xl flex items-center justify-between mb-2">
							<span>历史记录</span>
							<ChevronsUpDownIcon />
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
						{isOpen &&
							currentHistoryWords.map((entry) => (
								<VocabularyCard
									key={entry.id}
									entry={entry}
									handleSwitchMastered={handleSwitchMastered}
								/>
							))}
					</CollapsibleContent>
				</Collapsible>
			)}
		</section>
	)
}
