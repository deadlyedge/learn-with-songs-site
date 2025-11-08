import type { Prisma, Song } from '@/generated/prisma/client'
import type {
	GeniusSongInfo,
	GeniusSongInfoRaw,
} from '@/types/songsAPI'
import { fetchGeniusSongDetails } from './genius'
import { prisma } from './prisma'
import { normalizeSongInfo } from './dom-to-markdown'

const normalizeGeniusId = (value: number | string): string | null => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.trunc(value).toString()
	}

	const candidate = String(value ?? '').trim()
	return /^\d+$/.test(candidate) ? candidate : null
}

const toGeniusSongInfo = (
	value: Prisma.JsonValue | null
): GeniusSongInfo | null => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}

	return normalizeSongInfo(value as GeniusSongInfoRaw)
}

const parseReleaseDate = (info: GeniusSongInfo): Date | null => {
	if (info.release_date) {
		const parsed = new Date(info.release_date)
		if (!Number.isNaN(parsed.getTime())) {
			return parsed
		}
	}

	if (info.release_date_for_display) {
		const parsed = new Date(info.release_date_for_display)
		if (!Number.isNaN(parsed.getTime())) {
			return parsed
		}
	}

	return null
}

const buildUpdateData = (
	song: Song,
	info: GeniusSongInfo
): Prisma.SongUpdateInput => {
	const data: Prisma.SongUpdateInput = {
		details: info as unknown as Prisma.InputJsonValue,
		detailsFetchedAt: new Date(),
	}

	if (info.title) {
		data.title = info.title
	}

	const primaryArtistName = info.primary_artist?.name ?? info.artist_names
	if (primaryArtistName) {
		data.artist = primaryArtistName
	}

	const albumName = info.album?.name ?? info.album?.full_title
	if (albumName) {
		data.album = albumName
	}

	const releaseDate = parseReleaseDate(info)
	if (releaseDate) {
		data.releaseDate = releaseDate
	}

	if (info.song_art_image_url) {
		data.artworkUrl = info.song_art_image_url
	} else if (info.header_image_url) {
		data.artworkUrl = info.header_image_url
	}

	if (info.language) {
		data.language = info.language
	}

	if (info.url) {
		data.url = info.url
	}

	if (info.path) {
		data.geniusPath = info.path
	}

	if (!song.geniusId && info.id) {
		data.geniusId = String(info.id)
	}

	return data
}

export async function ensureSongDetails(
	song: Song
): Promise<{ song: Song; details: GeniusSongInfo | null }> {
	const cached = toGeniusSongInfo(song.details)

	if (cached) {
		return { song, details: cached }
	}

	if (!song.geniusId) {
		return { song, details: null }
	}

	const rawDetails = await fetchGeniusSongDetails(song.geniusId)
	const details = normalizeSongInfo(rawDetails)
	const updateData = buildUpdateData(song, details)

	const updatedSong = await prisma.song.update({
		where: { id: song.id },
		data: updateData,
	})

	return {
		song: updatedSong,
		details,
	}
}

export async function ensureSongDetailsByGeniusId(
	geniusId: number | string
): Promise<{ song: Song; details: GeniusSongInfo | null } | null> {
	const normalized = normalizeGeniusId(geniusId)

	if (!normalized) {
		throw new Error(`Invalid Genius song id: ${geniusId}`)
	}

	const song = await prisma.song.findUnique({
		where: { geniusId: normalized },
	})

	if (!song) {
		return null
	}

	return ensureSongDetails(song)
}
