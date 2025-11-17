'use client'

import { useEffect, useState } from 'react'
import { SignInButton, useUser } from '@clerk/nextjs'
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
	songId?: string
	songPath?: string
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

export const SelectText = ({
	containerId,
	songId,
	songPath,
}: SelectTextProps) => {
	const [selection, setSelection] = useState<SelectionInfo | null>(null)
	const [result, setResult] = useState('')
	const [openDialog, setOpenDialog] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [duplicateChecking, setDuplicateChecking] = useState(false)
	const [duplicateExists, setDuplicateExists] = useState(false)
	const [duplicateError, setDuplicateError] = useState<string | null>(null)
	const { isSignedIn } = useUser()

	const resetSelection = () => {
		setSelection(null)
		setResult('')
		setOpenDialog(false)
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
				toast.error('请选择更短的片段')
				resetSelection()
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
		if (!selection) {
			return
		}

		let cancelled = false

		const fetchResult = async () => {
			const markdownString = await learnWordInLine(
				selection.word,
				selection.line
			)
			if (cancelled) {
				return
			}
			setResult(markdownString)
		}

		setResult('')
		fetchResult()

		return () => {
			cancelled = true
		}
	}, [selection])

	useEffect(() => {
		if (!selection || !songId) {
			setDuplicateExists(false)
			setDuplicateError(null)
			setDuplicateChecking(false)
			return
		}

		let cancelled = false
		const params = new URLSearchParams({
			word: selection.word,
			line: selection.line,
			songId,
		})

		if (selection.lineNumber !== null) {
			params.set('lineNumber', selection.lineNumber.toString())
		}

		const checkDuplicate = async () => {
			setDuplicateChecking(true)
			setDuplicateError(null)

			const response = await fetch('/api/vocabulary/exists', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					word: selection.word,
					line: selection.line,
					lineNumber: selection.lineNumber,
					songId,
				}),
				cache: 'no-store',
			})

			const data = await response.json().catch(() => ({}))
			if (cancelled) {
				return
			}

			if (!response.ok) {
				if (response.status === 401) {
					setDuplicateExists(false)
					return
				}
				throw new Error(data?.error ?? '检查重复失败')
			}

			setDuplicateExists(Boolean(data?.exists))
		}

		checkDuplicate()
			.catch((error) => {
				if (cancelled) {
					return
				}
				setDuplicateError(
					error instanceof Error ? error.message : '检查重复失败'
				)
				setDuplicateExists(false)
			})
			.finally(() => {
				if (cancelled) {
					return
				}
				setDuplicateChecking(false)
			})

		return () => {
			cancelled = true
		}
	}, [selection, songId])

	const handleAddToVocabulary = async () => {
		if (!selection || !result) {
			toast.error('等待结果生成后再加入生词本')
			return
		}

		if (!songId || !songPath) {
			toast.error('缺少歌曲信息，无法加入生词本')
			return
		}

		if (duplicateExists) {
			toast.error('该片段已经在生词本中了')
			return
		}

		const normalizedSongPath = songPath.startsWith('/')
			? songPath
			: `/${songPath}`

		setIsSaving(true)

		try {
			const response = await fetch('/api/vocabulary', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					word: selection.word,
					line: selection.line,
					lineNumber: selection.lineNumber,
					result,
					songId,
					songPath: normalizedSongPath,
				}),
			})

			if (!response.ok) {
				const body = await response.json().catch(() => null)
				throw new Error(body?.error ?? '加入生词本失败')
			}

			toast.success('已加入我的生词本')
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : '加入生词本失败，请稍后重试'
			)
		} finally {
			setIsSaving(false)
		}
	}

	const previewText = selection
		? selection.word.length > 20
			? `${selection.word.slice(0, 20)}...`
			: selection.word
		: ''

	return (
		<Dialog open={openDialog}>
			{selection && (
				<DialogContent className="sm:max-w-lg" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>
							<span className="select-none italic text-xs text-muted-foreground font-light">
								word{selection.word.includes(' ') ? 's' : ''}:
							</span>{' '}
							{previewText}
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
					{duplicateChecking && (
						<p className="text-xs text-muted-foreground">正在检查是否已存在</p>
					)}
					{duplicateExists && (
						<p className="text-xs text-destructive">该片段已经在生词本中了</p>
					)}
					{duplicateError && (
						<p className="text-xs text-destructive">{duplicateError}</p>
					)}
					<DialogFooter className="gap-2">
						{isSignedIn ? (
							<Button
								type="button"
								className="w-full sm:w-auto"
								onClick={handleAddToVocabulary}
								disabled={
									!result || isSaving || duplicateExists || duplicateChecking
								}>
								{isSaving ? '加入中...' : '加入我的生词本'}
							</Button>
						) : (
							<SignInButton mode="modal">
								<Button
									asChild
									type="button"
									variant="secondary"
									className="w-full sm:w-auto"
									onClick={closeAndReset}>
									<span>加入我的生词本</span>
								</Button>
							</SignInButton>
						)}
						{/* <Button>复习</Button> */}
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
