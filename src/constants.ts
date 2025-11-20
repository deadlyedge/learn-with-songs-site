export const GENIUS_API_BASE = 'https://api.genius.com'

export const DEFAULT_LYRICS_ENDPOINT = 'https://lyrics.zick.me/lyrics'

export const DB_REFETCH_STRATEGY = {
	SONG: 'year',
	SONG_DETAILS: 'half-year',
	LYRICS: 'half-year',
	REFERENTS: '3months',
} as const

export type DbRefetchResource = keyof typeof DB_REFETCH_STRATEGY
export type DbRefetchStrategy = (typeof DB_REFETCH_STRATEGY)[DbRefetchResource]

export const DEFAULT_CONTAINER_ID = 'lyrics'
export const MAX_SELECTION_LENGTH = 24

export const FEATURED_SONGS_COUNT = 6
export const FEATURED_SONGS_RANDOM_SAMPLE_SIZE = 20

