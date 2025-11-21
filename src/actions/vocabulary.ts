'use server'

import { prisma } from '@/lib/prisma'
import { initialUser } from '@/lib/clerk-auth'

// import {
// 	addVocabularyEntry,
// 	vocabularyEntryExists,
// 	VocabularyPayload,
// 	updateVocabularyEntry,
// } from '@/lib/vocabulary'

// Base types
type VocabularyBase = {
	word: string
	line: string
	lineNumber: number | null
	songId: string
}

type VocabularyEntryData = VocabularyBase & {
	result: string
	songPath: string
}

type DuplicateOptions = {
	userId: string
} & VocabularyBase

// Constants
const ERROR_MESSAGES = {
	UNAUTHENTICATED: '未授权',
	DUPLICATE_ENTRY: '该片段已经在生词本中了',
	MISSING_FIELDS: '缺少必要字段',
	ENTRY_NOT_FOUND: '生词本条目未找到',
} as const

// Vocabulary Errors
class VocabularyError extends Error {}
class VocabularyUnauthorizedError extends VocabularyError {}
class VocabularyDuplicateError extends VocabularyError {}
class VocabularyPayloadError extends VocabularyError {}
class VocabularyNotFoundError extends VocabularyError {}

const findDuplicateEntry = async (options: DuplicateOptions) => {
	return await prisma.vocabularyEntry.findFirst({
		where: {
			userId: options.userId,
			word: options.word,
			line: options.line,
			lineNumber: options.lineNumber ?? null,
			songId: options.songId,
		},
	})
}

const ensureVocabularyUser = async () => {
	const user = await initialUser()
	if (!user) {
		throw new VocabularyUnauthorizedError(ERROR_MESSAGES.UNAUTHENTICATED)
	}
	return user
}

const createVocabularyEntry = async (data: {
	userId: string
	word: string
	line: string
	lineNumber: number | null
	result: string
	songId: string
	songPath: string
}) => {
	return await prisma.vocabularyEntry.create({
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

// Common validation function
const validateBasePayload = (
	payload: Partial<VocabularyBase>
): VocabularyBase => {
	if (!payload.word || !payload.line || !payload.songId) {
		throw new VocabularyPayloadError(ERROR_MESSAGES.MISSING_FIELDS)
	}
	return {
		word: payload.word,
		line: payload.line,
		lineNumber: payload.lineNumber ?? null,
		songId: payload.songId,
	}
}

const validateVocabularyPayload = (
	payload: Partial<VocabularyEntryData>
): VocabularyEntryData => {
	// Additional required fields for full payload
	if (!payload.result || !payload.songPath) {
		throw new VocabularyPayloadError(ERROR_MESSAGES.MISSING_FIELDS)
	}

	const base = validateBasePayload(payload)

	// Check for empty trimmed values (after validation)
	if (base.word.trim().length === 0 && base.line.trim().length === 0) {
		throw new VocabularyPayloadError(ERROR_MESSAGES.MISSING_FIELDS)
	}

	return {
		...base,
		result: payload.result,
		songPath: payload.songPath.startsWith('/')
			? payload.songPath
			: `/${payload.songPath}`,
	}
}

// const validateExistsPayload = (
// 	payload: Partial<VocabularyBase>
// ): VocabularyBase => {
// 	return validateBasePayload(payload)
// }

const getVocabularyEntry = async (payload: Partial<VocabularyBase>) => {
	const validPayload = validateBasePayload(payload)
	const user = await ensureVocabularyUser()

	return findDuplicateEntry({
		userId: user.id,
		word: validPayload.word,
		line: validPayload.line,
		lineNumber: validPayload.lineNumber,
		songId: validPayload.songId,
	})
}

/**
 * 检查词汇条目是否存在
 * @param payload - 词汇条目信息（包含word, line, songId）
 * @returns 如果存在返回条目信息，否则返回{exists: false}
 * @throws VocabularyUnauthorizedError 如果用户未授权
 * @throws VocabularyPayloadError 如果payload无效
 */
export async function vocabularyEntryExists(
	payload: Partial<VocabularyEntryData>
): Promise<{ entry: VocabularyEntryData | null }> {
	const entry = await getVocabularyEntry(payload)
	if (!entry) {
		return { entry: null }
	}
	return {
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

/**
 * 添加新词汇条目到生词本
 * @param payload - 完整的词汇条目信息
 * @returns 创建的词汇条目
 * @throws VocabularyUnauthorizedError 如果用户未授权
 * @throws VocabularyDuplicateError 如果条目已存在
 * @throws VocabularyPayloadError 如果payload无效
 */
export async function addVocabularyEntry(
	payload: Partial<VocabularyEntryData>
) {
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
		throw new VocabularyDuplicateError(ERROR_MESSAGES.DUPLICATE_ENTRY)
	}

	console.log(`[Vocabulary Add] '${validPayload.word}' added by '${user.name}'`)

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

/**
 * 更新现有词汇条目
 * @param payload - 要更新的词汇条目信息
 * @returns 更新后的词汇条目
 * @throws VocabularyUnauthorizedError 如果用户未授权
 * @throws VocabularyNotFoundError 如果条目不存在
 * @throws VocabularyPayloadError 如果payload无效
 */
export async function updateVocabularyEntry(
	payload: Partial<VocabularyEntryData>
) {
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
		throw new VocabularyNotFoundError(ERROR_MESSAGES.ENTRY_NOT_FOUND)
	}

	return prisma.vocabularyEntry.update({
		where: { id: existing.id },
		data: {
			result: validPayload.result,
			songPath: validPayload.songPath,
		},
	})
}
