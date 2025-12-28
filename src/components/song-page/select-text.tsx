'use client'

import { SignInButton, useUser } from '@clerk/nextjs'
import { BookPlusIcon, RefreshCwIcon } from 'lucide-react'
import { useEffect, useReducer } from 'react'
import Markdown from 'react-markdown'
import { toast } from 'sonner'
import { DEFAULT_CONTAINER_ID, MAX_SELECTION_LENGTH } from '@/constants'
import {
	useCheckVocabularyEntry,
	useUpdateVocabularyEntry,
} from '@/hooks/use-vocabulary'
import { learnWordInLine } from '@/lib/openrouter'
import {
	expandToFullWords,
	findLineElement,
	normalizeSongPath,
} from '@/lib/utils'
import { useUserDataStore } from '@/stores/user-data'
import { Button } from '../ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../ui/dialog'
import { Spinner } from '../ui/spinner'

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

type State = {
	selection: SelectionInfo | null
	result: string
	openDialog: boolean
	isSaving: boolean
	duplicateChecking: boolean
	duplicateExists: boolean
	duplicateError: string | null
}

type Action =
	| { type: 'SET_SELECTION'; payload: SelectionInfo }
	| { type: 'RESET' }
	| { type: 'SET_RESULT'; payload: string }
	| { type: 'SET_DUPLICATE_CHECKING'; payload: boolean }
	| { type: 'SET_DUPLICATE_EXISTS'; payload: boolean; result?: string }
	| { type: 'SET_DUPLICATE_ERROR'; payload: string | null }
	| { type: 'SET_SAVING'; payload: boolean }
	| { type: 'CLOSE_DIALOG' }

const initialState: State = {
	selection: null,
	result: '',
	openDialog: false,
	isSaving: false,
	duplicateChecking: false,
	duplicateExists: false,
	duplicateError: null,
}

const reducer = (state: State, action: Action): State => {
	switch (action.type) {
		case 'SET_SELECTION':
			return {
				...state,
				selection: action.payload,
				openDialog: true,
				result: '',
				duplicateChecking: true,
				duplicateError: null,
				duplicateExists: false,
			}
		case 'RESET':
			return initialState
		case 'SET_RESULT':
			return {
				...state,
				result: action.payload,
				duplicateChecking: false,
			}
		case 'SET_DUPLICATE_CHECKING':
			return {
				...state,
				duplicateChecking: action.payload,
			}
		case 'SET_DUPLICATE_EXISTS':
			return {
				...state,
				duplicateExists: action.payload,
				result: action.result ?? state.result,
			}
		case 'SET_DUPLICATE_ERROR':
			return {
				...state,
				duplicateError: action.payload,
				duplicateChecking: false,
			}
		case 'SET_SAVING':
			return {
				...state,
				isSaving: action.payload,
			}
		case 'CLOSE_DIALOG':
			return {
				...state,
				openDialog: false,
			}
		default:
			return state
	}
}

