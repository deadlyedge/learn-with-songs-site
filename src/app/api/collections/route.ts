import { NextRequest, NextResponse } from 'next/server'

import { initialUser } from '@/lib/clerk-auth'
import {
	addSongToCollection,
	removeSongFromCollection,
	CollectionNotFoundError,
} from '@/lib/collections'

const parseBody = async (request: NextRequest) => {
	try {
		const payload = await request.json()
		const songId =
			typeof payload?.songId === 'string' ? payload.songId.trim() : ''
		return songId || null
	} catch {
		return null
	}
}

const ensureUser = async () => {
	const user = await initialUser()
	if (!user) {
		return null
	}
	return user
}

export async function POST(request: NextRequest) {
	const songId = await parseBody(request)
	if (!songId) {
		return NextResponse.json(
			{ error: 'Missing songId in request body' },
			{ status: 400 }
		)
	}

	const user = await ensureUser()
	if (!user) {
		return NextResponse.json({ error: '未登录' }, { status: 401 })
	}

	try {
		await addSongToCollection(user.id, songId)
		return NextResponse.json({ success: true, isCollected: true })
	} catch (error) {
		if (error instanceof CollectionNotFoundError) {
			return NextResponse.json({ error: error.message }, { status: 404 })
		}
		console.error('Failed to add collection:', error)
		return NextResponse.json(
			{ error: '收藏操作失败，请稍后重试' },
			{ status: 500 }
		)
	}
}

export async function DELETE(request: NextRequest) {
	const songId = await parseBody(request)
	if (!songId) {
		return NextResponse.json(
			{ error: 'Missing songId in request body' },
			{ status: 400 }
		)
	}

	const user = await ensureUser()
	if (!user) {
		return NextResponse.json({ error: '未登录' }, { status: 401 })
	}

	try {
		await removeSongFromCollection(user.id, songId)
		return NextResponse.json({ success: true, isCollected: false })
	} catch (error) {
		if (error instanceof CollectionNotFoundError) {
			return NextResponse.json({ error: error.message }, { status: 404 })
		}
		console.error('Failed to remove collection:', error)
		return NextResponse.json(
			{ error: '取消收藏失败，请稍后重试' },
			{ status: 500 }
		)
	}
}
