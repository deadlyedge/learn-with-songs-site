'use server'

import {
	addVocabularyEntry,
	vocabularyEntryExists,
	VocabularyPayload,
	updateVocabularyEntry,
} from '@/lib/vocabulary'

export async function vocabularyEntryExistsAction(
	payload: Partial<VocabularyPayload>
) {
	return await vocabularyEntryExists(payload)
}

export async function addVocabularyEntryAction(
	payload: Partial<VocabularyPayload>
) {
	return await addVocabularyEntry(payload)
}

export async function updateVocabularyEntryAction(
	payload: Partial<VocabularyPayload>
) {
	return await updateVocabularyEntry(payload)
}
