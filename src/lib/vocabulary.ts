import { prisma } from '@/lib/prisma'
import { initialUser } from '@/lib/clerk-auth'
import {
	DuplicateOptions,
	VocabularyEntryData,
	VocabularyExistsPayload,
	VocabularyPayload,
} from '@/types'
import {
	VOCABULARY_ERROR_MESSAGES,
	VocabularyDuplicateError,
	VocabularyNotFoundError,
	VocabularyPayloadError,
	VocabularyUnauthorizedError,
} from './vocabulary-errors'


export const findDuplicateEntry = (options: DuplicateOptions) => {
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

export const createVocabularyEntry = (data: {
	userId: string
	word: string
	line: string
	lineNumber: number | null
	result: string
	songId: string
	songPath: string
}) => {
	return prisma.vocabularyEntry.create({
		data: {
			userId: data.userId,
			word: data.word,
			line: data.line,
			lineNumber: data.lineNumber,
			result: data.result,
			songId: data.songId,
			songPath: data.songPath,
		},
	})
}

export const validateVocabularyPayload = (
	payload: Partial<VocabularyPayload>
): VocabularyPayload => {
	if (
		!payload.word ||
		!payload.line ||
		(payload.word.trim().length === 0 && payload.line.trim().length === 0) ||
		!payload.result ||
		!payload.songId ||
		!payload.songPath
	) {
		throw new VocabularyPayloadError(VOCABULARY_ERROR_MESSAGES.MISSING_FIELDS)
	}
	return {
		word: payload.word,
		line: payload.line,
		lineNumber: payload.lineNumber ?? null,
		result: payload.result,
		songId: payload.songId,
		songPath: payload.songPath.startsWith('/')
			? payload.songPath
			: `/${payload.songPath}`,
	}
}

export const ensureVocabularyUser = async () => {
	const user = await initialUser()
	if (!user) {
		throw new VocabularyUnauthorizedError(
			VOCABULARY_ERROR_MESSAGES.UNAUTHENTICATED
		)
	}
	return user
}

export const addVocabularyEntry = async (
	payload: Partial<VocabularyPayload>
) => {
	const validPayload = validateVocabularyPayload(payload)
	const user = await ensureVocabularyUser()

	const existing = await findDuplicateEntry({
		userId: user.id,
		word: validPayload.word,
		line: validPayload.line,
		lineNumber: validPayload.lineNumber,
		songId: validPayload.songId,
	})

	if (existing) {
		throw new VocabularyDuplicateError(
			VOCABULARY_ERROR_MESSAGES.DUPLICATE_ENTRY
		)
	}

	return createVocabularyEntry({
		userId: user.id,
		word: validPayload.word,
		line: validPayload.line,
		lineNumber: validPayload.lineNumber,
		result: validPayload.result,
		songId: validPayload.songId,
		songPath: validPayload.songPath,
	})
}

export const updateVocabularyEntry = async (
	payload: Partial<VocabularyPayload>
) => {
	const validPayload = validateVocabularyPayload(payload)
	const user = await ensureVocabularyUser()

	const existing = await findDuplicateEntry({
		userId: user.id,
		word: validPayload.word,
		line: validPayload.line,
		lineNumber: validPayload.lineNumber,
		songId: validPayload.songId,
	})

	if (!existing) {
		throw new VocabularyNotFoundError(
			VOCABULARY_ERROR_MESSAGES.ENTRY_NOT_FOUND
		)
	}

	return prisma.vocabularyEntry.update({
		where: { id: existing.id },
		data: {
			result: validPayload.result,
			songPath: validPayload.songPath,
		},
	})
}

export const validateExistsPayload = (
	payload: Partial<VocabularyExistsPayload>
) => {
	if (!payload.word || !payload.line || !payload.songId) {
		throw new VocabularyPayloadError(VOCABULARY_ERROR_MESSAGES.MISSING_FIELDS)
	}
	return {
		word: payload.word,
		line: payload.line,
		lineNumber: payload.lineNumber ?? null,
		songId: payload.songId,
	}
}

export const getVocabularyEntry = async (
	payload: Partial<VocabularyExistsPayload>
) => {
	const validPayload = validateExistsPayload(payload)
	const user = await ensureVocabularyUser()

	return findDuplicateEntry({
		userId: user.id,
		word: validPayload.word,
		line: validPayload.line,
		lineNumber: validPayload.lineNumber,
		songId: validPayload.songId,
	})
}

export const vocabularyEntryExists = async (
	payload: Partial<VocabularyExistsPayload>
) => {
	const entry = await getVocabularyEntry(payload)
	if (!entry) {
		return { exists: false }
	}
	return {
		exists: true,
		entry: {
			word: entry.word,
			line: entry.line,
			lineNumber: entry.lineNumber,
			result: entry.result,
			songId: entry.songId,
			songPath: entry.songPath,
		} satisfies VocabularyEntryData,
	}
}
