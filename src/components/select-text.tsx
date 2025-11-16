'use client'

import { learnWordInLine } from '@/lib/openrouter'
import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import { Spinner } from './ui/spinner'

type SelectionInfo = {
	word: string
	line: string
}

type Position = {
	x: number
	y: number
	width: number
	height: number
}

type SelectTextProps = {
	containerId?: string
}

const DEFAULT_CONTAINER_ID = 'lyrics'
const MAX_SELECTION_LENGTH = 400

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
	const [position, setPosition] = useState<Position | null>(null)
	const [result, setResult] = useState('')

	useEffect(() => {
		const targetContainer =
			document.getElementById(containerId ?? DEFAULT_CONTAINER_ID) ?? undefined

		if (!targetContainer) {
			return
		}

		const resetSelection = () => {
			setSelection(null)
			setPosition(null)
			setResult('')
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
			if (!word || word.length > MAX_SELECTION_LENGTH) {
				resetSelection()
				return
			}

			const rect = range.getBoundingClientRect()
			setSelection({
				word,
				line: startLine.dataset.lineText?.trim() ?? textNode.wholeText.trim(),
			})

			setPosition({
				x: rect.left + rect.width,
				y: rect.top + window.scrollY - 30 - 12,
				width: rect.width,
				height: rect.height,
			})
		}

		document.addEventListener('selectstart', onSelectStart)
		document.addEventListener('mouseup', onSelectEnd)

		return () => {
			document.removeEventListener('selectstart', onSelectStart)
			document.removeEventListener('mouseup', onSelectEnd)
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

	// const previewText = selection
	// 	? selection.word.length > 20
	// 		? `${selection.word.slice(0, 20)}...`
	// 		: selection.word
	// 	: ''

	return (
		<div role="dialog" aria-labelledby="share">
			{selection && position && (
				<div
					className="
            absolute -top-14 left-20 bg-yellow-200 text-card-foreground rounded m-0 p-3 shadow max-w-1/2
          "
					style={{
						transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
					}}>
					{/* <button
						className="flex w-full h-full justify-between items-center px-2"
						onClick={() => onLearning()}>
						<span id="share" className="text-xs">
							Learn&nbsp;
							{previewText}
						</span>
					</button> */}
					{result ? (
						<Markdown>{result}</Markdown>
					) : (
						<div className="flex items-center justify-center">
							<Spinner />
							AI working...
						</div>
					)}
				</div>
			)}
		</div>
	)
}
