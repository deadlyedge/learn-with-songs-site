import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initialUser } from '@/lib/clerk-auth'

// DELETE /api/collections/[songId] - 从用户收藏中移除歌曲
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ songId: string }> }
) {
	try {
		const user = await initialUser()
		if (!user) {
			return NextResponse.json({ error: '未登录' }, { status: 401 })
		}

		const { songId } = await params

		// 验证歌曲是否存在
		const song = await prisma.song.findUnique({
			where: { id: songId },
			select: { id: true },
		})

		if (!song) {
			return NextResponse.json({ error: '歌曲不存在' }, { status: 404 })
		}

		await prisma.user.update({
			where: { id: user.id },
			data: {
				collections: {
					disconnect: { id: songId },
				},
			},
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Error removing from collection:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// GET /api/collections/[songId] - 检查歌曲是否已被用户收藏
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ songId: string }> }
) {
	try {
		const user = await initialUser()
		const { songId } = await params

		if (!user) {
			return NextResponse.json({ isCollected: false })
		}

		const count = await prisma.user.count({
			where: {
				id: user.id,
				collections: {
					some: { id: songId },
				},
			},
		})

		return NextResponse.json({ isCollected: count > 0 })
	} catch (error) {
		console.error('Error checking collection status:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
