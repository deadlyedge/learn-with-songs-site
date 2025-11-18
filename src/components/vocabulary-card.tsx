'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import Markdown from 'react-markdown'

import { FileSearchCornerIcon, ThumbsUpIcon } from 'lucide-react'
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

export type VocabularyEntryCardProps = {
	entry: {
		id: string
		word: string
		line: string
		lineNumber: number | null
		result: string
		songPath: string
		songTitle: string
		songArtworkUrl?: string | null
	}
}

export const VocabularyCard = ({ entry }: VocabularyEntryCardProps) => {
	const [open, setOpen] = useState(false)
	const normalizedPath = entry.songPath.startsWith('/')
		? entry.songPath
		: `/${entry.songPath}`
	const songHref = `/song${normalizedPath}`

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
					<Button size="sm" variant="destructive" type="button">
						<ThumbsUpIcon />
						已掌握
					</Button>
				</div>
				{/* <Button size="sm" variant="secondary" type="button">
					<Link
						href={songHref}
						className="text-xs font-medium text-primary hover:underline">
						打开歌词
					</Link>
				</Button> */}
			</CardFooter>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-lg" showCloseButton={false}>
					<DialogHeader>
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
					{entry.result ? (
						<Markdown>{entry.result}</Markdown>
					) : (
						<p className="text-sm text-muted-foreground">暂无说明</p>
					)}
					<DialogFooter>
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
