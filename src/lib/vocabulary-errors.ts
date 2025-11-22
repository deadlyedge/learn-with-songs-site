export const VOCABULARY_ERROR_MESSAGES = {
	UNAUTHENTICATED: '未授权',
	DUPLICATE_ENTRY: '该片段已经在生词本中了',
	MISSING_FIELDS: '缺少必要字段',
	ENTRY_NOT_FOUND: '生词条目未找到',
} as const

export class VocabularyError extends Error {}
export class VocabularyUnauthorizedError extends VocabularyError {}
export class VocabularyDuplicateError extends VocabularyError {}
export class VocabularyPayloadError extends VocabularyError {}
export class VocabularyNotFoundError extends VocabularyError {}
