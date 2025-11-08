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

// Types generated from documents/songsAPIRespone.md (Genius /songs/:id response)
export type GeniusSongInfo = {
	id: number
	annotation_count?: number
	api_path?: string
	apple_music_id?: string | null
	apple_music_player_url?: string | null
	artist_names?: string
	description?: string | null
	embed_content?: string
	full_title?: string
	header_image_thumbnail_url?: string
	header_image_url?: string
	language?: string
	lyrics_owner_id?: number | null
	lyrics_state?: string
	path?: string
	primary_artist_names?: string
	pyongs_count?: number | null
	recording_location?: string | null
	relationships_index_url?: string | null
	release_date?: string | null
	release_date_for_display?: string
	release_date_with_abbreviated_month_for_display?: string
	song_art_image_thumbnail_url?: string
	song_art_image_url?: string
	stats?: SongStats
	title?: string
	title_with_featured?: string
	url?: string
	current_user_metadata?: CurrentUserMetadata
	song_art_primary_color?: string
	song_art_secondary_color?: string
	song_art_text_color?: string
	album?: Album
	custom_performances?: Performance[]
	description_annotation?: DescriptionAnnotation | null
	featured_artists?: Artist[]
	lyrics_marked_complete_by?: User | null
	lyrics_marked_staff_approved_by?: User | null
	media?: MediaItem[]
	primary_artist?: Artist
	primary_artists?: Artist[]
	producer_artists?: Artist[]
	song_relationships?: SongRelationship[]
	translation_songs?: TranslationSong[]
	verified_annotations_by?: string[]
	verified_contributors?: string[]
	verified_lyrics_by?: string[]
	writer_artists?: Artist[]
}

export type SongStats = {
	accepted_annotations?: number
	contributors?: number
	iq_earners?: number
	transcribers?: number
	unreviewed_annotations?: number
	verified_annotations?: number
	concurrents?: number
	hot?: boolean
	pageviews?: number
}

export type CurrentUserMetadata = {
	permissions?: string[]
	excluded_permissions?: string[]
	interactions?: Record<string, boolean | null>
	relationships?: Record<string, string>
	iq_by_action?: Record<string, string>
}

export type Album = {
	api_path?: string
	cover_art_url?: string
	full_title?: string
	id?: number
	name?: string
	primary_artist_names?: string
	release_date_for_display?: string
	url?: string
	artist?: Artist
	primary_artists?: Artist[]
}

export type Artist = {
	api_path?: string
	header_image_url?: string
	id?: number
	image_url?: string
	is_meme_verified?: boolean
	is_verified?: boolean
	name?: string
	url?: string
	iq?: number
}

export type Performance = {
	label?: string
	artists?: Artist[]
}

export type User = {
	api_path?: string
	avatar?: {
		tiny?: { url?: string; bounding_box?: { width?: number; height?: number } }
		thumb?: { url?: string; bounding_box?: { width?: number; height?: number } }
		small?: { url?: string; bounding_box?: { width?: number; height?: number } }
		medium?: {
			url?: string
			bounding_box?: { width?: number; height?: number }
		}
	}
	header_image_url?: string
	human_readable_role_for_display?: string
	id?: number
	iq?: number
	login?: string
	name?: string
	role_for_display?: string
	url?: string
	current_user_metadata?: CurrentUserMetadata
}

export type MediaItem = {
	provider?: string
	start?: number
	type?: string
	url?: string
	native_uri?: string
}

export type RelatedSong = {
	id?: number
	annotation_count?: number
	api_path?: string
	artist_names?: string
	full_title?: string
	header_image_thumbnail_url?: string
	header_image_url?: string
	lyrics_owner_id?: number | null
	lyrics_state?: string
	path?: string
	primary_artist_names?: string
	pyongs_count?: number | null
	relationships_index_url?: string | null
	release_date_components?: {
		year?: number
		month?: number | null
		day?: number | null
	} | null
	release_date_for_display?: string | null
	release_date_with_abbreviated_month_for_display?: string | null
	song_art_image_thumbnail_url?: string
	song_art_image_url?: string
	stats?: Partial<SongStats>
	title?: string
	title_with_featured?: string
	url?: string
	featured_artists?: Artist[]
	primary_artist?: Artist
	primary_artists?: Artist[]
}

export type SongRelationship = {
	relationship_type?: string
	type?: string
	url?: string | null
	songs?: RelatedSong[]
}

export type TranslationSong = {
	api_path?: string
	id?: number
	language?: string
	lyrics_state?: string
	path?: string
	title?: string
	url?: string
}

export type DescriptionAnnotation = {
	_type?: string
	annotator_id?: number
	annotator_login?: string
	api_path?: string
	classification?: string
	fragment?: string
	id?: number
	is_description?: boolean
	path?: string
	range?: { content?: string }
	song_id?: number
	url?: string
	verified_annotator_ids?: number[]
	annotatable?: Annotatable
	annotations?: Annotation[]
}

export type Annotatable = {
	api_path?: string
	client_timestamps?: {
		updated_by_human_at?: number
		lyrics_updated_at?: number
	}
	context?: string
	id?: number
	image_url?: string
	link_title?: string
	title?: string
	type?: string
	url?: string
}

export type Annotation = {
	api_path?: string
	body?: string | null
	comment_count?: number
	community?: boolean
	custom_preview?: string | null
	has_voters?: boolean
	id?: number
	pinned?: boolean
	share_url?: string
	source?: string | null
	state?: string
	url?: string
	verified?: boolean
	votes_total?: number
	current_user_metadata?: CurrentUserMetadata
	authors?: AnnotationAuthor[]
	cosigned_by?: Array<Record<string, unknown>>
	rejection_comment?: string | null
	verified_by?: number | null
}

export type AnnotationAuthor = {
	attribution?: number
	pinned_role?: string | null
	user?: User
}

export type GeniusDomNode = {
	tag?: string
	attributes?: Record<string, string>
	data?: Record<string, string>
	children?: Array<string | GeniusDomNode>
}

export type AnnotationRaw = Omit<Annotation, 'body'> & {
	body?: string | { dom?: GeniusDomNode } | null
}

export type DescriptionAnnotationRaw = Omit<
	DescriptionAnnotation,
	'annotations'
> & {
	annotations?: AnnotationRaw[] | null
}

export type GeniusSongInfoRaw = Omit<
	GeniusSongInfo,
	'description' | 'description_annotation'
> & {
	description?: string | { dom?: GeniusDomNode } | null
	description_annotation?: DescriptionAnnotationRaw | null
}
