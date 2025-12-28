'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { learnWordInLine } from '@/lib/openrouter'
import { useUpdateVocabularyEntry } from '@/hooks/use-vocabulary'
import { normalizeSongPath } from '@/lib/utils'

import { toast } from 'sonner'
import Markdown from 'react-markdown'

import {
	FileSearchCornerIcon,
	ThumbsDownIcon,
	ThumbsUpIcon,
} from 'lucide-react'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from './ui/card'

import type { VocabularyEntryWithSongData } from '@/types'

export type VocabularyEntryCardProps = {
	entry: VocabularyEntryWithSongData
	handleSwitchMastered: (entryId: string) => void
}

export const VocabularyCard = ({
	entry,
	handleSwitchMastered,
}: VocabularyEntryCardProps) => {
	const [open, setOpen] = useState(false)
	const [isRefetching, setIsRefetching] = useState(false)
	const [result, setResult] = useState(entry.result)
	const normalizedPath = entry.songPath.startsWith('/')
		? entry.songPath
		: `/${entry.songPath}`
	const songHref = `/song${normalizedPath}`

	const updateMutation = useUpdateVocabularyEntry()

	const handleRefetch = async () => {
		setIsRefetching(true)
		try {
			const newResult = await learnWordInLine(entry.word, entry.line)
			setResult(newResult)

			// 使用 mutation 更新数据库
			await updateMutation.mutateAsync({
				id: entry.id,
				result: newResult,
				songPath: normalizeSongPath(entry.songPath)!,
			})

			toast.success('已重新获取AI解释')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : '重新询问AI失败')
		} finally {
			setIsRefetching(false)
		}
	}

	return (
		<Card className="w-full flex flex-col justify-between">
			<CardHeader>
				<CardTitle className="text-lg font-semibold">{entry.word}</CardTitle>
				<CardDescription className="text-sm text-muted-foreground leading-snug">
					{entry.line}
				</CardDescription>
				<CardAction className="ml-auto text-xs text-muted-foreground"></CardAction>
			</CardHeader>
			<CardFooter className="w-full flex flex-col items-start gap-2">
				<Link
					href={songHref}
					className="text-sm font-semibold text-primary hover:underline">
					<div className="flex items-center gap-2">
						{entry.songArtworkUrl ? (
							<Image
								src={entry.songArtworkUrl}
								alt={entry.songTitle}
								width={64}
								height={64}
								className="h-16 w-16 rounded-md object-cover"
							/>
						) : (
							<div className="h-16 w-16 rounded-md bg-muted" />
						)}
						<div className="flex flex-col">
							{entry.songTitle}
							{entry.lineNumber !== null && (
								<span className="text-xs text-muted-foreground">
									第 {entry.lineNumber} 行
								</span>
							)}
						</div>
					</div>
				</Link>
				<div className="w-full flex items-center justify-between">
					<Button
						size="sm"
						variant="outline"
						type="button"
						onClick={() => setOpen(true)}>
						<FileSearchCornerIcon />
						复习
					</Button>{' '}
					<Button
						size="sm"
						variant="destructive"
						type="button"
						onClick={() => handleSwitchMastered(entry.id)}>
						{entry.mastered ? (
							<>
								<ThumbsDownIcon />
								还不熟
							</>
						) : (
							<>
								<ThumbsUpIcon />
								已掌握
							</>
						)}
					</Button>
				</div>
			</CardFooter>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-lg" showCloseButton={false}>
					<DialogHeader className="text-left">
						<DialogTitle>
							<span className="text-xs italic text-muted-foreground">
								word{entry.word.includes(' ') ? 's' : ''}:
							</span>{' '}
							{entry.word}
						</DialogTitle>
						<DialogDescription>
							<span className="text-xs italic text-muted-foreground">
								{entry.lineNumber ? `line ${entry.lineNumber}:` : 'line:'}
							</span>{' '}
							{entry.line}
						</DialogDescription>
					</DialogHeader>
					{result ? (
						<Markdown>{result}</Markdown>
					) : (
						<p className="text-sm text-muted-foreground">暂无说明</p>
					)}
					<DialogFooter className="gap-2 w-full flex-row justify-between sm:justify-between">
						<Button
							type="button"
							variant="outline"
							onClick={handleRefetch}
							disabled={isRefetching}
							className="w-36">
							{isRefetching ? '重新询问中...' : '重新询问AI'}
						</Button>
						<DialogClose asChild>
							<Button type="button" variant="secondary">
								Close
							</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	)
}
