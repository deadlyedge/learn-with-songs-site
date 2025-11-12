import {
	Annotation,
	AnnotationRaw,
	GeniusDomNode,
	GeniusSongInfo,
	GeniusSongInfoRaw,
} from '@/types/songsAPI'

const BLOCK_LEVEL_TAGS = new Set([
	'root',
	'div',
	'section',
	'article',
	'figure',
	'header',
	'footer',
	'aside',
	'nav',
])

const renderChildrenToMarkdown = (children?: Array<string | GeniusDomNode>) => {
	if (!children || children.length === 0) {
		return ''
	}

	return children
		.map((child) => {
			if (typeof child === 'string') {
				return child
			}

			return domNodeToMarkdown(child)
		})
		.join('')
}

const domNodeToMarkdown = (node: GeniusDomNode): string => {
	const tag = node.tag?.toLowerCase() ?? 'span'
	const content = renderChildrenToMarkdown(node.children)
	const trimmed = content.trim()

	switch (tag) {
		case 'span':
		case 'article':
		case 'header':
		case 'footer':
		case 'aside':
		case 'nav':
		case 'figure':
		case 'root':
		case 'div':
		case 'section':
			return content
		case 'p':
			return trimmed ? `${trimmed}\n\n` : '\n'
		case 'br':
			return '\n'
		case 'strong':
		case 'b':
			return trimmed ? `**${trimmed}**` : ''
		case 'em':
		case 'i':
			return trimmed ? `*${trimmed}*` : ''
		case 'u':
			return trimmed ? `_${trimmed}_` : ''
		case 'del':
		case 's':
		case 'strike':
			return trimmed ? `~~${trimmed}~~` : ''
		case 'code':
			return trimmed ? `\`${trimmed}\`` : ''
		case 'pre':
			return trimmed ? `\n\`\`\`\n${trimmed}\n\`\`\`\n\n` : '\n'
		case 'sup':
			return trimmed ? `<sup>${trimmed}</sup>` : ''
		case 'sub':
			return trimmed ? `<sub>${trimmed}</sub>` : ''
		case 'mark':
			return trimmed ? `<mark>${trimmed}</mark>` : ''
		case 'a': {
			const href = node.attributes?.href ?? node.data?.api_path ?? ''
			const label = trimmed || href

			return href ? `[${label}](${href})` : label
		}
		case 'img': {
			const src =
				node.attributes?.src?.toString() ??
				node.data?.src?.toString() ??
				''
			if (!src) {
				return ''
			}

			const alt =
				node.attributes?.alt?.toString() ??
				node.data?.title?.toString() ??
				node.data?.alt?.toString() ??
				''
			return `![${alt}](${src})`
		}
		case 'blockquote': {
			const lines = trimmed
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.map((line) => `> ${line}`)
				.join('\n')
			return lines ? `${lines}\n\n` : ''
		}
		case 'ul': {
			const items = (node.children ?? []).map((child) => {
				const value =
					typeof child === 'string'
						? child.trim()
						: domNodeToMarkdown(child).trim()

				return value ? `- ${value.replace(/\n+/g, ' ')}` : ''
			})
			return `${items.filter(Boolean).join('\n')}\n\n`
		}
		case 'ol': {
			let index = 1
			const items = (node.children ?? []).map((child) => {
				const value =
					typeof child === 'string'
						? child.trim()
						: domNodeToMarkdown(child).trim()

				if (!value) {
					return ''
				}

				const line = `${index}. ${value.replace(/\n+/g, ' ')}`
				index += 1
				return line
			})
			return `${items.filter(Boolean).join('\n')}\n\n`
		}
		case 'li': {
			const value = renderChildrenToMarkdown(node.children).trim()
			return value
		}
		default: {
			if (BLOCK_LEVEL_TAGS.has(tag)) {
				return content
			}
			if (tag.startsWith('h')) {
				const level = Number.parseInt(tag.slice(1), 10)
				const prefix = '#'.repeat(Number.isFinite(level) ? level : 1)
				return trimmed ? `${prefix} ${trimmed}\n\n` : ''
			}

			return trimmed || ''
		}
	}
}

export const convertDomToMarkdown = (
	dom?: GeniusDomNode | null
): string | null => {
	if (!dom) {
		return null
	}

	const rendered = domNodeToMarkdown(dom).trim()
	return rendered.length > 0 ? rendered : null
}

const normalizeAnnotations = (
	annotations?: AnnotationRaw[] | null
): Annotation[] | undefined => {
	if (!annotations) {
		return undefined
	}

	if (annotations.length === 0) {
		return []
	}

	return annotations.map((annotation) => {
		const { body, ...rest } = annotation

		if (typeof body === 'string') {
			return { ...rest, body } satisfies Annotation
		}

		const markdown = convertDomToMarkdown(body?.dom)
		return {
			...rest,
			body: markdown,
		} satisfies Annotation
	})
}

export const normalizeSongInfo = (raw: GeniusSongInfoRaw): GeniusSongInfo => {
	const cloned = JSON.parse(JSON.stringify(raw)) as GeniusSongInfoRaw

	const description = cloned.description
	cloned.description =
		typeof description === 'string'
			? description
			: convertDomToMarkdown(description?.dom)

	if (cloned.description_annotation) {
		cloned.description_annotation = {
			...cloned.description_annotation,
			annotations: normalizeAnnotations(
				cloned.description_annotation.annotations
			),
		}
	}

	return cloned as unknown as GeniusSongInfo
}
