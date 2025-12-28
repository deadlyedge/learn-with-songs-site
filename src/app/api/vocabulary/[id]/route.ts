import { type NextRequest, NextResponse } from 'next/server'
import { initialUser } from '@/lib/clerk-auth'
import { prisma } from '@/lib/prisma'

// Constants
const ERROR_MESSAGES = {
	UNAUTHENTICATED: '未登录',
	ENTRY_NOT_FOUND: '词汇条目不存在',
	MISSING_FIELDS: '缺少必要字段',
} as const

// Helper functions
const ensureLoggedInUser = async () => {
	const user = await initialUser()
	if (!user) {
		throw new Error(ERROR_MESSAGES.UNAUTHENTICATED)
	}
	return user
}

// PUT /api/vocabulary/[id] - 更新词汇条目
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await ensureLoggedInUser()
		const { id } = await params
		const { result, songPath } = await request.json()

		if (!result?.trim() || !songPath) {
			return NextResponse.json(
				{ error: ERROR_MESSAGES.MISSING_FIELDS },
				{ status: 400 },
			)
		}

		// 验证条目存在且属于当前用户
		const existing = await prisma.vocabularyEntry.findFirst({
			where: {
				id,
				userId: user.id,
			},
		})

		if (!existing) {
			return NextResponse.json(
				{ error: ERROR_MESSAGES.ENTRY_NOT_FOUND },
				{ status: 404 },
			)
		}

		const updatedEntry = await prisma.vocabularyEntry.update({
			where: { id },
			data: {
				result: result.trim(),
				songPath: songPath.startsWith('/') ? songPath : `/${songPath}`,
			},
		})

		return NextResponse.json({ entry: updatedEntry })
	} catch (error) {
		console.error('Error updating vocabulary entry:', error)
		const status =
			error instanceof Error && error.message === ERROR_MESSAGES.UNAUTHENTICATED
				? 401
				: 500
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			{ status },
		)
	}
}

// PATCH /api/vocabulary/[id]/mastered - 切换掌握状态
export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await ensureLoggedInUser()
		const { id } = await params

		// 验证条目存在且属于当前用户
		const existing = await prisma.vocabularyEntry.findFirst({
			where: {
				id,
				userId: user.id,
			},
		})

		if (!existing) {
			return NextResponse.json(
				{ error: ERROR_MESSAGES.ENTRY_NOT_FOUND },
				{ status: 404 },
			)
		}

		const newMastered = !existing.mastered

		const updatedEntry = await prisma.vocabularyEntry.update({
			where: { id },
			data: {
				mastered: newMastered,
				masteredAt: newMastered ? new Date() : null,
			},
		})

		return NextResponse.json({ entry: updatedEntry })
	} catch (error) {
		console.error('Error toggling mastered state:', error)
		const status =
			error instanceof Error && error.message === ERROR_MESSAGES.UNAUTHENTICATED
				? 401
				: 500
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			{ status },
		)
	}
}
