import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CollectionSong } from '@/types'

export function useUserCollections() {
	return useQuery({
		queryKey: ['collections'],
		queryFn: async (): Promise<CollectionSong[]> => {
			const res = await fetch('/api/collections')
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to fetch collections')
			}
			const data = await res.json()
			return data.collections
		},
	})
}

export function useAddToCollection() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (songId: string) => {
			const res = await fetch('/api/collections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ songId }),
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to add to collection')
			}
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['collections'] })
		},
	})
}

export function useRemoveFromCollection() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (songId: string) => {
			const res = await fetch(`/api/collections/${songId}`, {
				method: 'DELETE',
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to remove from collection')
			}
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['collections'] })
		},
	})
}

export function useIsSongCollected(songId: string) {
	return useQuery({
		queryKey: ['collections', 'is-collected', songId],
		queryFn: async (): Promise<boolean> => {
			const res = await fetch(`/api/collections/${songId}`)
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to check collection status')
			}
			const data = await res.json()
			return data.isCollected
		},
		enabled: !!songId,
	})
}
