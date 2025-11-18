import { clsx, type ClassValue } from 'clsx'
import { Noto_Sans, Noto_Serif, Uncial_Antiqua } from 'next/font/google'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function hexToRgb01(hex: string) {
	// 去掉前导 '#'
	if (hex.startsWith('#')) hex = hex.slice(1)
	// 支持 3 位简写，如 #abc
	if (hex.length === 3) {
		hex = hex
			.split('')
			.map((ch) => ch + ch)
			.join('')
	}
	// 解析 R、G、B
	const r = parseInt(hex.slice(0, 2), 16)
	const g = parseInt(hex.slice(2, 4), 16)
	const b = parseInt(hex.slice(4, 6), 16)
	// 转换到 [0,1] 范围，返回元组 [r, g, b]
	return [r / 255, g / 255, b / 255] as [number, number, number]
}

const notoSerif = Noto_Serif({
	variable: '--font-noto-serif',
	subsets: ['latin'],
})

const uncialAntiqua = Uncial_Antiqua({
	variable: '--font-uncial-antiqua',
	subsets: ['latin'],
	weight: ['400'],
})

const notoSans = Noto_Sans({
	variable: '--font-noto-sans',
	subsets: ['latin'],
	weight: ['400'],
})

export const fonts = {
	noto: notoSerif.className,
	uncial: uncialAntiqua.className,
	sans: notoSans.className,
}

const isWhitespace = (char?: string) => {
	return !char || /\s/.test(char)
}

export const normalizeSongPath = (songPath?: string): string | undefined => {
	if (!songPath) return undefined
	return songPath.startsWith('/') ? songPath : `/${songPath}`
}

export const expandToFullWords = (text: string, start: number, end: number) => {
	if (start >= end) {
		return null
	}

	let expandedStart = start
	let expandedEnd = end

	while (expandedStart < text.length && isWhitespace(text[expandedStart])) {
		expandedStart++
	}
	while (expandedStart > 0 && !isWhitespace(text[expandedStart - 1])) {
		expandedStart--
	}

	while (expandedEnd > expandedStart && isWhitespace(text[expandedEnd - 1])) {
		expandedEnd--
	}
	while (expandedEnd < text.length && !isWhitespace(text[expandedEnd])) {
		expandedEnd++
	}

	if (expandedStart >= expandedEnd) {
		return null
	}

	const normalized = text.slice(expandedStart, expandedEnd).trim()
	return normalized.length ? normalized : null
}

export const findLineElement = (node: Node | null) => {
	if (!node) {
		return null
	}

	if (node.nodeType === Node.TEXT_NODE) {
		return (
			(node as Text).parentElement?.closest<HTMLElement>('[data-line-text]') ??
			null
		)
	}

	if (node instanceof HTMLElement) {
		return node.closest<HTMLElement>('[data-line-text]')
	}

	return null
}

export const splitLyrics = (content: string) => {
	// 保留原始格式：按换行分割并保留每一行的原始内容。
	// 如果某行（忽略前导空白）以 '[' 开头（通常是节或注释），
	// 且之前一行不是空行，则在它前面插入一个空行以便视觉分隔。
	const lines = content.split(/\r?\n/)
	const normalized: string[] = []

	for (const rawLine of lines) {
		// 保留行的原始内容，不 trim
		const line = rawLine

		// 如果当前行（忽略前导空白）以 '[' 开头
		if (line.trimStart().startsWith('[')) {
			// 如果前一行存在且不是空行，则插入一个空行作为分隔
			if (normalized.length > 0 && normalized[normalized.length - 1] !== '') {
				normalized.push('')
			}
			normalized.push(line)
			continue
		}

		// 普通行直接保留（包括空字符串）
		normalized.push(line)
	}

	return normalized
}
