const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? ''

export class ApiError extends Error {
	constructor(message: string, public status: number) {
		super(message)
		this.name = 'ApiError'
	}
}

const buildApiUrl = (path: string) => {
	if (!path.startsWith('/')) {
		throw new Error(`API paths must start with '/', received: ${path}`)
	}
	return `${API_BASE_URL}${path}`
}

export async function fetchFromApi<T>(
	path: string,
	init?: RequestInit
): Promise<T> {
	const url = buildApiUrl(path)

	const response = await fetch(url, {
		...init,
		cache: init?.cache ?? 'no-store',
	})

	if (!response.ok) {
		const errorBody = await response.text().catch(() => '')
		const message = `Failed to fetch ${url}: ${response.status} ${response.statusText}${
			errorBody ? ` - ${errorBody}` : ''
		}`
		throw new ApiError(message, response.status)
	}

	return (await response.json()) as T
}
