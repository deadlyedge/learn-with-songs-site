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

export const FEATURED_SONGS_COUNT = 8
export const FEATURED_SONGS_RANDOM_SAMPLE_SIZE = 20

export const CACHE_TTL_MS = 1000 * 60 * 60 * 6 // 6 hours cache window
export const MIN_CACHE_RESULTS = 3

// similarity control
export const SIMILARITY_HIGH_THRESHOLD = 0.45
export const SIMILARITY_LOW_THRESHOLD = 0.35

// search results control
export const MAX_SEARCH_RESULTS = 10
export const SEARCH_DEBOUNCE_DELAY = 300
export const SEARCH_SUGGESTIONS_LIMIT = 6

// filters in collection page
export const FILTER_SETTING = [
	{ show: 'title', key: 'title' },
	{ show: 'artist', key: 'artist' },
	{ show: 'release', key: 'releaseDate' },
] as const
