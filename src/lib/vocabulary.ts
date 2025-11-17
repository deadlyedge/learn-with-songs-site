import { prisma } from '@/lib/prisma'
import { ensureClerkUserRecord } from '@/lib/ensure-clerk-user'

type DuplicateOptions = {
	userId: string
	word: string
	line: string
	lineNumber: number | null
	songId: string
}

export async function getVocabularyUser() {
	return ensureClerkUserRecord()
}

export class VocabularyError extends Error {}

export class VocabularyUnauthorizedError extends VocabularyError {}

export class VocabularyDuplicateError extends VocabularyError {}

export class VocabularyPayloadError extends VocabularyError {}

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

export type VocabularyPayload = {
	word: string
	line: string
	lineNumber: number | null
	result: string
	songId: string
	songPath: string
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
		throw new VocabularyPayloadError('缺少必要字段')
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
	const user = await getVocabularyUser()
	if (!user) {
		throw new VocabularyUnauthorizedError('未授权')
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
		throw new VocabularyDuplicateError('该片段已经在生词本中了')
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

export type VocabularyExistsPayload = {
	word: string
	line: string
	lineNumber: number | null
	songId: string
}

export const validateExistsPayload = (
	payload: Partial<VocabularyExistsPayload>
) => {
	if (!payload.word || !payload.line || !payload.songId) {
		throw new VocabularyPayloadError('缺少必要字段')
	}
	return {
		word: payload.word,
		line: payload.line,
		lineNumber: payload.lineNumber ?? null,
		songId: payload.songId,
	}
}

export type VocabularyEntryData = {
	word: string
	line: string
	lineNumber: number | null
	result: string
	songId: string
	songPath: string
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
