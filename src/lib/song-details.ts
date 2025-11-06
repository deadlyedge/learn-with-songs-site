import type { Prisma, Song } from '@/generated/prisma/client'
import type {
	Annotation,
	AnnotationRaw,
	GeniusDomNode,
	GeniusSongInfo,
	GeniusSongInfoRaw,
} from '@/types'
import { fetchGeniusSongDetails } from './genius'
import { prisma } from './prisma'

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
const renderChildrenToMarkdown = (children?: Array<string | GeniusDomNode>) => {
	if (!children || children.length === 0) {
		return ''
	}

	return children
		.map((child) => {
			if (typeof child === 'string') {
				return child
			}

			return domNodeToMarkdown(child)
		})
		.join('')
}

const domNodeToMarkdown = (node: GeniusDomNode): string => {
	const tag = node.tag?.toLowerCase() ?? 'span'
	const content = renderChildrenToMarkdown(node.children)
	const trimmed = content.trim()

	switch (tag) {
		case 'root':
		case 'div':
		case 'section':
			return content
		case 'p':
			return trimmed ? `${trimmed}\n\n` : '\n'
		case 'br':
			return '\n'
		case 'strong':
		case 'b':
			return trimmed ? `**${trimmed}**` : ''
		case 'em':
		case 'i':
			return trimmed ? `*${trimmed}*` : ''
		case 'u':
			return trimmed ? `_${trimmed}_` : ''
		case 'code':
			return trimmed ? `\`${trimmed}\`` : ''
		case 'pre':
			return trimmed ? `\n\`\`\`\n${trimmed}\n\`\`\`\n\n` : '\n'
		case 'a': {
			const href = node.attributes?.href ?? node.data?.api_path ?? ''
			const label = trimmed || href

			return href ? `[${label}](${href})` : label
		}
		case 'blockquote': {
			const lines = trimmed
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.map((line) => `> ${line}`)
				.join('\n')
			return lines ? `${lines}\n\n` : ''
		}
		case 'ul': {
			const items = (node.children ?? []).map((child) => {
				const value =
					typeof child === 'string'
						? child.trim()
						: domNodeToMarkdown(child).trim()

				return value ? `- ${value.replace(/\n+/g, ' ')}` : ''
			})
			return `${items.filter(Boolean).join('\n')}\n\n`
		}
		case 'ol': {
			let index = 1
			const items = (node.children ?? []).map((child) => {
				const value =
					typeof child === 'string'
						? child.trim()
						: domNodeToMarkdown(child).trim()

				if (!value) {
					return ''
				}

				const line = `${index}. ${value.replace(/\n+/g, ' ')}`
				index += 1
				return line
			})
			return `${items.filter(Boolean).join('\n')}\n\n`
		}
		case 'li': {
			const value = renderChildrenToMarkdown(node.children).trim()
			return value
		}
		default: {
			if (tag.startsWith('h')) {
				const level = Number.parseInt(tag.slice(1), 10)
				const prefix = '#'.repeat(Number.isFinite(level) ? level : 1)
				return trimmed ? `${prefix} ${trimmed}\n\n` : ''
			}

			return trimmed || ''
		}
	}
}

const convertDomToMarkdown = (dom?: GeniusDomNode | null): string | null => {
	if (!dom) {
		return null
	}

	const rendered = domNodeToMarkdown(dom).trim()
	return rendered.length > 0 ? rendered : null
}

const normalizeAnnotations = (
	annotations?: AnnotationRaw[] | null
): Annotation[] | undefined => {
	if (!annotations) {
		return undefined
	}

	if (annotations.length === 0) {
		return []
	}

	return annotations.map((annotation) => {
		const { body, ...rest } = annotation

		if (typeof body === 'string') {
			return { ...rest, body } satisfies Annotation
		}

		const markdown = convertDomToMarkdown(body?.dom)
		return {
			...rest,
			body: markdown,
		} satisfies Annotation
	})
}

const normalizeSongInfo = (raw: GeniusSongInfoRaw): GeniusSongInfo => {
	const cloned = JSON.parse(JSON.stringify(raw)) as GeniusSongInfoRaw

	const description = cloned.description
	cloned.description =
		typeof description === 'string'
			? description
			: convertDomToMarkdown(description?.dom)

	if (cloned.description_annotation) {
		cloned.description_annotation = {
			...cloned.description_annotation,
			annotations: normalizeAnnotations(cloned.description_annotation.annotations),
		}
	}

	return cloned as unknown as GeniusSongInfo
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
