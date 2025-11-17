import { NextResponse } from 'next/server'

import { ensureClerkUserRecord } from '@/lib/ensure-clerk-user'
import { prisma } from '@/lib/prisma'

type ExistsBody = {
	word: string
	line: string
	lineNumber: number | null
	songId: string
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

export async function POST(req: Request) {
	const user = await ensureClerkUserRecord()

	if (!user) {
		return NextResponse.json({ error: '未授权' }, { status: 401 })
	}

	let body: ExistsBody
	try {
		body = await req.json()
	} catch (error) {
		return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
	}

	const { word, line, lineNumber, songId } = body

	if (!word || !line || !songId) {
		return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
	}

	const existing = await findDuplicateEntry({
		userId: user.id,
		word,
		line,
		lineNumber: typeof lineNumber === 'number' ? lineNumber : null,
		songId,
	})

	return NextResponse.json({ exists: Boolean(existing) })
}
