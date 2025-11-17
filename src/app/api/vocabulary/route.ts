import { NextResponse } from 'next/server'

import {
	addVocabularyEntry,
	VocabularyDuplicateError,
	VocabularyPayloadError,
	VocabularyUnauthorizedError,
} from '@/lib/vocabulary'

export async function PUT(req: Request) {
	try {
		const data = await req.json()
		await addVocabularyEntry(data)
		return NextResponse.json({ success: true })
	} catch (error) {
		if (error instanceof VocabularyUnauthorizedError) {
			return NextResponse.json({ error: error.message }, { status: 401 })
		}
		if (error instanceof VocabularyDuplicateError) {
			return NextResponse.json({ error: error.message }, { status: 409 })
		}
		if (error instanceof VocabularyPayloadError) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : '加入生词本失败' },
			{ status: 500 }
		)
	}
}
