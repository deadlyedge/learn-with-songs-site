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
import { switchMasteredState } from '@/actions/vocabulary'

type VocabularyListProps = {
	initialNewWords: VocabularyEntryWithSong[]
	initialHistoryWords: VocabularyEntryWithSong[]
}

type VocabularyEntryWithSong = {
	id: string
	word: string
	line: string
	lineNumber: number | null
	result: string
	songPath: string
	songTitle: string
	songArtworkUrl: string | null
	mastered: boolean
	songId: string
}

export const VocabularyList = ({
	initialNewWords,
	initialHistoryWords,
}: VocabularyListProps) => {
	const [words, setWords] = useState([
		...initialNewWords,
		...initialHistoryWords,
	])
	const [isOpen, setIsOpen] = useState(false)

	const handleSwitchMastered = async (entryId: string) => {
		const entry = words.find((e) => e.id === entryId)
		if (!entry) return

		const newMastered = !entry.mastered

		// Optimistic update
		setWords((prev) =>
			prev.map((e) => (e.id === entryId ? { ...e, mastered: newMastered } : e))
		)

		try {
			await switchMasteredState(entryId)
			// Server action will revalidate and update the page
		} catch (error) {
			// Revert on error
			setWords((prev) =>
				prev.map((e) =>
					e.id === entryId ? { ...e, mastered: !newMastered } : e
				)
			)
			console.error('Failed to switch mastered state:', error)
		}
	}

	const currentNewWords = words.filter((e) => !e.mastered)
	const currentHistoryWords = words.filter((e) => e.mastered)

	if (currentNewWords.length === 0 && currentHistoryWords.length === 0) {
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
