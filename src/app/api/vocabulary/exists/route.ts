import { NextResponse } from 'next/server'

import {
	VocabularyPayloadError,
	VocabularyUnauthorizedError,
	vocabularyEntryExists,
} from '@/lib/vocabulary'

export async function POST(req: Request) {
	try {
		const body = await req.json()
		const exists = await vocabularyEntryExists(body)
		return NextResponse.json({ exists })
	} catch (error) {
		if (error instanceof VocabularyUnauthorizedError) {
			return NextResponse.json({ error: error.message }, { status: 401 })
		}
		if (error instanceof VocabularyPayloadError) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : '检查重复失败' },
			{ status: 500 }
		)
	}
}
