import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { prisma } from '@/lib/prisma'

type Body = {
	word: string
	line: string
	lineNumber: number | null
	result: string
	songId: string
	songPath: string
}

export async function POST(req: Request) {
	const { userId } = await auth()

	if (!userId) {
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

	const user = await prisma.user.findUnique({
		where: { clerkId: userId },
	})

	if (!user) {
		return NextResponse.json({ error: '用户尚未同步' }, { status: 404 })
	}

	const normalizedSongPath = songPath.startsWith('/') ? songPath : `/${songPath}`

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
