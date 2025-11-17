'use server'

import {
	addVocabularyEntry,
	vocabularyEntryExists,
	VocabularyPayloadError,
	VocabularyUnauthorizedError,
	VocabularyDuplicateError,
	VocabularyPayload,
} from '@/lib/vocabulary'

export async function vocabularyEntryExistsAction(payload: Partial<VocabularyPayload>) {
	return await vocabularyEntryExists(payload)
}

export async function addVocabularyEntryAction(payload: Partial<VocabularyPayload>) {
	return await addVocabularyEntry(payload)
}
