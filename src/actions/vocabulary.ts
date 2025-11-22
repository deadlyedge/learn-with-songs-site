'use server'

import { prisma } from '@/lib/prisma'
import { initialUser } from '@/lib/clerk-auth'
import { revalidatePath } from 'next/cache'
import {
	VocabularyEntryWithSongData,
	VocabularyEntryWithFullSong,
	DuplicateOptions,
	VocabularyPayload,
} from '@/types'
import { transformVocabularyEntriesToDisplayData } from '@/lib/transforms'

// 使用集中化的类型而非内联定义 - 完全基于Prisma type safety
import type { Prisma } from '@/generated/prisma'

// 从Prisma生成的具体操作类型
type VocabularyCreateInput = Prisma.VocabularyEntryUncheckedCreateInput
// type VocabularyWhereUniqueInput = Prisma.VocabularyEntryWhereUniqueInput

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

const createVocabularyEntry = async (data: VocabularyCreateInput) => {
	return await prisma.vocabularyEntry.create({
		data: data,
	})
}

type ValidationResult = {
	word: string
	line: string
	lineNumber: number | null
	songId: string
	result: string
	songPath: string
}

// Common validation function (使用具体类型)
const validateVocabularyEntryPayload = (
	payload: Partial<VocabularyPayload>
): ValidationResult => {
	const { word, line, songId, result, songPath } = payload

	if (!word?.trim() || !line?.trim() || !songId || !result || !songPath) {
		throw new VocabularyPayloadError(ERROR_MESSAGES.MISSING_FIELDS)
	}

	return {
		word: word.trim(),
		line: line.trim(),
		lineNumber: payload.lineNumber ?? null,
		songId,
		result: result.trim(),
		songPath: songPath.startsWith('/') ? songPath : `/${songPath}`,
	}
}

// 内联函数，移除复杂validation (简化维护)
const getVocabularyEntry = async (payload: Partial<VocabularyPayload>) => {
	const validPayload = validateVocabularyEntryPayload({
		...payload,
		result: 'dummy',
		songPath: '/dummy',
	})
	const user = await ensureVocabularyUser()

	return findDuplicateEntry({
		userId: user.id,
		word: validPayload.word,
		line: validPayload.line,
		lineNumber: validPayload.lineNumber,
		songId: validPayload.songId,
	})
}

// 词汇条目的简要信息类型
type VocabularyEntrySummary = {
	word: string
	line: string
	lineNumber: number | null
	result: string
	songId: string
	songPath: string
}

/**
 * 检查词汇条目是否存在
 * @param payload - 词汇条目信息（包含word, line, songId）
 * @returns 如果存在返回条目信息，否则返回{exists: false}
 * @throws VocabularyUnauthorizedError 如果用户未授权
 * @throws VocabularyPayloadError 如果payload无效
 */
export async function vocabularyEntryExists(
	payload: Partial<VocabularyPayload>
): Promise<{ entry: VocabularyEntrySummary | null }> {
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
		},
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
	payload: Partial<{
		word: string
		line: string
		lineNumber: number | null
		result: string
		songId: string
		songPath: string
	}>
) {
	const validPayload = validateVocabularyEntryPayload(payload)
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

	const newEntry = await createVocabularyEntry({
		userId: user.id,
		word: validPayload.word,
		line: validPayload.line,
		lineNumber: validPayload.lineNumber,
		result: validPayload.result,
		songId: validPayload.songId,
		songPath: validPayload.songPath,
	})

	revalidatePath('/vocabulary')

	return newEntry
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
	payload: Partial<{
		word: string
		line: string
		lineNumber: number | null
		result: string
		songId: string
		songPath: string
	}>
) {
	const validPayload = validateVocabularyEntryPayload(payload)
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

	const updatedEntry = await prisma.vocabularyEntry.update({
		where: { id: existing.id },
		data: {
			result: validPayload.result,
			songPath: validPayload.songPath,
		},
	})

	revalidatePath('/vocabulary')

	return updatedEntry
}

/**
 * 获取用户词汇条目 - 完全利用 Prisma 类型安全
 * @returns 用户词汇条目数组，未登录则返回null
 * @throws VocabularyUnauthorizedError 如果用户未授权
 */
export async function getUserVocabulary(): Promise<
	VocabularyEntryWithSongData[] | null
> {
	const user = await ensureVocabularyUser()

	// 使用精确的 select 查询，完美匹配 VocabularyEntryWithFullSong 类型
	const vocabulary: VocabularyEntryWithFullSong[] =
		await prisma.vocabularyEntry.findMany({
			where: { userId: user.id },
			select: {
				id: true,
				word: true,
				line: true,
				lineNumber: true,
				result: true,
				songPath: true,
				createdAt: true,
				updatedAt: true,
				mastered: true,
				masteredAt: true,
				reviewCount: true,
				song: {
					select: {
						id: true,
						title: true,
						artworkUrl: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		})

	// 使用类型安全的 transform function
	return transformVocabularyEntriesToDisplayData(vocabulary)
}

export async function switchMasteredState(entryId: string) {
	const user = await ensureVocabularyUser()

	const entry = await prisma.vocabularyEntry.findFirst({
		where: { id: entryId, userId: user.id },
	})
	if (!entry) {
		throw new VocabularyNotFoundError(ERROR_MESSAGES.ENTRY_NOT_FOUND)
	}

	const updated = await prisma.vocabularyEntry.update({
		where: { id: entry.id },
		data: {
			mastered: !entry.mastered,
			masteredAt: entry.mastered ? null : new Date(),
		},
	})

	revalidatePath('/vocabulary')

	return updated
}
