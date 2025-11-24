'use client'

import { FormEvent, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '../ui/spinner'
import { getSearchSuggestions } from '@/actions/suggestions'
// import type { Suggestion } from '@/types'
import { useSearchStore } from '@/stores/searchStore'

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
		showSuggestions,
		isPending,
		setQuery,
		setSuggestions,
		setSelectedIndex,
		setShowSuggestions,
		handleSubmit,
		handleSuggestionSelect,
	} = useSearchStore()

	const debouncedQuery = useDebounce(query)

	// Fetch suggestions based on debounced query
	useEffect(() => {
		const fetchSuggestions = async () => {
			if (debouncedQuery.length >= 2) {
				try {
					const results = await getSearchSuggestions(debouncedQuery)
					setSuggestions(results)
					setShowSuggestions(results.length > 0)
					setSelectedIndex(-1)
				} catch (error) {
					console.error('Failed to fetch suggestions:', error)
					setSuggestions([])
					setShowSuggestions(false)
				}
			} else {
				setSuggestions([])
				setShowSuggestions(false)
			}
		}

		fetchSuggestions()
	}, [debouncedQuery, setSelectedIndex, setShowSuggestions, setSuggestions])

	const handleSubmitForm = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const trimmed = query.trim()
		handleSubmit(trimmed)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!showSuggestions || suggestions.length === 0) return

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				const nextIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0
				setSelectedIndex(nextIndex)
				break
			case 'ArrowUp':
				e.preventDefault()
				const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1
				setSelectedIndex(prevIndex)
				break
			case 'Enter':
				if (selectedIndex >= 0) {
					e.preventDefault()
					handleSuggestionSelect(suggestions[selectedIndex])
				}
				break
			case 'Escape':
				setShowSuggestions(false)
				setSelectedIndex(-1)
				break
		}
	}

	return (
		<form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmitForm}>
			<label className="sr-only" htmlFor="search">
				歌曲或艺人
			</label>
			<div className="relative flex-1">
				<Input
					id="search"
					placeholder="输入歌曲或艺人名称..."
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
					onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
					className="h-11"
				/>

				{/* Autocomplete Suggestions */}
				{showSuggestions && suggestions.length > 0 && (
					<ul
						className="mt-2 bg-background border rounded-md shadow-sm absolute z-10 w-full max-h-60 overflow-y-auto"
						role="listbox"
					>
						{suggestions.map((suggestion, index) => (
							<li
								key={`${suggestion.text}-${suggestion.type}-${index}`}
								className={`px-4 py-2 cursor-pointer hover:bg-muted ${
									index === selectedIndex ? 'bg-muted' : ''
								}`}
								onClick={() => handleSuggestionSelect(suggestion)}
								onMouseEnter={() => setSelectedIndex(index)}
								role="option"
								aria-selected={index === selectedIndex}
							>
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
							</li>
						))}
					</ul>
				)}
			</div>
			<Button type="submit" className="h-11 px-6" disabled={isPending}>
				{isPending ? (
					<span className="flex items-center">
						搜索中 <Spinner />
					</span>
				) : (
					'搜索'
				)}
			</Button>
		</form>
	)
}
