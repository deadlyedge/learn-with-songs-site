import { convertDomToMarkdown } from './dom-to-markdown'
import type { Referent } from '@/types/referentsAPI'

export type NormalizedReferentAnnotation = {
	id: number
	body: string | null
	url: string
	votesTotal: number
	authors: Array<{
		id: number
		name?: string
		login?: string
	}>
	verified: boolean
	source?: string | null
}

export type NormalizedReferent = {
	id: number
	fragment: string
	classification: string
	rangeContent?: string
	path: string
	url: string
	annotations: NormalizedReferentAnnotation[]
}

const normalizeAnnotationAuthors = (
	authors: Referent['annotations'][number]['authors']
) => {
	if (!authors || authors.length === 0) {
		return []
	}

	return authors.map((author) => ({
		id: author.user.id,
		name: author.user.name ?? author.user.login,
		login: author.user.login,
	}))
}

const convertReferentsDomToGenius = (
	dom?: import('@/types/referentsAPI').DomNode | null
): import('@/types/songsAPI').GeniusDomNode | null => {
	if (!dom) return null

	const mappedAttributes = dom.attributes
		? Object.fromEntries(
				Object.entries(dom.attributes).map(([k, v]) => [
					k,
					v === undefined || v === null ? '' : String(v),
				])
		  )
		: undefined

	const mappedData = dom.data
		? Object.fromEntries(
				Object.entries(dom.data).map(([k, v]) => [
					k,
					v === undefined || v === null ? '' : String(v),
				])
		  )
		: undefined

	const mappedChildren = dom.children?.map((child) =>
		typeof child === 'string' ? child : convertReferentsDomToGenius(child)
	)

	return {
		tag: dom.tag,
		attributes: mappedAttributes as Record<string, string> | undefined,
		data: mappedData as Record<string, string> | undefined,
		children: mappedChildren as Array<string | import('@/types/songsAPI').GeniusDomNode> | undefined,
	}
}

const normalizeAnnotationBody = (annotation: Referent['annotations'][number]) => {
	try {
		const geniusDom = convertReferentsDomToGenius(annotation.body?.dom)
		return convertDomToMarkdown(geniusDom) ?? null
	} catch {
		return null
	}
}

export const normalizeReferents = (
	referents: Referent[] | undefined
): NormalizedReferent[] => {
	if (!referents || referents.length === 0) {
		return []
	}

	return referents.map((referent) => ({
		id: referent.id,
		fragment: referent.fragment,
		classification: referent.classification,
		rangeContent: referent.range?.content,
		path: referent.path,
		url: referent.url,
		annotations: referent.annotations.map((annotation) => ({
			id: annotation.id,
			body: normalizeAnnotationBody(annotation),
			url: annotation.url,
			votesTotal: annotation.votes_total,
			authors: normalizeAnnotationAuthors(annotation.authors),
			verified: annotation.verified,
			source: annotation.source,
		})),
	}))
}
