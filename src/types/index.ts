export type NormalizedSong = {
	geniusId: number
	title: string
	artist: string
	album?: string
	releaseDate?: string
	artworkUrl?: string
	language?: string
	url?: string
	path?: string
}

export type GeniusSongHit = {
	result: {
		id: number
		title: string
		primary_artist: {
			name: string
		}
		primary_album?: {
			name?: string
		}
		release_date_for_display?: string
		song_art_image_url?: string
		language?: string
		url?: string
		path?: string
	}
}

export type FeaturedSong = {
	id: string
	title: string
	artist: string
	album?: string
	artworkUrl?: string
	pageviews: number
	geniusPath: string
}

export type CollectionSong = {
	id: string
	title: string
	artist: string
	album?: string | null
	artworkUrl?: string | null
	releaseDate?: string | null
	geniusPath?: string | null
	url?: string | null
}
