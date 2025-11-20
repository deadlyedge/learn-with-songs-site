import { NextResponse } from 'next/server'

import { loadFeaturedSongs } from '@/actions/featured-songs'

export async function GET() {
	try {
		const songs = await loadFeaturedSongs()
		return NextResponse.json({ songs })
	} catch (error) {
		console.error('Failed to fetch featured songs', error)
		return NextResponse.json(
			{ error: 'Failed to load featured songs' },
			{ status: 500 }
		)
	}
}
