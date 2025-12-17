'use client'

import { FormEvent, useState, useEffect, useRef } from 'react'
import { Spinner } from '../ui/spinner'
import { getSearchSuggestions } from '@/actions/suggestions'
import { useSearchStore } from '@/stores/search'
import { cn } from '@/lib/utils'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '../ui/input-group'
import { SearchIcon } from 'lucide-react'

// Debounce hook for search input
function useDebounce<T>(value: T, delay = 500): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value)

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)

		return () => {
			clearTimeout(handler)
		}
	}, [value, delay])

	return debouncedValue
}

export const InputWithSuggestions = () => {
	const {
		query,
		suggestions,
		selectedIndex,
		isPending,
		isExpanded,
		setQuery,
		setSuggestions,
		setSelectedIndex,
		setIsExpanded,
		handleSubmit,
		handleSuggestionSelect,
	} = useSearchStore()

	const inputRef = useRef<HTMLInputElement>(null)
	const debouncedQuery = useDebounce(query)

	// Fetch suggestions based on debounced query
	useEffect(() => {
		const fetchSuggestions = async () => {
			if (debouncedQuery.length >= 2) {
				try {
					const results = await getSearchSuggestions(debouncedQuery)
					setSuggestions(results)
					setSelectedIndex(-1)
				} catch (error) {
					console.error('Failed to fetch suggestions:', error)
					setSuggestions([])
					location.reload()
				}
			} else {
				setSuggestions([])
			}
		}

		fetchSuggestions()
	}, [debouncedQuery, setSelectedIndex, setSuggestions])

	const handleFocus = () => {
		setIsExpanded(true)
	}

	const handleBlur = () => {
		// Delay to allow clicking on suggestions
		setTimeout(() => {
			setIsExpanded(false)
		}, 100)
	}

	const handleSubmitForm = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const trimmed = query.trim()
		handleSubmit(trimmed)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!isExpanded || suggestions.length === 0) return

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				const nextIndex =
					selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0
				setSelectedIndex(nextIndex)
				break
			case 'ArrowUp':
				e.preventDefault()
				const prevIndex =
					selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1
				setSelectedIndex(prevIndex)
				break
			case 'Enter':
				if (selectedIndex >= 0) {
					e.preventDefault()
					handleSuggestionSelect(suggestions[selectedIndex])
				}
				break
			case 'Escape':
				setIsExpanded(false)
				setSelectedIndex(-1)
				break
		}
	}

	return (
		<form className="" onSubmit={handleSubmitForm}>
			<label className="sr-only" htmlFor="search">
				歌曲或艺人
			</label>
			<div className="relative w-full">
				<div className="h-12" />
				<div
					className={cn(
						'absolute top-0 left-1/2 -translate-x-1/2 w-full md:w-2xl border-2 rounded-3xl overflow-hidden transition-all duration-300',
						isExpanded ? 'bg-card border-primary shadow-lg' : 'border-border',
					)}>
					{/* Input area always present */}
					<InputGroup
						className={cn(
							'h-11 border-0',
							isExpanded ? 'border-b border-border' : 'hover:bg-card',
						)}>
						<InputGroupAddon>
							<SearchIcon className="h-4 w-4" />
						</InputGroupAddon>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								variant="secondary"
								className="rounded mr-2"
								disabled={isPending}
								type="submit">
								{isPending ? (
									<span className="flex items-center">
										搜索中 <Spinner />
									</span>
								) : (
									'搜索'
								)}
							</InputGroupButton>
						</InputGroupAddon>
						<InputGroupInput
							id="search"
							ref={inputRef}
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={handleKeyDown}
							onFocus={handleFocus}
							onBlur={handleBlur}
							placeholder="输入歌曲或艺人名称..."
							className="h-11"
						/>
					</InputGroup>

					{/* Suggestions area shown when expanded */}
					{isExpanded && (
						<div className="max-h-60 overflow-y-auto">
							{suggestions.length > 0 ? (
								suggestions.map((suggestion, index) => (
									<div
										key={`${suggestion.text}-${suggestion.type}-${index}`}
										onMouseDown={() => handleSuggestionSelect(suggestion)}
										className={cn(
											'px-4 py-2 cursor-pointer hover:bg-muted transition-colors duration-150',
											index === selectedIndex ? 'bg-muted' : '',
										)}
										role="option"
										aria-selected={index === selectedIndex}>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-2">
												<span className="font-medium">{suggestion.text}</span>
												<span
													className={`text-xs px-2 py-0.5 rounded-full ${
														suggestion.type === 'song'
															? 'bg-blue-100 text-blue-800'
															: suggestion.type === 'artist'
																? 'bg-green-100 text-green-800'
																: 'bg-purple-100 text-purple-800'
													}`}>
													{suggestion.type}
												</span>
											</div>
											{suggestion.metadata && (
												<div className="text-xs text-muted-foreground ml-2">
													{suggestion.metadata.artist && (
														<span>by {suggestion.metadata.artist}</span>
													)}
													{suggestion.metadata.album && (
														<span>
															{suggestion.metadata.artist ? ' • ' : ''}from{' '}
															{suggestion.metadata.album}
														</span>
													)}
												</div>
											)}
										</div>
									</div>
								))
							) : query ? (
								<div className="px-4 py-2 text-muted-foreground">
									没有找到匹配的结果
								</div>
							) : (
								<div className="px-4 py-2 text-muted-foreground">
									请输入歌曲或艺人名称以搜索
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</form>
	)
}
