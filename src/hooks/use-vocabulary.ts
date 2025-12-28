import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { VocabularyEntryWithSongData } from '@/types'

export function useUserVocabulary() {
	return useQuery({
		queryKey: ['vocabulary'],
		queryFn: async (): Promise<VocabularyEntryWithSongData[]> => {
			const res = await fetch('/api/vocabulary')
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to fetch vocabulary')
			}
			const data = await res.json()
			return data.vocabulary
		},
	})
}

export function useAddVocabularyEntry() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (payload: {
			word: string
			line: string
			lineNumber?: number | null
			result: string
			songId: string
			songPath: string
		}) => {
			const res = await fetch('/api/vocabulary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to add vocabulary entry')
			}
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
		},
	})
}

export function useUpdateVocabularyEntry() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			result,
			songPath,
		}: {
			id: string
			result: string
			songPath: string
		}) => {
			const res = await fetch(`/api/vocabulary/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ result, songPath }),
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to update vocabulary entry')
			}
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
		},
	})
}

export function useToggleMastered() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/vocabulary/${id}/mastered`, {
				method: 'PATCH',
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to toggle mastered state')
			}
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
		},
	})
}

export function useCheckVocabularyEntry() {
	return useMutation({
		mutationFn: async (payload: {
			word: string
			line: string
			lineNumber?: number | null
			songId: string
		}) => {
			const res = await fetch('/api/vocabulary', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to check vocabulary entry')
			}
			return res.json()
		},
	})
}
