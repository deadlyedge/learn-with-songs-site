import { Prisma } from '@/generated/prisma/client'

export type VocabularyEntryWithFullSong = Prisma.VocabularyEntryGetPayload<{
	select: {
		id: true
		word: true
		line: true
		lineNumber: true
		result: true
		songPath: true
		createdAt: true
		updatedAt: true
		mastered: true
		masteredAt: true
		reviewCount: true
		song: {
			select: {
				id: true
				title: true
				artworkUrl: true
			}
		}
	}
}>

export type VocabularyEntryWithSongData = {
	id: string
	word: string
	line: string
	lineNumber: number | null
	result: string
	songPath: string
	songTitle: string
	songArtworkUrl: string | null
	mastered: boolean
	songId: string
}

export type VocabularyPayload = {
	word: string
	line: string
	lineNumber: number | null
	result: string
	songId: string
	songPath: string
}

export type DuplicateOptions = {
	userId: string
	word: string
	line: string
	lineNumber: number | null
	songId: string
}

export type VocabularyExistsPayload = {
	word: string
	line: string
	lineNumber: number | null
	songId: string
}

export type VocabularyEntryData = {
	word: string
	line: string
	lineNumber: number | null
	result: string
	songId: string
	songPath: string
}
