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