export const SelectText = ({
	containerId,
	songId,
	songPath,
}: SelectTextProps) => {
	const [state, dispatch] = useReducer(reducer, initialState)
	const { isSignedIn } = useUser()
	const { addVocabularyItem } = useUserDataStore()
	const checkMutation = useCheckVocabularyEntry()
	const _updateMutation = useUpdateVocabularyEntry()

	const closeAndReset = () => {
		dispatch({ type: 'CLOSE_DIALOG' })
		dispatch({ type: 'RESET' })
	}

	useEffect(() => {
		const targetContainer =
			document.getElementById(containerId ?? DEFAULT_CONTAINER_ID) ?? undefined

		if (!targetContainer) {
			return
		}

		const onSelectStart = () => {
			dispatch({ type: 'RESET' })
		}

		const onSelectEnd = () => {
			if (!targetContainer) {
				dispatch({ type: 'RESET' })
				return
			}

			const activeSelection = document.getSelection()
			if (!activeSelection || activeSelection.isCollapsed) {
				dispatch({ type: 'RESET' })
				return
			}

			const { anchorNode, focusNode } = activeSelection
			if (
				!anchorNode ||
				!focusNode ||
				!targetContainer.contains(anchorNode) ||
				!targetContainer.contains(focusNode)
			) {
				dispatch({ type: 'RESET' })
				return
			}

			const range = activeSelection.getRangeAt(0)
			const startLine = findLineElement(range.startContainer)
			const endLine = findLineElement(range.endContainer)

			if (!startLine || !endLine || startLine !== endLine) {
				dispatch({ type: 'RESET' })
				return
			}

			if (
				range.startContainer.nodeType !== Node.TEXT_NODE ||
				range.endContainer.nodeType !== Node.TEXT_NODE
			) {
				dispatch({ type: 'RESET' })
				return
			}

			if (range.startContainer !== range.endContainer) {
				dispatch({ type: 'RESET' })
				return
			}

			const textNode = range.startContainer as Text
			const start = Math.min(range.startOffset, range.endOffset)
			const end = Math.max(range.startOffset, range.endOffset)

			const word = expandToFullWords(textNode.wholeText, start, end)
			if (!word) {
				dispatch({ type: 'RESET' })
				return
			}

			if (word.length > MAX_SELECTION_LENGTH) {
				toast.error('请选择更短的片段')
				dispatch({ type: 'RESET' })
				return
			}

			dispatch({
				type: 'SET_SELECTION',
				payload: {
					word,
					line: startLine.dataset.lineText?.trim() ?? textNode.wholeText.trim(),
					lineNumber: Number.isNaN(Number(startLine.dataset.lineIndex))
						? null
						: Number(startLine.dataset.lineIndex),
				},
			})
		}

		targetContainer.addEventListener('selectstart', onSelectStart)
		targetContainer.addEventListener('pointerup', onSelectEnd)

		return () => {
			targetContainer.removeEventListener('selectstart', onSelectStart)
			targetContainer.removeEventListener('pointerup', onSelectEnd)
		}
	}, [containerId])

	useEffect(() => {
		if (!state.selection) {
			return
		}

		const { word, line } = state.selection

		let cancelled = false

		const fetchResult = async () => {
			dispatch({ type: 'SET_DUPLICATE_CHECKING', payload: true })
			dispatch({ type: 'SET_DUPLICATE_ERROR', payload: null })
			dispatch({ type: 'SET_DUPLICATE_EXISTS', payload: false })

			if (isSignedIn && songId && state.selection) {
				try {
					const result = await checkMutation.mutateAsync({
						word: state.selection.word,
						line: state.selection.line,
						lineNumber: state.selection.lineNumber,
						songId,
					})

					if (cancelled) {
						return
					}

					const exists = result.exists
					dispatch({
						type: 'SET_DUPLICATE_EXISTS',
						payload: exists,
						result: result.entry?.result,
					})
					if (exists && result.entry?.result) {
						dispatch({ type: 'SET_RESULT', payload: result.entry.result })
						dispatch({ type: 'SET_DUPLICATE_CHECKING', payload: false })
						return
					}
				} catch (error) {
					if (cancelled) {
						return
					}
					dispatch({
						type: 'SET_DUPLICATE_ERROR',
						payload: error instanceof Error ? error.message : '检查重复失败',
					})
					dispatch({ type: 'SET_DUPLICATE_EXISTS', payload: false })
					dispatch({ type: 'SET_DUPLICATE_CHECKING', payload: false })
					return
				}
			}

			let markdownString = ''

			try {
				markdownString = await learnWordInLine(word, line)
			} catch (error) {
				if (cancelled) {
					return
				}
				dispatch({
					type: 'SET_DUPLICATE_ERROR',
					payload: error instanceof Error ? error.message : 'AI 解释生成失败',
				})
				dispatch({ type: 'SET_DUPLICATE_CHECKING', payload: false })
				return
			}

			if (cancelled) {
				return
			}

			dispatch({ type: 'SET_RESULT', payload: markdownString })
			dispatch({ type: 'SET_DUPLICATE_CHECKING', payload: false })
		}

		dispatch({ type: 'SET_RESULT', payload: '' })
		fetchResult()

		return () => {
			cancelled = true
		}
	}, [state.selection, songId, isSignedIn, checkMutation.mutateAsync])

	const handleAddToVocabulary = async () => {
		if (!state.selection || !state.result) {
			toast.error('等待结果生成后再加入生词本')
			return
		}

		if (!songId || !songPath) {
			toast.error('缺少歌曲信息，无法加入生词本')
			return
		}

		if (state.duplicateExists) {
			toast.error('该片段已经在生词本中了')
			return
		}

		const normalizedSongPath = normalizeSongPath(songPath)

		dispatch({ type: 'SET_SAVING', payload: true })

		try {
			await addVocabularyItem({
				word: state.selection.word,
				line: state.selection.line,
				lineNumber: state.selection.lineNumber,
				result: state.result,
				songId,
				songPath: normalizedSongPath as string,
			})
			dispatch({ type: 'SET_DUPLICATE_EXISTS', payload: true })
			toast.success('已加入我的生词本')
		} catch (error) {
			// Error is already handled by the store
			toast.error(
				error instanceof Error ? error.message : '加入生词本失败，请稍后重试',
			)
		} finally {
			dispatch({ type: 'SET_SAVING', payload: false })
		}
	}

	const handleRefetch = async () => {
		if (!state.selection) {
			return
		}

		const hadExistingEntry = state.duplicateExists

		dispatch({ type: 'SET_RESULT', payload: '' })
		dispatch({ type: 'SET_DUPLICATE_CHECKING', payload: true })
		dispatch({ type: 'SET_DUPLICATE_ERROR', payload: null })
		dispatch({ type: 'SET_DUPLICATE_EXISTS', payload: false })

		let markdownString = ''

		try {
			markdownString = await learnWordInLine(
				state.selection.word,
				state.selection.line,
			)
		} catch (error) {
			dispatch({
				type: 'SET_DUPLICATE_ERROR',
				payload: error instanceof Error ? error.message : 'AI 解释生成失败',
			})
			dispatch({ type: 'SET_DUPLICATE_CHECKING', payload: false })
			return
		}

		dispatch({ type: 'SET_RESULT', payload: markdownString })
		dispatch({ type: 'SET_DUPLICATE_CHECKING', payload: false })

		if (hadExistingEntry && songId && songPath) {
			const _normalizedSongPath = normalizeSongPath(songPath)

			try {
				// Find the entry ID - we need to get it from the store or API
				// For now, we'll skip the update since we don't have the entry ID
				// This would need to be implemented by storing the entry ID when checking duplicates
				console.log('Would update existing entry with new result')
				toast.success('已重新获取AI解释')
			} catch (error) {
				toast.error(error instanceof Error ? error.message : '更新生词本失败')
			}
		}
	}

	const previewText = state.selection
		? state.selection.word.length > 20
			? `${state.selection.word.slice(0, 20)}...`
			: state.selection.word
		: ''

	return (
		<Dialog open={state.openDialog}>
			{state.selection && (
				<DialogContent className="sm:max-w-lg" showCloseButton={false}>
					<DialogHeader className="text-left">
						<DialogTitle>
							<span className="select-none italic text-xs text-muted-foreground font-light">
								word{previewText.includes(' ') ? 's' : ''}:
							</span>{' '}
							{previewText}
						</DialogTitle>
						<DialogDescription>
							<span className="select-none italic text-xs text-muted-foreground font-light">
								{`in line${
									state.selection.lineNumber
										? ` ${state.selection.lineNumber}`
										: ''
								}:`}
							</span>{' '}
							{state.selection.line}
						</DialogDescription>
					</DialogHeader>
					<div>
						{state.result ? (
							<Markdown>{state.result}</Markdown>
						) : (
							<div className="flex items-center justify-center">
								<Spinner />
								AI working...
							</div>
						)}
						{state.duplicateChecking && (
							<p className="text-xs text-muted-foreground">
								正在检查是否已存在
							</p>
						)}
						{state.duplicateExists && (
							<p className="text-xs text-destructive">该片段已经在生词本中了</p>
						)}
						{state.duplicateError && (
							<p className="text-xs text-destructive">{state.duplicateError}</p>
						)}
					</div>
					<DialogFooter className="gap-2 w-full flex-row justify-between sm:justify-between">
						{isSignedIn ? (
							<Button
								type="button"
								variant="outline"
								onClick={handleRefetch}
								disabled={!state.result || state.isSaving}
								className="w-36"
							>
								<RefreshCwIcon />
								重新询问AI
							</Button>
						) : (
							<div />
						)}

						<div className="flex items-center justify-end gap-2">
							{isSignedIn ? (
								<Button
									type="button"
									className=""
									onClick={handleAddToVocabulary}
									disabled={
										!state.result ||
										state.isSaving ||
										state.duplicateExists ||
										state.duplicateChecking
									}
								>
									<BookPlusIcon />
									{state.isSaving
										? '加入中...'
										: state.duplicateExists
											? '已经加入生词本'
											: '加入我的生词本'}
								</Button>
							) : (
								<SignInButton mode="modal">
									<Button onClick={closeAndReset}>登录开启生词本</Button>
								</SignInButton>
							)}
							<DialogClose asChild>
								<Button
									type="button"
									variant="secondary"
									onClick={closeAndReset}
								>
									Close
								</Button>
							</DialogClose>
						</div>
					</DialogFooter>
				</DialogContent>
			)}
		</Dialog>
	)
}
