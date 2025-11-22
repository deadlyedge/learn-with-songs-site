/**
 * API 与 Database 之间，以及 Database 与 前端的类型转换工具
 */

import {
	VocabularyEntryWithFullSong,
	VocabularyEntryWithSongData,
} from '@/types'

/**
 * 将 Prisma 查询结果转换为前端显示格式，完全利用 Prisma 类型安全
 */
function transformVocabularyEntryToDisplayData(
	entry: VocabularyEntryWithFullSong
): VocabularyEntryWithSongData {
	return {
		id: entry.id,
		word: entry.word,
		line: entry.line,
		lineNumber: entry.lineNumber,
		result: entry.result,
		songPath: entry.songPath,
		songTitle: entry.song?.title ?? '未知歌曲',
		songArtworkUrl: entry.song?.artworkUrl ?? null,
		mastered: entry.mastered,
		songId: entry.song?.id ?? '',
	}
}

/**
 * 批量转换词汇条目
 */
export function transformVocabularyEntriesToDisplayData(
	entries: VocabularyEntryWithFullSong[]
): VocabularyEntryWithSongData[] {
	return entries.map(transformVocabularyEntryToDisplayData)
}
