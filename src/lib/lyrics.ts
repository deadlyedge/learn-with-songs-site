import { DEFAULT_LYRICS_ENDPOINT } from "@/constants"

export async function fetchLyricsFromPath(path: string) {
	if (!path.startsWith('/')) {
		throw new Error(`Invalid Genius path: ${path}`)
	}

	const baseUrl = process.env.LYRICS_ENDPOINT ?? DEFAULT_LYRICS_ENDPOINT
	const url = new URL(baseUrl)
	url.searchParams.set('path', path)

	const token = process.env.LYRICS_API_TOKEN

	const response = await fetch(url, {
		headers: {
			Accept: 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		next: {
			revalidate: 86400,
		},
	})

	if (!response.ok) {
		throw new Error(`Lyrics service failed with status ${response.status}`)
	}

	const contentType = response.headers.get('content-type') ?? ''

	if (contentType.includes('application/json')) {
		const payload = (await response.json()) as unknown
		const lyrics = extractLyrics(payload)

		if (!lyrics) {
			throw new Error('Lyrics payload did not contain usable content.')
		}

		return lyrics
	}

	const text = await response.text()

	if (!text.trim()) {
		throw new Error('Lyrics service returned empty response.')
	}

	return text
}

const extractLyrics = (payload: unknown): string | null => {
	if (!payload) {
		return null
	}

	if (typeof payload === 'string') {
		return payload
	}

	if (typeof payload === 'object') {
		if ('lyrics' in (payload as Record<string, unknown>)) {
			const value = (payload as Record<string, unknown>).lyrics
			return typeof value === 'string' && value.trim() ? value : null
		}

		if ('data' in (payload as Record<string, unknown>)) {
			const dataValue = (payload as Record<string, unknown>).data
			return extractLyrics(dataValue)
		}
	}

	return null
}
