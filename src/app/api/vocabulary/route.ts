import { NextResponse } from 'next/server'

import { ensureClerkUserRecord } from '@/lib/ensure-clerk-user'
import { prisma } from '@/lib/prisma'

type Body = {
	word: string
	line: string
	lineNumber: number | null
	result: string
	songId: string
	songPath: string
}

const findDuplicateEntry = (options: {
	userId: string
	word: string
	line: string
	lineNumber: number | null
	songId: string
}) => {
	return prisma.vocabularyEntry.findFirst({
		where: {
			userId: options.userId,
			word: options.word,
			line: options.line,
			lineNumber: options.lineNumber ?? null,
			songId: options.songId,
		},
	})
}

export async function GET(req: Request) {
	const user = await ensureClerkUserRecord()

	if (!user) {
		return NextResponse.json({ error: '未授权' }, { status: 401 })
	}

	const url = new URL(req.url)
	const word = url.searchParams.get('word')
	const line = url.searchParams.get('line')
	const songId = url.searchParams.get('songId')
	const lineNumberParam = url.searchParams.get('lineNumber')

	if (!word || !line || !songId) {
		return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
	}

	const lineNumber =
		lineNumberParam !== null && lineNumberParam !== ''
			? Number(lineNumberParam)
			: null

	if (lineNumberParam !== null && lineNumberParam !== '' && Number.isNaN(lineNumber)) {
		return NextResponse.json({ error: 'lineNumber 格式无效' }, { status: 400 })
	}

	const existing = await findDuplicateEntry({
		userId: user.id,
		word,
		line,
		lineNumber,
		songId,
	})

	return NextResponse.json({ exists: Boolean(existing) })
}

export async function POST(req: Request) {
	const user = await ensureClerkUserRecord()

	if (!user) {
		return NextResponse.json({ error: '未授权' }, { status: 401 })
	}

	let payload: Body
	try {
		payload = await req.json()
	} catch (error) {
		return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
	}

	const { word, line, lineNumber, result, songId, songPath } = payload

	if (!word || !line || !result || !songId || !songPath) {
		return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
	}

	const normalizedSongPath = songPath.startsWith('/') ? songPath : `/${songPath}`

	const existing = await findDuplicateEntry({
		userId: user.id,
		word,
		line,
		lineNumber,
		songId,
	})

	if (existing) {
		return NextResponse.json(
			{ error: '该片段已经在生词本中了' },
			{ status: 409 }
		)
	}

	await prisma.vocabularyEntry.create({
		data: {
			userId: user.id,
			word,
			line,
			lineNumber: typeof lineNumber === 'number' ? lineNumber : null,
			result,
			songId,
			songPath: normalizedSongPath,
		},
	})

	return NextResponse.json({ success: true })
}
