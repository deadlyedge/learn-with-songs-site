import { NextRequest, NextResponse } from 'next/server'
import type { Song } from '@/generated/prisma/client'
import type { NormalizedSong } from '@/types'
import { searchSongs } from '@/actions/search'

export async function GET(request: NextRequest) {
	const url = new URL(request.url)
	const query = url.searchParams.get('q')?.trim() ?? ''
	const requestedSource =
		url.searchParams.get('source')?.trim().toLowerCase() ?? null

	try {
		return NextResponse.json(
			await searchSongs({ query, source: requestedSource })
		)
	} catch (error) {
		console.error(error)
		return NextResponse.json(
			{ error: (error as Error).message ?? 'Failed to search songs.' },
			{ status: 502 }
		)
	}
}
