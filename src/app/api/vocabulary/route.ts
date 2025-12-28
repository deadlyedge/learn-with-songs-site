import { type NextRequest, NextResponse } from 'next/server'
import { initialUser } from '@/lib/clerk-auth'
import { prisma } from '@/lib/prisma'
import { transformVocabularyEntriesToDisplayData } from '@/lib/transforms'
import type { VocabularyEntryWithFullSong, VocabularyPayload } from '@/types'

// Constants
const ERROR_MESSAGES = {
	UNAUTHENTICATED: '未登录',
	DUPLICATE_ENTRY: '该词汇条目已存在',
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

const validateVocabularyPayload = (payload: VocabularyPayload) => {
	const { word, line, songId, result, songPath } = payload

	if (!word?.trim() || !line?.trim() || !songId || !result || !songPath) {
		throw new Error(ERROR_MESSAGES.MISSING_FIELDS)
	}

	return {
		word: word.trim(),
		line: line.trim(),
		lineNumber: payload.lineNumber ?? null,
		songId,
		result: result.trim(),
		songPath: songPath.startsWith('/') ? songPath : `/${songPath}`,
	}
}

// GET /api/vocabulary - 获取用户词汇条目列表
export async function GET() {
	try {
		const user = await ensureLoggedInUser()

		const vocabulary: VocabularyEntryWithFullSong[] =
			await prisma.vocabularyEntry.findMany({
				where: { userId: user.id },
				select: {
					id: true,
					word: true,
					line: true,
					lineNumber: true,
					result: true,
					songPath: true,
					createdAt: true,
					updatedAt: true,
					mastered: true,
					masteredAt: true,
					reviewCount: true,
					song: {
						select: {
							id: true,
							title: true,
							artworkUrl: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			})

		const transformedData = transformVocabularyEntriesToDisplayData(vocabulary)
		return NextResponse.json({ vocabulary: transformedData })
	} catch (error) {
		console.error('Error fetching vocabulary:', error)
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

// POST /api/vocabulary - 添加新词汇条目
export async function POST(request: NextRequest) {
	try {
		const user = await ensureLoggedInUser()
		const payload = await request.json()
		const validPayload = validateVocabularyPayload(payload)

		// 检查是否已存在
		const existing = await prisma.vocabularyEntry.findFirst({
			where: {
				userId: user.id,
				word: validPayload.word,
				line: validPayload.line,
				lineNumber: validPayload.lineNumber ?? null,
				songId: validPayload.songId,
			},
		})

		if (existing) {
			return NextResponse.json(
				{ error: ERROR_MESSAGES.DUPLICATE_ENTRY },
				{ status: 409 },
			)
		}

		const newEntry = await prisma.vocabularyEntry.create({
			data: {
				userId: user.id,
				word: validPayload.word,
				line: validPayload.line,
				lineNumber: validPayload.lineNumber,
				result: validPayload.result,
				songId: validPayload.songId,
				songPath: validPayload.songPath,
			},
		})

		console.log(
			`[Vocabulary Add] '${validPayload.word}' added by '${user.name}'`,
		)

		return NextResponse.json({ entry: newEntry })
	} catch (error) {
		console.error('Error adding vocabulary entry:', error)
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

// PUT /api/vocabulary - 检查词汇条目是否存在
export async function PUT(request: NextRequest) {
	try {
		const user = await ensureLoggedInUser()
		const { word, line, lineNumber, songId } = await request.json()

		if (!word?.trim() || !line?.trim() || !songId) {
			return NextResponse.json(
				{ error: ERROR_MESSAGES.MISSING_FIELDS },
				{ status: 400 },
			)
		}

		const existing = await prisma.vocabularyEntry.findFirst({
			where: {
				userId: user.id,
				word: word.trim(),
				line: line.trim(),
				lineNumber: lineNumber ?? null,
				songId,
			},
			select: {
				word: true,
				line: true,
				lineNumber: true,
				result: true,
				songId: true,
				songPath: true,
			},
		})

		if (!existing) {
			return NextResponse.json({ exists: false })
		}

		return NextResponse.json({
			exists: true,
			entry: existing,
		})
	} catch (error) {
		console.error('Error checking vocabulary entry:', error)
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
