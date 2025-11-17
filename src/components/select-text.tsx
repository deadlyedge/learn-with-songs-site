'use client'

import { useEffect, useState } from 'react'
import { learnWordInLine } from '@/lib/openrouter'
import Markdown from 'react-markdown'

import { Spinner } from './ui/spinner'
import { toast } from 'sonner'
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

type SelectionInfo = {
	word: string
	line: string
	lineNumber: number | null
}

type SelectTextProps = {
	containerId?: string
}

const DEFAULT_CONTAINER_ID = 'lyrics'
const MAX_SELECTION_LENGTH = 24

const isWhitespace = (char?: string) => {
	return !char || /\s/.test(char)
}

const expandToFullWords = (text: string, start: number, end: number) => {
	if (start >= end) {
		return null
	}

	let expandedStart = start
	let expandedEnd = end

	while (expandedStart < text.length && isWhitespace(text[expandedStart])) {
		expandedStart++
	}
	while (expandedStart > 0 && !isWhitespace(text[expandedStart - 1])) {
		expandedStart--
	}

	while (expandedEnd > expandedStart && isWhitespace(text[expandedEnd - 1])) {
		expandedEnd--
	}
	while (expandedEnd < text.length && !isWhitespace(text[expandedEnd])) {
		expandedEnd++
	}

	if (expandedStart >= expandedEnd) {
		return null
	}

	const normalized = text.slice(expandedStart, expandedEnd).trim()
	return normalized.length ? normalized : null
}

const findLineElement = (node: Node | null) => {
	if (!node) {
		return null
	}

	if (node.nodeType === Node.TEXT_NODE) {
		return (
			(node as Text).parentElement?.closest<HTMLElement>('[data-line-text]') ??
			null
		)
	}

	if (node instanceof HTMLElement) {
		return node.closest<HTMLElement>('[data-line-text]')
	}

	return null
}

export const SelectText = ({ containerId }: SelectTextProps) => {
	const [selection, setSelection] = useState<SelectionInfo | null>(null)
	const [result, setResult] = useState('')
	const [openDialog, setOpenDialog] = useState(false)

	const resetSelection = () => {
		setSelection(null)
		setResult('')
	}

	const closeAndReset = () => {
		setOpenDialog(false)
		resetSelection()
	}

	useEffect(() => {
		const targetContainer =
			document.getElementById(containerId ?? DEFAULT_CONTAINER_ID) ?? undefined

		if (!targetContainer) {
			return
		}

		const onSelectStart = () => {
			resetSelection()
		}

		const onSelectEnd = () => {
			if (!targetContainer) {
				resetSelection()
				return
			}

			const activeSelection = document.getSelection()
			if (!activeSelection || activeSelection.isCollapsed) {
				resetSelection()
				return
			}

			const { anchorNode, focusNode } = activeSelection
			if (
				!anchorNode ||
				!focusNode ||
				!targetContainer.contains(anchorNode) ||
				!targetContainer.contains(focusNode)
			) {
				resetSelection()
				return
			}

			const range = activeSelection.getRangeAt(0)
			const startLine = findLineElement(range.startContainer)
			const endLine = findLineElement(range.endContainer)

			if (!startLine || !endLine || startLine !== endLine) {
				resetSelection()
				return
			}

			if (
				range.startContainer.nodeType !== Node.TEXT_NODE ||
				range.endContainer.nodeType !== Node.TEXT_NODE
			) {
				resetSelection()
				return
			}

			if (range.startContainer !== range.endContainer) {
				resetSelection()
				return
			}

			const textNode = range.startContainer as Text
			const start = Math.min(range.startOffset, range.endOffset)
			const end = Math.max(range.startOffset, range.endOffset)

			const word = expandToFullWords(textNode.wholeText, start, end)
			if (!word) {
				resetSelection()
				return
			}
			if (word.length > MAX_SELECTION_LENGTH) {
				resetSelection()
				toast.error('请不要选择大量词语')
				return
			}

			setSelection({
				word,
				line: startLine.dataset.lineText?.trim() ?? textNode.wholeText.trim(),
				lineNumber: Number.isNaN(Number(startLine.dataset.lineIndex))
					? null
					: Number(startLine.dataset.lineIndex),
			})

			setOpenDialog(true)
		}

		targetContainer.addEventListener('selectstart', onSelectStart)
		targetContainer.addEventListener('mouseup', onSelectEnd)

		return () => {
			targetContainer.removeEventListener('selectstart', onSelectStart)
			targetContainer.removeEventListener('mouseup', onSelectEnd)
		}
	}, [containerId])

	useEffect(() => {
		async function onLearning(text?: SelectionInfo) {
			const textToLearn = text ?? selection
			if (!textToLearn) {
				return
			}
			// console.log('text', textToLearn)

			const markdownString = await learnWordInLine(
				textToLearn.word,
				textToLearn.line
			)

			setResult(markdownString)
		}
		if (!selection) return
		onLearning()
	}, [selection])

	return (
		<Dialog open={openDialog}>
			{selection && (
				<DialogContent className="sm:max-w-lg" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>
							<span className="select-none italic text-xs text-muted-foreground font-light">
								word{selection.word.includes(' ') ? 's' : ''}:
							</span>{' '}
							{selection.word.slice(0, 20)}
						</DialogTitle>
						<DialogDescription>
							<span className="select-none italic text-xs text-muted-foreground font-light">
								{`in line${
									selection.lineNumber ? ` ${selection.lineNumber}` : ''
								}:`}
							</span>{' '}
							{selection.line}
						</DialogDescription>
					</DialogHeader>
					{result ? (
						<Markdown>{result}</Markdown>
					) : (
						<div className="flex items-center justify-center">
							<Spinner />
							AI working...
						</div>
					)}
					<DialogFooter>
						<Button>加入我的生词本</Button>
						<DialogClose asChild>
							<Button type="button" variant="secondary" onClick={closeAndReset}>
								Close
							</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			)}
		</Dialog>
	)
}
