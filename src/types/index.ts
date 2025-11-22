// ===== 数据库查询结果类型 (完全基于Prisma生成的类型) =====

// Prisma导入 - 所有数据库相关类型都应当从这里来
import { Prisma } from '@/generated/prisma'

// ===== 外部API响应类型 (规范化的API类型定义) =====

// 从 referentsAPI导出的规范类型
export type {
	Referent,
	Range,
	Annotatable,
	Annotation as ReferentAnnotation,
	Author,
	// User as GeniusUser,
	AvatarImages,
	AvatarImage,
	BoundingBox,
	UserCurrentUserMetadata,
	AnnotationCurrentUserMetadata,
	DomNode as ReferentDomNode,
} from './referentsAPI'

// 从 songsAPI导出的规范类型
export type {
	GeniusSongInfo,
	SongStats,
	CurrentUserMetadata,
	Album as SongAlbum,
	Artist as SongArtist,
	Performance,
	MediaItem,
	RelatedSong,
	SongRelationship,
	TranslationSong,
	DescriptionAnnotation,
	DescriptionAnnotationRaw,
	GeniusSongInfoRaw,
	// User as GeniusSongUser, // 避免与 GeniusUser 冲突
	AnnotationAuthor,
	GeniusDomNode,
	AnnotationRaw,
	Annotation as SongAnnotation,
} from './songsAPI'

export type {
	VocabularyEntryWithFullSong,
	VocabularyEntryWithSongData,
	VocabularyPayload,
	DuplicateOptions,
	VocabularyExistsPayload,
	VocabularyEntryData,
} from './vocabulary'

// ===== Genius API专用类型 (完全基于API响应的规范类型) =====

// Genius搜索结果中的hit类型
export type GeniusSongHit = {
	result?: {
		id: number
		title: string
		artist_names?: string
		language?: string
		lyrics_state?: string
		path?: string
		song_art_image_thumbnail_url?: string
		song_art_image_url?: string
		stats?: {
			pageviews?: number
			accepted_annotations?: number
			contributors?: number
			iq_earners?: number
			transcribers?: number
			unreviewed_annotations?: number
			verified_annotations?: number
			concurrents?: number
			hot?: boolean
		}
		url?: string
		primary_artist?: {
			api_path?: string
			header_image_url?: string
			id?: number
			image_url?: string
			is_meme_verified?: boolean
			is_verified?: boolean
			name?: string
			url?: string
		}
		primary_album?: {
			api_path?: string
			cover_art_url?: string
			full_title?: string
			id?: number
			name?: string | null
			primary_artist_names?: string
			release_date_for_display?: string | null
			url?: string
		}
		release_date_for_display?: string
	}
}

// 从Genius搜索API返回的标准化歌曲数据格式
export type GeniusSongResponse = {
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

// Song表基础查询类型 (搜索用的最简格式)
export type SongSearchResult = Prisma.SongGetPayload<{
	select: {
		id: true
		title: true
		artist: true
		album: true
		geniusPath: true
		releaseDate: true
		artworkUrl: true
		language: true
		url: true
	}
}>

// ===== 前端显示专用类型 =====

// FeaturedSong (基于业务逻辑，不是数据库)
export type FeaturedSong = {
	id: string
	title: string
	artist: string
	album?: string
	artworkUrl?: string
	pageviews: number
	geniusPath: string
}

// CollectionSong (基于业务逻辑，不是数据库)
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

// Song页面头部内容 (基于业务逻辑，不是数据库)
export type HeaderContents = {
	title: string
	artist: string
	album: string
	releaseDate: string
	description: string
	language: string
	contributors: string
	pageviews: string
	url: string
	artworkUrl: string
	backgroundColor: string[]
}

// ===== Genius引用数据类型 =====

// 标准化后的注解类型 (完全Type Safe)
export type NormalizedReferentAnnotation = {
	id: number
	body: string | null
	url: string
	votesTotal: number
	authors: Array<{
		id: number
		name?: string
		login?: string
	}>
	verified: boolean
	source?: string | null
}

// 标准化后的引用类型 (完全Type Safe)
export type NormalizedReferent = {
	id: number
	fragment: string
	classification: string
	rangeContent?: string
	path: string
	url: string
	annotations: NormalizedReferentAnnotation[]
}

// ===== 应用级工具类型 =====

// 搜索响应格式 (标准化API响应)
export type SongSearchResponse = {
	source: 'database' | 'genius' | 'mixed'
	songs: SearchSongDTO[]
	canSearchGenius: boolean
	performedGenius: boolean
	autoContinued: boolean
}

// 搜索结果中的Song DTO格式
export type SearchSongDTO = {
	id: string
	title: string
	artist: string
	album: string | null
	releaseDate: string | null
	artworkUrl: string | null
	language: string | null
	url: string | null
	path: string | null
}
